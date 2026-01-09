from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.api.firebase_auth import require_firebase_user
from app.core.config import settings
from app.core.firebase_admin import (
    find_user_by_stripe_customer,
    get_user_profile,
    update_user_subscription,
)
from app.core.stripe_client import get_stripe_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CheckoutSessionRequest(BaseModel):
    successUrl: str | None = Field(
        default=None, description="Override the default success URL"
    )
    cancelUrl: str | None = Field(
        default=None, description="Override the default cancel URL"
    )
    priceId: str | None = Field(
        default=None, description="Stripe price ID (overrides default and planType)"
    )
    planType: str | None = Field(
        default=None, description="Plan type: 'trial', 'trial-onetime', or 'premium' (uses corresponding price ID)"
    )
    period: str | None = Field(
        default=None, description="Billing period: 'monthly' or 'annual'"
    )


class CheckoutSessionResponse(BaseModel):
    url: str


class WebhookResponse(BaseModel):
    received: bool


class SubscriptionStatusResponse(BaseModel):
    isPremium: bool = False
    subscriptionStatus: str | None = None
    subscriptionCurrentPeriodEnd: datetime | None = None
    stripeCustomerId: str | None = None
    stripeSubscriptionId: str | None = None


class PortalSessionResponse(BaseModel):
    url: str


PREFERRED_ACTIVE_STATUSES = {"active", "trialing"}


def _build_subscription_payload(
    status: str | None,
    current_period_end: int | None,
    customer_id: str | None,
    subscription_id: str | None,
) -> dict[str, Any]:
    premium = status in PREFERRED_ACTIVE_STATUSES
    current_period_end_dt = (
        datetime.fromtimestamp(current_period_end, tz=timezone.utc)
        if current_period_end
        else None
    )
    payload = {
        "stripeCustomerId": customer_id,
        "stripeSubscriptionId": subscription_id,
        "subscriptionStatus": status,
        "subscriptionCurrentPeriodEnd": current_period_end_dt,
        "isPremium": premium,
    }
    return {key: value for key, value in payload.items() if value is not None}


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    user: dict[str, Any] = Depends(require_firebase_user),
) -> CheckoutSessionResponse:
    stripe = get_stripe_client()
    if not stripe:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )

    # Determine price ID and payment mode
    is_onetime = payload.planType == 'trial-onetime' or (payload.planType == 'premium' and payload.period == 'annual')

    if payload.priceId:
        price_id = payload.priceId
    elif payload.planType == 'trial-onetime':
        price_id = settings.stripe_trial_onetime_price_id
    elif payload.planType == 'trial':
        price_id = settings.stripe_trial_price_id or settings.stripe_price_id
    elif payload.planType == 'premium' and payload.period == 'annual':
        price_id = settings.stripe_annual_price_id or settings.stripe_price_id
    else:
        price_id = settings.stripe_price_id

    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe price ID missing.",
        )

    success_url = payload.successUrl or settings.stripe_success_url
    cancel_url = payload.cancelUrl or settings.stripe_cancel_url

    if not success_url or not cancel_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Success and cancel URLs must be configured.",
        )

    try:
        # Verify price exists and matches expected type
        try:
            price_obj = stripe.Price.retrieve(price_id)
            price_type = price_obj.get("type")
            price_amount = price_obj.get("unit_amount", 0) / 100  # Convert cents to dollars
            price_interval = price_obj.get("recurring", {}).get("interval") if price_type == "recurring" else None
            price_interval_count = price_obj.get("recurring", {}).get("interval_count") if price_type == "recurring" else None

            logger.info(
                "Creating checkout session: planType=%s, period=%s, priceId=%s, priceType=%s, amount=$%.2f, interval=%s, intervalCount=%s, mode=%s",
                payload.planType,
                payload.period,
                price_id,
                price_type,
                price_amount,
                price_interval,
                price_interval_count,
                "payment" if is_onetime else "subscription",
            )

            # Validate price type matches payment mode
            if is_onetime and price_type == "recurring":
                logger.error(
                    "Price type mismatch: trying to use recurring price %s (%s) for one-time payment",
                    price_id,
                    price_amount,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Price ID {price_id} is configured as a subscription but should be a one-time payment. Please configure STRIPE_ANNUAL_PRICE_ID with a one-time payment price.",
                )
            if not is_onetime and price_type != "recurring":
                logger.error(
                    "Price type mismatch: trying to use one-time price %s (%s) for subscription",
                    price_id,
                    price_amount,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Price ID {price_id} is configured as a one-time payment but should be a subscription. Please configure STRIPE_TRIAL_PRICE_ID with a recurring subscription price.",
                )

            # Validate trial plan billing interval (should be 2 weeks)
            if payload.planType == "trial" and not is_onetime:
                if price_interval != "week" or price_interval_count != 2:
                    logger.warning(
                        "Trial plan price interval mismatch: expected 2 weeks, got %s %s(s)",
                        price_interval_count or "unknown",
                        price_interval or "unknown",
                    )
        except stripe.error.InvalidRequestError as exc:  # type: ignore[attr-defined]
            logger.error("Invalid Stripe price ID %s: %s", price_id, exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Stripe price ID: {price_id}. Please check your Stripe configuration.",
            ) from exc

        metadata = {
            "uid": user["uid"],
            "email": user.get("email") or "",
            "planType": payload.planType or "premium",
            "period": payload.period or "monthly",
        }

        session_params = {
            "mode": "payment" if is_onetime else "subscription",
            "line_items": [
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            "allow_promotion_codes": True,
            "client_reference_id": user["uid"],
            "customer_email": user.get("email"),
            "metadata": metadata,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }

        if not is_onetime:
            session_params["subscription_data"] = {"metadata": metadata}

        session = stripe.checkout.Session.create(**session_params)
    except HTTPException:
        raise
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        logger.error("Stripe error creating checkout session: planType=%s, period=%s, priceId=%s, mode=%s, error=%s", 
                    payload.planType, payload.period, price_id, "payment" if is_onetime else "subscription", exc)
        error_msg = str(exc)
        if "No such price" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe price ID {price_id} not found. Please check your Stripe configuration.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create checkout session: {error_msg}",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error creating checkout session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error.",
        ) from exc

    return CheckoutSessionResponse(url=session["url"])


@router.post("/webhook", response_model=WebhookResponse)
async def stripe_webhook(request: Request) -> WebhookResponse:
    stripe = get_stripe_client()
    if not stripe or not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook not configured.",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature header.",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError as exc:
        logger.warning("Stripe webhook received invalid payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload."
        ) from exc
    except stripe.error.SignatureVerificationError as exc:  # type: ignore[attr-defined]
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature."
        ) from exc

    await _process_event(event, stripe)
    return WebhookResponse(received=True)


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    user: dict[str, Any] = Depends(require_firebase_user),
) -> SubscriptionStatusResponse:
    profile = get_user_profile(user["uid"]) or {}
    return SubscriptionStatusResponse(
        isPremium=bool(profile.get("isPremium", False)),
        subscriptionStatus=profile.get("subscriptionStatus"),
        subscriptionCurrentPeriodEnd=profile.get("subscriptionCurrentPeriodEnd"),
        stripeCustomerId=profile.get("stripeCustomerId"),
        stripeSubscriptionId=profile.get("stripeSubscriptionId"),
    )


@router.post("/create-portal-session", response_model=PortalSessionResponse)
async def create_portal_session(
    user: dict[str, Any] = Depends(require_firebase_user),
) -> PortalSessionResponse:
    stripe = get_stripe_client()
    if not stripe:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )

    profile = get_user_profile(user["uid"]) or {}
    customer_id = profile.get("stripeCustomerId")
    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer on file.",
        )

    return_url = (
        settings.stripe_portal_return_url
        or settings.stripe_success_url
        or settings.stripe_cancel_url
    )
    if not return_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe portal return URL not configured.",
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        logger.error("Stripe error creating portal session: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create portal session.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error creating portal session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error.",
        ) from exc

    return PortalSessionResponse(url=session["url"])


async def _process_event(event: dict[str, Any], stripe) -> None:
    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_session_completed(data_object, stripe)
    elif event_type in {
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        await _handle_subscription_event(data_object)
    else:
        logger.debug("Unhandled Stripe event type: %s", event_type)


async def _handle_checkout_session_completed(session: dict[str, Any], stripe) -> None:
    metadata = session.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    mode = session.get("mode")
    plan_type = metadata.get("planType", "premium")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    if not uid:
        logger.warning(
            "Checkout session completed without resolvable uid. Session id: %s",
            session.get("id"),
        )
        return

    # Handle one-time payments (trial-onetime or premium annual)
    if mode == "payment":
        purchase_timestamp = datetime.now(timezone.utc)
        if plan_type == "trial-onetime":
            # Set premium access for 30 days (1 month)
            current_period_end = (purchase_timestamp + timedelta(days=30)).timestamp()
        elif plan_type == "premium" and metadata.get("period") == "annual":
            # Set premium access for 365 days (1 year)
            current_period_end = (purchase_timestamp + timedelta(days=365)).timestamp()
        else:
            # Default to 30 days if plan type not recognized
            current_period_end = (purchase_timestamp + timedelta(days=30)).timestamp()
        
        status = "active"
        payload = {
            "stripeCustomerId": customer_id,
            "subscriptionStatus": status,
            "subscriptionCurrentPeriodEnd": datetime.fromtimestamp(current_period_end, tz=timezone.utc),
            "isPremium": True,
            "premiumPurchasedAt": purchase_timestamp,
        }
        update_user_subscription(uid, payload)
        return

    # Handle subscription-based payments
    status = None
    current_period_end = None
    purchase_timestamp = None

    if subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            status = subscription.get("status")
            current_period_end = subscription.get("current_period_end")
            created_timestamp = subscription.get("created")
            if created_timestamp:
                purchase_timestamp = datetime.fromtimestamp(created_timestamp, tz=timezone.utc)
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            logger.error("Failed to retrieve subscription %s: %s", subscription_id, exc)

    if not purchase_timestamp:
        purchase_timestamp = datetime.now(timezone.utc)

    payload = _build_subscription_payload(
        status, current_period_end, customer_id, subscription_id
    )
    payload["premiumPurchasedAt"] = purchase_timestamp

    if not payload:
        payload = {"stripeCustomerId": customer_id, "isPremium": False, "premiumPurchasedAt": purchase_timestamp}

    update_user_subscription(uid, payload)


async def _handle_subscription_event(subscription: dict[str, Any]) -> None:
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    user_doc = find_user_by_stripe_customer(customer_id)
    if not user_doc:
        logger.warning(
            "Received subscription event for unknown customer: %s", customer_id
        )
        return

    uid = user_doc.get("uid")
    if not uid:
        return

    status = subscription.get("status")
    current_period_end = subscription.get("current_period_end")
    subscription_id = subscription.get("id")
    payload = _build_subscription_payload(
        status, current_period_end, customer_id, subscription_id
    )
    update_user_subscription(uid, payload)

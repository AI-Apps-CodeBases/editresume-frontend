from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

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
    successUrl: Optional[str] = Field(
        default=None, description="Override the default success URL"
    )
    cancelUrl: Optional[str] = Field(
        default=None, description="Override the default cancel URL"
    )


class CheckoutSessionResponse(BaseModel):
    url: str


class WebhookResponse(BaseModel):
    received: bool


class SubscriptionStatusResponse(BaseModel):
    isPremium: bool = False
    subscriptionStatus: Optional[str] = None
    subscriptionCurrentPeriodEnd: Optional[datetime] = None
    stripeCustomerId: Optional[str] = None
    stripeSubscriptionId: Optional[str] = None


class PortalSessionResponse(BaseModel):
    url: str


PREFERRED_ACTIVE_STATUSES = {"active", "trialing"}


def _build_subscription_payload(
    status: Optional[str],
    current_period_end: Optional[int],
    customer_id: Optional[str],
    subscription_id: Optional[str],
) -> Dict[str, Any]:
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
    user: Dict[str, Any] = Depends(require_firebase_user),
) -> CheckoutSessionResponse:
    stripe = get_stripe_client()
    if not stripe:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )
    if not settings.stripe_price_id:
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
        metadata = {
            "uid": user["uid"],
            "email": user.get("email") or "",
        }
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[
                {
                    "price": settings.stripe_price_id,
                    "quantity": 1,
                }
            ],
            allow_promotion_codes=True,
            client_reference_id=user["uid"],
            customer_email=user.get("email"),
            metadata=metadata,
            subscription_data={
                "metadata": metadata,
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        logger.error("Stripe error creating checkout session: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create checkout session.",
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
    user: Dict[str, Any] = Depends(require_firebase_user),
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
    user: Dict[str, Any] = Depends(require_firebase_user),
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


async def _process_event(event: Dict[str, Any], stripe) -> None:
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


async def _handle_checkout_session_completed(session: Dict[str, Any], stripe) -> None:
    metadata = session.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    if not uid:
        logger.warning(
            "Checkout session completed without resolvable uid. Session id: %s",
            session.get("id"),
        )
        return

    status = None
    current_period_end = None
    if subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            status = subscription.get("status")
            current_period_end = subscription.get("current_period_end")
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            logger.error("Failed to retrieve subscription %s: %s", subscription_id, exc)

    payload = _build_subscription_payload(
        status, current_period_end, customer_id, subscription_id
    )

    if not payload:
        payload = {"stripeCustomerId": customer_id, "isPremium": False}

    update_user_subscription(uid, payload)


async def _handle_subscription_event(subscription: Dict[str, Any]) -> None:
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

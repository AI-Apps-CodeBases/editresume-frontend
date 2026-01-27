from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.firebase_auth import require_firebase_user
from app.core.config import settings
from app.core.db import get_db, session_scope
from app.core.firebase_admin import (
    find_user_by_stripe_customer,
    get_user_profile,
    update_user_subscription,
)
from app.core.stripe_client import get_stripe_client
from app.models import BillingEvent, User

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
        default=None, description="Billing period: 'monthly' or 'annual' (annual means quarterly 3-month plan)"
    )


class CheckoutSessionResponse(BaseModel):
    url: str


class BillingEventRequest(BaseModel):
    eventType: str = Field(..., description="Billing funnel event type")
    path: str | None = Field(default=None, description="Client path (optional)")
    referrer: str | None = Field(default=None, description="Client referrer (optional)")
    planType: str | None = Field(default=None, description="Plan type (optional)")
    period: str | None = Field(default=None, description="Billing period (optional)")
    checkoutSessionId: str | None = Field(default=None, description="Stripe checkout session id (optional)")
    customerId: str | None = Field(default=None, description="Stripe customer id (optional)")
    subscriptionId: str | None = Field(default=None, description="Stripe subscription id (optional)")
    paymentIntentId: str | None = Field(default=None, description="Stripe payment intent id (optional)")
    failureCode: str | None = Field(default=None, description="Stripe failure code (optional)")
    failureMessage: str | None = Field(default=None, description="Stripe failure message (optional)")
    raw: dict[str, Any] | None = Field(default=None, description="Arbitrary debug payload (optional)")


class BillingEventResponse(BaseModel):
    recorded: bool = True


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

def _safe_record_billing_event(
    *,
    uid: str | None,
    event_type: str,
    plan_type: str | None = None,
    period: str | None = None,
    stripe_checkout_session_id: str | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    stripe_payment_intent_id: str | None = None,
    failure_code: str | None = None,
    failure_message: str | None = None,
    referrer: str | None = None,
    raw: dict[str, Any] | None = None,
) -> None:
    try:
        with session_scope() as db:
            db.add(
                BillingEvent(
                    uid=uid,
                    session_id=None,
                    event_type=event_type,
                    plan_type=plan_type,
                    period=period,
                    stripe_checkout_session_id=stripe_checkout_session_id,
                    stripe_customer_id=stripe_customer_id,
                    stripe_subscription_id=stripe_subscription_id,
                    stripe_payment_intent_id=stripe_payment_intent_id,
                    failure_code=failure_code,
                    failure_message=failure_message,
                    referrer=referrer,
                    raw_data=json.dumps(raw or {}, default=str),
                )
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Failed recording billing event %s (uid=%s): %s",
            event_type,
            uid,
            exc,
            exc_info=True,
        )


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
    request: Request,
    user: dict[str, Any] = Depends(require_firebase_user),
    db: Session = Depends(get_db),
) -> CheckoutSessionResponse:
    stripe = get_stripe_client()
    if not stripe:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )

    # Determine price ID and payment mode
    is_onetime = payload.planType == 'trial-onetime'  # Only trial-onetime is one-time, premium annual is subscription

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

    session_id = getattr(request.state, "session_id", None)

    try:
        # Verify price exists and matches expected type
        try:
            price_obj = stripe.Price.retrieve(price_id)
            price_type = price_obj.get("type")
            price_amount = price_obj.get("unit_amount", 0) / 100  # Convert cents to dollars
            price_interval = price_obj.get("recurring", {}).get("interval") if price_type == "recurring" else None
            price_interval_count = price_obj.get("recurring", {}).get("interval_count") if price_type == "recurring" else None

            logger.info(
                "Creating checkout session: uid=%s, session_id=%s, planType=%s, period=%s, priceId=%s, priceType=%s, amount=$%.2f, interval=%s, intervalCount=%s, mode=%s",
                user.get("uid"),
                session_id,
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
                    "Price type mismatch: trying to use recurring price %s ($%.2f) for one-time payment",
                    price_id,
                    price_amount,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Price ID {price_id} is configured as a subscription but should be a one-time payment. Please configure STRIPE_TRIAL_ONETIME_PRICE_ID with a one-time payment price.",
                )
            if not is_onetime and price_type != "recurring":
                logger.error(
                    "Price type mismatch: trying to use one-time price %s ($%.2f) for subscription",
                    price_id,
                    price_amount,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Price ID {price_id} is configured as a one-time payment but should be a recurring subscription. Please check your Stripe price configuration.",
                )

            # Validate trial plan billing interval (should be 2 weeks)
            if payload.planType == "trial" and not is_onetime:
                if price_interval != "week" or price_interval_count != 2:
                    logger.warning(
                        "Trial plan price interval mismatch: expected 2 weeks, got %s %s(s)",
                        price_interval_count or "unknown",
                        price_interval or "unknown",
                    )
            
            # Validate premium quarterly (annual) billing interval (should be 3 months)
            if payload.planType == "premium" and payload.period == "annual" and not is_onetime:
                if price_interval != "month" or price_interval_count != 3:
                    logger.warning(
                        "Premium quarterly price interval mismatch: expected 3 months, got %s %s(s)",
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

    # Persist "intent" even if the user never completes checkout.
    try:
        session_id = getattr(request.state, "session_id", None)
        db_user_id = None
        if user.get("email"):
            db_user = db.query(User).filter(User.email == user["email"]).first()
            db_user_id = db_user.id if db_user else None
        raw = {
            "path": request.url.path,
            "referrer": request.headers.get("referer"),
            "planType": payload.planType,
            "period": payload.period,
            "priceId": price_id,
            "mode": session.get("mode"),
        }
        db.add(
            BillingEvent(
                uid=user.get("uid"),
                user_id=db_user_id,
                session_id=session_id,
                event_type="checkout_session_created",
                plan_type=payload.planType,
                period=payload.period,
                stripe_checkout_session_id=session.get("id"),
                stripe_customer_id=session.get("customer"),
                stripe_subscription_id=session.get("subscription"),
                stripe_payment_intent_id=session.get("payment_intent"),
                referrer=request.headers.get("referer"),
                raw_data=json.dumps(raw, default=str),
            )
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed recording billing intent event: %s", exc, exc_info=True)
        db.rollback()

    return CheckoutSessionResponse(url=session["url"])


@router.post("/event", response_model=BillingEventResponse)
async def record_billing_event(
    payload: BillingEventRequest,
    request: Request,
    user: dict[str, Any] = Depends(require_firebase_user),
    db: Session = Depends(get_db),
) -> BillingEventResponse:
    """Persist lightweight billing funnel events for later debugging."""
    session_id = getattr(request.state, "session_id", None)
    referrer = payload.referrer or request.headers.get("referer")
    raw = {
        "client_path": payload.path,
        "server_path": request.url.path,
        "referrer": referrer,
        "planType": payload.planType,
        "period": payload.period,
        "checkoutSessionId": payload.checkoutSessionId,
        "customerId": payload.customerId,
        "subscriptionId": payload.subscriptionId,
        "paymentIntentId": payload.paymentIntentId,
        "failureCode": payload.failureCode,
        "failureMessage": payload.failureMessage,
        "raw": payload.raw,
    }

    try:
        db_user_id = None
        if user.get("email"):
            db_user = db.query(User).filter(User.email == user["email"]).first()
            db_user_id = db_user.id if db_user else None

        db.add(
            BillingEvent(
                uid=user.get("uid"),
                user_id=db_user_id,
                session_id=session_id,
                event_type=payload.eventType,
                plan_type=payload.planType,
                period=payload.period,
                stripe_checkout_session_id=payload.checkoutSessionId,
                stripe_customer_id=payload.customerId,
                stripe_subscription_id=payload.subscriptionId,
                stripe_payment_intent_id=payload.paymentIntentId,
                failure_code=payload.failureCode,
                failure_message=payload.failureMessage,
                referrer=referrer,
                raw_data=json.dumps(raw, default=str),
            )
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed recording billing event %s: %s", payload.eventType, exc, exc_info=True)
        db.rollback()

    return BillingEventResponse(recorded=True)


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
    elif event_type == "checkout.session.expired":
        await _handle_checkout_session_expired(data_object)
    elif event_type == "payment_intent.payment_failed":
        await _handle_payment_intent_failed(data_object)
    elif event_type == "invoice.payment_failed":
        await _handle_invoice_payment_failed(data_object, stripe)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(data_object)
    elif event_type in {
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        await _handle_subscription_event(data_object, source_event_type=event_type)
    else:
        logger.debug("Unhandled Stripe event type: %s", event_type)


async def _handle_checkout_session_completed(session: dict[str, Any], stripe) -> None:
    metadata = session.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    payment_intent_id = session.get("payment_intent")
    mode = session.get("mode")
    plan_type = metadata.get("planType", "premium")
    period = metadata.get("period")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    if not uid:
        logger.warning(
            "Checkout session completed without resolvable uid. Session id: %s",
            session.get("id"),
        )
        return

    _safe_record_billing_event(
        uid=uid,
        event_type="checkout_session_completed",
        plan_type=plan_type,
        period=period,
        stripe_checkout_session_id=session.get("id"),
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        stripe_payment_intent_id=payment_intent_id,
        raw={
            "mode": mode,
            "status": session.get("status"),
            "payment_status": session.get("payment_status"),
        },
    )

    # Handle one-time payments (only trial-onetime)
    if mode == "payment":
        purchase_timestamp = datetime.now(timezone.utc)
        if plan_type == "trial-onetime":
            # Set premium access for 30 days (1 month)
            current_period_end = (purchase_timestamp + timedelta(days=30)).timestamp()
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

    # Handle subscription-based payments (trial subscription, premium monthly, premium annual)
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


async def _handle_checkout_session_expired(session: dict[str, Any]) -> None:
    metadata = session.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = session.get("customer")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    _safe_record_billing_event(
        uid=uid,
        event_type="checkout_session_expired",
        plan_type=metadata.get("planType"),
        period=metadata.get("period"),
        stripe_checkout_session_id=session.get("id"),
        stripe_customer_id=customer_id,
        stripe_subscription_id=session.get("subscription"),
        stripe_payment_intent_id=session.get("payment_intent"),
        raw={
            "status": session.get("status"),
            "payment_status": session.get("payment_status"),
            "expires_at": session.get("expires_at"),
        },
    )


async def _handle_payment_intent_failed(payment_intent: dict[str, Any]) -> None:
    metadata = payment_intent.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = payment_intent.get("customer")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    last_error = payment_intent.get("last_payment_error") or {}
    _safe_record_billing_event(
        uid=uid,
        event_type="payment_intent_payment_failed",
        stripe_customer_id=customer_id,
        stripe_payment_intent_id=payment_intent.get("id"),
        failure_code=last_error.get("code"),
        failure_message=last_error.get("message") or last_error.get("decline_code"),
        raw={
            "status": payment_intent.get("status"),
            "amount": payment_intent.get("amount"),
            "currency": payment_intent.get("currency"),
            "invoice": payment_intent.get("invoice"),
        },
    )


async def _handle_invoice_payment_failed(invoice: dict[str, Any], stripe) -> None:
    metadata = invoice.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    payment_intent_id = invoice.get("payment_intent")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    failure_code = None
    failure_message = None
    if payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(payment_intent_id)
            last_error = pi.get("last_payment_error") or {}
            failure_code = last_error.get("code")
            failure_message = last_error.get("message") or last_error.get("decline_code")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed retrieving payment_intent %s for invoice.payment_failed: %s",
                payment_intent_id,
                exc,
            )

    _safe_record_billing_event(
        uid=uid,
        event_type="invoice_payment_failed",
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        stripe_payment_intent_id=payment_intent_id,
        failure_code=failure_code,
        failure_message=failure_message,
        raw={
            "status": invoice.get("status"),
            "attempt_count": invoice.get("attempt_count"),
            "amount_due": invoice.get("amount_due"),
            "currency": invoice.get("currency"),
            "invoice_id": invoice.get("id"),
        },
    )


async def _handle_invoice_paid(invoice: dict[str, Any]) -> None:
    metadata = invoice.get("metadata") or {}
    uid = metadata.get("uid")
    customer_id = invoice.get("customer")

    if not uid and customer_id:
        user_doc = find_user_by_stripe_customer(customer_id)
        uid = user_doc.get("uid") if user_doc else None

    _safe_record_billing_event(
        uid=uid,
        event_type="invoice_paid",
        stripe_customer_id=customer_id,
        stripe_subscription_id=invoice.get("subscription"),
        stripe_payment_intent_id=invoice.get("payment_intent"),
        raw={
            "status": invoice.get("status"),
            "invoice_id": invoice.get("id"),
            "amount_paid": invoice.get("amount_paid"),
            "currency": invoice.get("currency"),
        },
    )


async def _handle_subscription_event(
    subscription: dict[str, Any],
    *,
    source_event_type: str | None = None,
) -> None:
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
    _safe_record_billing_event(
        uid=uid,
        event_type=source_event_type or "subscription_event",
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        raw={
            "status": status,
            "current_period_end": current_period_end,
        },
    )
    payload = _build_subscription_payload(
        status, current_period_end, customer_id, subscription_id
    )
    update_user_subscription(uid, payload)

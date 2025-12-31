from __future__ import annotations

import base64
import json
import logging
import secrets
import threading
import time
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore
from firebase_admin import exceptions as firebase_exceptions
from google.auth import exceptions as google_auth_exceptions

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

# Track initialization state to avoid repeated timeouts
_firebase_init_lock = threading.Lock()
_firebase_init_attempted = False
_firebase_init_failed = False


def _load_service_account_info() -> Optional[Dict[str, Any]]:
    if settings.firebase_service_account_json:
        try:
            return json.loads(settings.firebase_service_account_json)
        except json.JSONDecodeError as exc:
            logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON: %s", exc)
            return None

    if settings.firebase_service_account_base64:
        try:
            decoded = base64.b64decode(settings.firebase_service_account_base64)
            return json.loads(decoded.decode("utf-8"))
        except (ValueError, json.JSONDecodeError) as exc:
            logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: %s", exc)
            return None

    return None


def _initialize_firebase_with_timeout(cred, options, timeout: int = 10) -> Optional[firebase_admin.App]:
    """Initialize Firebase with timeout to prevent hanging on network issues.
    Reduced to 10s to fail fast and avoid blocking API requests."""
    result = [None]
    exception = [None]

    def init_worker():
        try:
            result[0] = firebase_admin.initialize_app(cred, options)
        except Exception as e:  # noqa: BLE001
            exception[0] = e

    thread = threading.Thread(target=init_worker, daemon=True)
    thread.start()
    thread.join(timeout=timeout)

    if thread.is_alive():
        logger.warning(
            "Firebase initialization timed out after %d seconds. "
            "This may indicate network connectivity issues to oauth2.googleapis.com. "
            "Firebase features will be unavailable. API will continue to work without Firebase.",
            timeout
        )
        return None

    if exception[0]:
        logger.warning(f"Firebase initialization failed: {exception[0]}. API will continue to work without Firebase.")
        return None

    return result[0]


@lru_cache
def get_firebase_app() -> Optional[firebase_admin.App]:
    global _firebase_init_attempted, _firebase_init_failed

    if firebase_admin._apps:
        return firebase_admin.get_app()

    # Check if we've already failed initialization to avoid repeated timeouts
    with _firebase_init_lock:
        if _firebase_init_failed:
            return None
        if _firebase_init_attempted:
            # Wait a bit and check again if another thread is initializing
            time.sleep(0.1)
            if firebase_admin._apps:
                return firebase_admin.get_app()
            if _firebase_init_failed:
                return None

    service_account_info = _load_service_account_info()
    cred = None

    if not service_account_info and settings.firebase_service_account_key_path:
        try:
            cred = credentials.Certificate(settings.firebase_service_account_key_path)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to load Firebase credential from path: %s", exc)
            return None
    elif service_account_info:
        try:
            cred = credentials.Certificate(service_account_info)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to load Firebase credential from JSON: %s", exc)
            return None
    else:
        logger.warning(
            "Firebase Admin SDK not configured. Set service account env vars."
        )
        return None

    if not cred:
        return None

    with _firebase_init_lock:
        _firebase_init_attempted = True

    try:
        options = {}
        if settings.firebase_project_id:
            options["projectId"] = settings.firebase_project_id

        # Use timeout wrapper to prevent hanging (reduced to 10s to fail fast)
        app = _initialize_firebase_with_timeout(cred, options, timeout=10)
        if app:
            logger.info("Firebase Admin SDK initialized successfully")
            return app
        else:
            with _firebase_init_lock:
                _firebase_init_failed = True
            return None

    except (google_auth_exceptions.TransportError, google_auth_exceptions.RefreshError) as exc:
        logger.error(
            "Firebase authentication failed due to network error: %s. "
            "Check network connectivity to oauth2.googleapis.com. "
            "Firebase features will be unavailable.",
            exc
        )
        with _firebase_init_lock:
            _firebase_init_failed = True
        return None
    except firebase_exceptions.FirebaseError as exc:
        logger.error("Firebase error during initialization: %s", exc)
        with _firebase_init_lock:
            _firebase_init_failed = True
        return None
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialise Firebase Admin SDK: %s", exc, exc_info=True)
        with _firebase_init_lock:
            _firebase_init_failed = True
        return None


@lru_cache
def get_firestore_client() -> Optional[firestore.Client]:
    app = get_firebase_app()
    if not app:
        return None
    try:
        return firestore.client(app=app)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialise Firestore client: %s", exc)
        return None


def verify_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    app = get_firebase_app()
    if not app:
        logger.warning("verify_id_token called without configured Firebase app.")
        return None
    try:
        return firebase_auth.verify_id_token(id_token, app=app)
    except firebase_exceptions.FirebaseError as exc:
        logger.warning("Firebase ID token verification error: %s", exc)
        return None
    except ValueError as exc:
        logger.warning("Firebase ID token value error: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to verify Firebase ID token: %s", exc)
        return None


def sync_user_profile(uid: str, profile: Dict[str, Any]) -> None:
    _sync_relational_user_profile(profile)

    client = get_firestore_client()
    if not client:
        return

    doc_ref = client.collection("users").document(uid)
    data = {
        "uid": uid,
        "email": profile.get("email"),
        "name": profile.get("name"),
        "photoURL": profile.get("picture"),
        "emailVerified": profile.get("emailVerified"),
        "isPremium": profile.get("isPremium", False),
        "lastLoginAt": firestore.SERVER_TIMESTAMP,
    }
    try:
        snapshot = doc_ref.get()
        payload = {**data}
        if not snapshot.exists:
            payload["createdAt"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(payload, merge=True)
    except firebase_exceptions.FirebaseError as exc:
        logger.error("Failed to sync Firestore profile for %s: %s", uid, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error syncing Firestore profile for %s: %s", uid, exc)


def _update_user_premium_purchase(email: str, is_premium: bool, premium_purchased_at: Optional[datetime]) -> None:
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == email).first()
        if user:
            updated = False
            if user.is_premium != is_premium:
                user.is_premium = is_premium
                updated = True
            if is_premium and premium_purchased_at and not user.premium_purchased_at:
                user.premium_purchased_at = premium_purchased_at
                updated = True
            if updated:
                session.commit()
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        logger.warning("Failed to update premium purchase for %s: %s", email, exc)
    finally:
        session.close()


def _sync_relational_user_profile(profile: Dict[str, Any]) -> None:
    email = (profile.get("email") or "").strip()
    if not email:
        return

    name = profile.get("name") or (email.split("@")[0] if "@" in email else "User")
    is_premium = bool(profile.get("isPremium", False))

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == email).first()
        if user:
            updated = False
            if name and user.name != name:
                user.name = name
                updated = True
            if user.is_premium != is_premium:
                user.is_premium = is_premium
                updated = True
            if updated:
                session.commit()
            return

        temp_password = secrets.token_urlsafe(32)
        new_user = User(
            email=email,
            name=name or email,
            password=temp_password,
            is_premium=is_premium,
        )
        session.add(new_user)
        session.commit()
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        logger.warning("Failed to sync relational user profile for %s: %s", email, exc)
    finally:
        session.close()


def update_user_subscription(uid: str, subscription_data: Dict[str, Any]) -> None:
    client = get_firestore_client()
    if not client:
        return

    doc_ref = client.collection("users").document(uid)
    payload = {
        **subscription_data,
        "subscriptionUpdatedAt": firestore.SERVER_TIMESTAMP,
    }
    try:
        doc_ref.set(payload, merge=True)
        
        premium_purchased_at = subscription_data.get("premiumPurchasedAt")
        is_premium = subscription_data.get("isPremium", False)
        
        if premium_purchased_at or is_premium:
            user_doc = doc_ref.get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                email = user_data.get("email")
                if email:
                    _update_user_premium_purchase(email, is_premium, premium_purchased_at)
    except firebase_exceptions.FirebaseError as exc:
        logger.error("Failed to update subscription for %s: %s", uid, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error updating subscription for %s: %s", uid, exc)


def find_user_by_stripe_customer(customer_id: str) -> Optional[Dict[str, Any]]:
    client = get_firestore_client()
    if not client:
        return None

    try:
        query = (
            client.collection("users")
            .where("stripeCustomerId", "==", customer_id)
            .limit(1)
        )
        docs = list(query.stream())
        if not docs:
            return None
        doc = docs[0]
        data = doc.to_dict()
        data["uid"] = doc.id
        return data
    except firebase_exceptions.FirebaseError as exc:
        logger.error("Failed to query user by Stripe customer: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error querying user by Stripe customer: %s", exc)
        return None


def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    client = get_firestore_client()
    if not client:
        return None

    try:
        doc_ref = client.collection("users").document(uid)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None
        data = snapshot.to_dict()
        data["uid"] = uid
        return data
    except firebase_exceptions.FirebaseError as exc:
        logger.error("Failed to fetch user profile %s: %s", uid, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error fetching user profile %s: %s", uid, exc)
        return None


def sanitized_user_from_token(token: Dict[str, Any]) -> Dict[str, Any]:
    email = token.get("email")
    name = token.get("name") or (email.split("@")[0] if email else None) or "User"
    firebase_claims = token.get("firebase", {})

    return {
        "uid": token.get("uid"),
        "email": email,
        "name": name,
        "picture": token.get("picture"),
        "emailVerified": token.get("email_verified", False),
        "isAnonymous": firebase_claims.get("sign_in_provider") == "anonymous",
        "isPremium": bool(token.get("premium")),
        "signInProvider": firebase_claims.get("sign_in_provider"),
        "claims": {
            key: value
            for key, value in token.items()
            if key
            not in {
                "iss",
                "aud",
                "auth_time",
                "user_id",
                "sub",
                "iat",
                "exp",
                "firebase",
                "email",
                "email_verified",
                "uid",
                "name",
                "picture",
                "premium",
            }
        },
    }

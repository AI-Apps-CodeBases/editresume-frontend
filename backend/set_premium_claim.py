#!/usr/bin/env python3
"""
Standalone script to set premium custom claim on a Firebase Auth user.
Usage: python3 set_premium_claim.py <USER_UID>
       python3 set_premium_claim.py --find <email>
       python3 set_premium_claim.py <USER_UID> --remove
"""

import base64
import json
import os
import sys
from typing import Dict, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials
    from firebase_admin import exceptions as firebase_exceptions
except ImportError:
    print("❌ Error: firebase-admin not installed")
    print("Install it with: pip install firebase-admin")
    sys.exit(1)


def _load_service_account_from_env() -> Optional[Dict]:
    """Load service account from environment variables."""
    # Try FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string)
    json_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if json_str:
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"❌ Error: Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            return None

    # Try FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded JSON)
    base64_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64")
    if base64_str:
        try:
            decoded = base64.b64decode(base64_str)
            return json.loads(decoded.decode("utf-8"))
        except (ValueError, json.JSONDecodeError) as e:
            print(f"❌ Error: Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: {e}")
            return None

    # Try FIREBASE_SERVICE_ACCOUNT_KEY_PATH (path to JSON file)
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
    if key_path and os.path.exists(key_path):
        try:
            with open(key_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"❌ Error: Failed to load key file {key_path}: {e}")
            return None

    return None


def _initialize_firebase() -> bool:
    """Initialize Firebase Admin SDK if not already initialized."""
    if firebase_admin._apps:
        return True

    service_account_info = _load_service_account_from_env()
    if not service_account_info:
        print("❌ Error: Firebase service account not found")
        print("\nSet one of these environment variables:")
        print("  - FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)")
        print("  - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded JSON)")
        print("  - FIREBASE_SERVICE_ACCOUNT_KEY_PATH (path to JSON file)")
        return False

    try:
        cred = credentials.Certificate(service_account_info)
        project_id = os.getenv("FIREBASE_PROJECT_ID") or service_account_info.get("project_id")
        options = {"projectId": project_id} if project_id else {}
        firebase_admin.initialize_app(cred, options)
        return True
    except Exception as e:
        print(f"❌ Error: Failed to initialize Firebase: {e}")
        return False


def set_premium_claim(uid: str, is_premium: bool = True) -> bool:
    """Set premium custom claim on Firebase Auth user."""
    if not _initialize_firebase():
        return False

    try:
        firebase_auth.set_custom_user_claims(uid, {"premium": is_premium})
        print(f"✅ Successfully set premium claim to {is_premium} for user {uid}")

        # Verify it was set
        user = firebase_auth.get_user(uid)
        print(f"   User email: {user.email}")
        print(f"   Custom claims: {user.custom_claims}")
        return True
    except firebase_exceptions.NotFoundError:
        print(f"❌ Error: User {uid} not found")
        return False
    except firebase_exceptions.FirebaseError as exc:
        print(f"❌ Error: Failed to set custom claim: {exc}")
        return False
    except Exception as exc:
        print(f"❌ Unexpected error: {exc}")
        return False


def list_users_by_email(email: str) -> None:
    """List users or find user by email to get UID."""
    if not _initialize_firebase():
        return

    try:
        user = firebase_auth.get_user_by_email(email)
        print(f"\n📧 Found user:")
        print(f"   UID: {user.uid}")
        print(f"   Email: {user.email}")
        print(f"   Display Name: {user.display_name or 'N/A'}")
        print(f"   Custom claims: {user.custom_claims}")
    except firebase_exceptions.NotFoundError:
        print(f"❌ Error: User with email {email} not found")
    except firebase_exceptions.FirebaseError as exc:
        print(f"❌ Error: {exc}")
    except Exception as exc:
        print(f"❌ Unexpected error: {exc}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Set premium: python3 set_premium_claim.py <USER_UID>")
        print("  Remove premium: python3 set_premium_claim.py <USER_UID> --remove")
        print("  Find user by email: python3 set_premium_claim.py --find <email>")
        print("\nTo find your UID:")
        print("  1. Firebase Console → Authentication → Users")
        print("  2. Or use: python3 set_premium_claim.py --find your@email.com")
        print("\nEnvironment variables needed:")
        print("  FIREBASE_SERVICE_ACCOUNT_JSON or")
        print("  FIREBASE_SERVICE_ACCOUNT_BASE64 or")
        print("  FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
        sys.exit(1)

    if sys.argv[1] == "--find":
        if len(sys.argv) != 3:
            print("Usage: python3 set_premium_claim.py --find <email>")
            sys.exit(1)
        list_users_by_email(sys.argv[2])
    else:
        uid = sys.argv[1]
        is_premium = "--remove" not in sys.argv
        success = set_premium_claim(uid, is_premium)
        sys.exit(0 if success else 1)

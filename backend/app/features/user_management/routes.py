"""User Management Feature - handles user profile, payment history, and account management.

This module contains all user-related endpoints extracted from app/api/user.py
for better feature isolation and organization.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])

# In-memory storage (legacy - should be migrated to database)
users_db = {}
user_stats = {}
payment_history = {}


@router.get("/profile")
async def get_profile(email: str):
    """Get user profile"""
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = user_stats.get(
        email, {"resumesCreated": 0, "exportsThisMonth": 0, "totalExports": 0}
    )

    return {
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"],
            "createdAt": user.get("created_at"),
        },
        "stats": stats,
    }


@router.get("/payment-history")
async def get_payment_history(email: str):
    """Get user payment history"""
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    history = payment_history.get(email, [])

    if user["isPremium"] and not history:
        history = [
            {
                "id": "1",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "amount": "$9.99",
                "status": "Paid",
                "plan": "Premium Monthly",
            }
        ]

    return {"payments": history}


@router.post("/upgrade")
async def upgrade_to_premium(payload: dict):
    """Upgrade user to premium"""
    email = payload.get("email")
    user = users_db.get(email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user["isPremium"]:
        raise HTTPException(status_code=400, detail="Already premium")

    user["isPremium"] = True

    if email not in payment_history:
        payment_history[email] = []

    payment_history[email].append(
        {
            "id": str(len(payment_history[email]) + 1),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "amount": "$9.99",
            "status": "Paid",
            "plan": "Premium Monthly",
        }
    )

    logger.info(f"User upgraded to premium: {email}")

    return {
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"],
        },
        "message": "Upgraded to premium successfully",
    }


@router.post("/track-export")
async def track_export(payload: dict):
    """Track resume export"""
    email = payload.get("email")
    if not email:
        return {"status": "ok"}

    if email not in user_stats:
        user_stats[email] = {
            "resumesCreated": 0,
            "exportsThisMonth": 0,
            "totalExports": 0,
        }

    user_stats[email]["exportsThisMonth"] += 1
    user_stats[email]["totalExports"] += 1

    return {"status": "ok", "stats": user_stats[email]}


@router.delete("/account")
async def delete_account(email: str):
    """Delete user account"""
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    del users_db[email]
    if email in user_stats:
        del user_stats[email]
    if email in payment_history:
        del payment_history[email]

    logger.info(f"User account deleted: {email}")

    return {"message": "Account deleted successfully"}


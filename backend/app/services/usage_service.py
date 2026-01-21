"""Usage tracking service for AI features and subscription limits."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models import AIUsage, TrialPeriod, User

logger = logging.getLogger(__name__)

# Feature types for AI usage tracking
FEATURE_TYPES = {
    "improvement": "AI improvement suggestions",
    "ats": "ATS scoring",
    "ats_enhanced": "Enhanced ATS scoring",
    "cover_letter": "Cover letter generation",
    "content_generation": "AI content generation",
    "section_assistant": "AI section assistant",
    "job_matching": "Job matching",
}

# Usage limits per tier (only enforced when NEXT_PUBLIC_PREMIUM_MODE=true)
USAGE_LIMITS = {
    "guest": {
        "exports": {"monthly": 3},
        "ai_improvements": {"session": 3},
        "ats_scores": {"daily": float("inf")},  # ATS scoring is always free
        "cover_letters": {"monthly": 0},
    },
    "free": {
        "exports": {"monthly": 3},
        "ai_improvements": {"session": 5},
        "ats_scores": {"daily": float("inf")},  # ATS scoring is always free
        "cover_letters": {"monthly": 1},
    },
    "trial": {
        # Trial users get premium limits
        "exports": {"monthly": float("inf")},
        "ai_improvements": {"session": float("inf")},
        "ats_scores": {"daily": float("inf")},
        "cover_letters": {"monthly": float("inf")},
    },
    "premium": {
        "exports": {"monthly": float("inf")},
        "ai_improvements": {"session": float("inf")},
        "ats_scores": {"daily": float("inf")},
        "cover_letters": {"monthly": float("inf")},
    },
}


def is_premium_mode_enabled() -> bool:
    """Check if premium mode is enabled via environment variable."""
    return os.getenv("NEXT_PUBLIC_PREMIUM_MODE", "false").lower() == "true"


def get_plan_tier(user: User | None, db: Session) -> str:
    """Determine user's plan tier based on premium status and trial."""
    if not user:
        return "guest"

    if user.is_premium:
        return "premium"

    # Check if user has active trial
    trial = db.query(TrialPeriod).filter(
        and_(
            TrialPeriod.user_id == user.id,
            TrialPeriod.is_active == True,
            TrialPeriod.expires_at > datetime.utcnow()
        )
    ).first()

    if trial:
        return "trial"

    return "free"


def is_trial_active(user_id: int, db: Session) -> bool:
    """Check if user has an active trial period."""
    trial = db.query(TrialPeriod).filter(
        and_(
            TrialPeriod.user_id == user_id,
            TrialPeriod.is_active == True,
            TrialPeriod.expires_at > datetime.utcnow()
        )
    ).first()
    return trial is not None


def check_trial_eligibility(user_id: int, db: Session) -> bool:
    """Check if user is eligible to start a trial."""
    # User must not be premium
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_premium:
        return False

    # User must not have an active trial
    if is_trial_active(user_id, db):
        return False

    # User must not have had a trial before (one trial per user)
    existing_trial = db.query(TrialPeriod).filter(
        TrialPeriod.user_id == user_id
    ).first()

    return existing_trial is None


def start_trial(user_id: int, db: Session) -> TrialPeriod:
    """Start a 3-day free trial for a user."""
    if not check_trial_eligibility(user_id, db):
        raise ValueError("User is not eligible for trial")

    # End any existing inactive trials
    db.query(TrialPeriod).filter(
        and_(
            TrialPeriod.user_id == user_id,
            TrialPeriod.is_active == True
        )
    ).update({"is_active": False})

    trial = TrialPeriod(user_id=user_id)
    db.add(trial)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.trial_started_at = datetime.utcnow()

    db.commit()
    db.refresh(trial)
    return trial


def record_ai_usage(
    user_id: int | None,
    feature_type: str,
    session_id: str | None = None,
    db: Session | None = None
) -> AIUsage:
    """Record an AI API call."""
    if not db:
        raise ValueError("Database session required")

    usage = AIUsage(
        user_id=user_id,
        session_id=session_id,
        feature_type=feature_type,
        created_at=datetime.utcnow()
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


def get_ai_usage_count(
    user_id: int | None,
    feature_type: str,
    period: str = "session",
    session_id: str | None = None,
    db: Session | None = None
) -> int:
    """Get count of AI usage for a specific feature and period."""
    if not db:
        return 0

    query = db.query(func.count(AIUsage.id))

    if user_id:
        query = query.filter(AIUsage.user_id == user_id)
    elif session_id:
        query = query.filter(AIUsage.session_id == session_id)
    else:
        return 0

    query = query.filter(AIUsage.feature_type == feature_type)

    # Apply time period filter
    now = datetime.utcnow()
    if period == "daily":
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(AIUsage.created_at >= start_time)
    elif period == "monthly":
        start_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(AIUsage.created_at >= start_time)
    elif period == "session":
        # For session-based limits, we need to track session start
        # For now, we'll use a 24-hour window as "session"
        start_time = now - timedelta(hours=24)
        query = query.filter(AIUsage.created_at >= start_time)

    return query.scalar() or 0


def check_usage_limit(
    user_id: int | None,
    feature_type: str,
    plan_tier: str,
    session_id: str | None = None,
    db: Session | None = None
) -> tuple[bool, dict[str, Any]]:
    """
    Check if user can use a feature based on their plan tier and current usage.
    
    Returns:
        Tuple of (allowed: bool, info: dict with usage stats and limit info)
    """
    # ATS scoring is always free and unlimited
    if feature_type in ("ats", "ats_enhanced"):
        return True, {"allowed": True, "reason": "ats_always_free"}

    if not is_premium_mode_enabled():
        # Premium mode disabled - allow all features
        return True, {"allowed": True, "reason": "premium_mode_disabled"}

    limits = USAGE_LIMITS.get(plan_tier, USAGE_LIMITS["free"])

    # Map feature types to limit keys
    limit_key_map = {
        "improvement": "ai_improvements",
        "ats": "ats_scores",
        "ats_enhanced": "ats_scores",
        "cover_letter": "cover_letters",
        "content_generation": "ai_improvements",
        "section_assistant": "ai_improvements",
        "job_matching": "ai_improvements",
    }

    limit_key = limit_key_map.get(feature_type, "ai_improvements")
    feature_limits = limits.get(limit_key, {})

    # Check if unlimited
    if "session" in feature_limits and feature_limits["session"] == float("inf"):
        return True, {"allowed": True, "reason": "unlimited"}
    if "daily" in feature_limits and feature_limits["daily"] == float("inf"):
        return True, {"allowed": True, "reason": "unlimited"}
    if "monthly" in feature_limits and feature_limits["monthly"] == float("inf"):
        return True, {"allowed": True, "reason": "unlimited"}

    # Get current usage
    period = "session" if "session" in feature_limits else ("daily" if "daily" in feature_limits else "monthly")
    limit = feature_limits.get(period, 0)

    current_usage = get_ai_usage_count(user_id, feature_type, period, session_id, db)

    allowed = current_usage < limit

    return allowed, {
        "allowed": allowed,
        "current_usage": current_usage,
        "limit": limit,
        "period": period,
        "plan_tier": plan_tier,
        "feature_type": feature_type,
    }


def get_export_count(
    user_id: int | None,
    period: str = "monthly",
    session_id: str | None = None,
    db: Session | None = None
) -> int:
    """Get count of exports for a specific period."""
    if not db:
        return 0

    from datetime import datetime

    from app.models import ExportAnalytics

    query = db.query(func.count(ExportAnalytics.id))

    if user_id:
        query = query.filter(ExportAnalytics.user_id == user_id)
    elif session_id:
        query = query.filter(ExportAnalytics.session_id == session_id)
    else:
        return 0

    # Apply time period filter
    now = datetime.utcnow()
    if period == "monthly":
        start_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(ExportAnalytics.created_at >= start_time)
    elif period == "daily":
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(ExportAnalytics.created_at >= start_time)

    return query.scalar() or 0


def check_export_limit(
    user_id: int | None,
    plan_tier: str,
    session_id: str | None = None,
    db: Session | None = None
) -> tuple[bool, dict[str, Any]]:
    """
    Check if user can export based on their plan tier and current usage.
    
    Returns:
        Tuple of (allowed: bool, info: dict with usage stats and limit info)
    """
    if not is_premium_mode_enabled():
        # Premium mode disabled - allow all exports
        return True, {"allowed": True, "reason": "premium_mode_disabled"}

    limits = USAGE_LIMITS.get(plan_tier, USAGE_LIMITS["free"])
    export_limits = limits.get("exports", {})

    # Check if unlimited
    if "monthly" in export_limits and export_limits["monthly"] == float("inf"):
        return True, {"allowed": True, "reason": "unlimited"}

    limit = export_limits.get("monthly", 0)
    current_usage = get_export_count(user_id, "monthly", session_id, db)

    allowed = current_usage < limit

    return allowed, {
        "allowed": allowed,
        "current_usage": current_usage,
        "limit": limit,
        "period": "monthly",
        "plan_tier": plan_tier,
    }


def get_usage_stats(
    user_id: int | None,
    plan_tier: str,
    session_id: str | None = None,
    db: Session | None = None
) -> dict[str, Any]:
    """Get comprehensive usage statistics for a user."""
    if not db:
        return {}

    limits = USAGE_LIMITS.get(plan_tier, USAGE_LIMITS["free"])
    stats = {
        "plan_tier": plan_tier,
        "is_premium_mode": is_premium_mode_enabled(),
        "features": {},
        "exports": {},
    }

    # Get export stats
    export_limits = limits.get("exports", {})
    export_limit = export_limits.get("monthly", 0)
    export_usage = get_export_count(user_id, "monthly", session_id, db)
    stats["exports"] = {
        "current_usage": export_usage,
        "limit": export_limit if export_limit != float("inf") else None,
        "period": "monthly",
        "unlimited": export_limit == float("inf"),
    }

    # Get stats for each feature type
    for feature_type in FEATURE_TYPES:
        limit_key_map = {
            "improvement": "ai_improvements",
            "ats": "ats_scores",
            "ats_enhanced": "ats_scores",
            "cover_letter": "cover_letters",
            "content_generation": "ai_improvements",
            "section_assistant": "ai_improvements",
            "job_matching": "ai_improvements",
        }

        limit_key = limit_key_map.get(feature_type, "ai_improvements")
        feature_limits = limits.get(limit_key, {})

        period = "session" if "session" in feature_limits else ("daily" if "daily" in feature_limits else "monthly")
        limit = feature_limits.get(period, 0)
        current_usage = get_ai_usage_count(user_id, feature_type, period, session_id, db)

        stats["features"][feature_type] = {
            "current_usage": current_usage,
            "limit": limit if limit != float("inf") else None,
            "period": period,
            "unlimited": limit == float("inf"),
        }

    return stats


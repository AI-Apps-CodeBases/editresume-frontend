"""Usage tracking API endpoints for limits, stats, and trial management."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import User
from app.services.usage_service import (
    check_trial_eligibility,
    get_plan_tier,
    get_usage_stats,
    is_trial_active,
    start_trial,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/usage", tags=["usage"])


def get_user_from_request(
    request: Request, db: Session
) -> Optional[User]:
    """Get user from Firebase auth or return None for guests."""
    firebase_user = getattr(request.state, "firebase_user", None)
    if not firebase_user:
        return None
    
    email = firebase_user.get("email")
    if not email:
        return None
    
    user = db.query(User).filter(User.email == email).first()
    return user


class UsageLimitsResponse(BaseModel):
    plan_tier: str
    is_premium_mode: bool
    limits: Dict[str, Any]
    trial_eligible: bool = False
    trial_active: bool = False


class UsageStatsResponse(BaseModel):
    plan_tier: str
    is_premium_mode: bool
    features: Dict[str, Any]
    trial_active: bool = False


class TrialStartResponse(BaseModel):
    success: bool
    trial: Optional[Dict[str, Any]] = None
    message: str


class TrialStatusResponse(BaseModel):
    has_trial: bool
    is_active: bool
    expires_at: Optional[str] = None
    started_at: Optional[str] = None


@router.get("/limits", response_model=UsageLimitsResponse)
async def get_usage_limits(
    request: Request,
    session_id: Optional[str] = Query(None, description="Guest session ID"),
    db: Session = Depends(get_db),
):
    """Get current usage limits for the user."""
    user = get_user_from_request(request, db)
    plan_tier = get_plan_tier(user, db)
    
    from app.services.usage_service import USAGE_LIMITS, is_premium_mode_enabled
    
    limits = USAGE_LIMITS.get(plan_tier, USAGE_LIMITS["free"])
    
    trial_eligible = False
    trial_active = False
    if user:
        trial_eligible = check_trial_eligibility(user.id, db)
        trial_active = is_trial_active(user.id, db)
    
    return UsageLimitsResponse(
        plan_tier=plan_tier,
        is_premium_mode=is_premium_mode_enabled(),
        limits=limits,
        trial_eligible=trial_eligible,
        trial_active=trial_active,
    )


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_statistics(
    request: Request,
    session_id: Optional[str] = Query(None, description="Guest session ID"),
    db: Session = Depends(get_db),
):
    """Get current usage statistics for the user."""
    user = get_user_from_request(request, db)
    plan_tier = get_plan_tier(user, db)
    
    user_id = user.id if user else None
    stats = get_usage_stats(user_id, plan_tier, session_id, db)
    
    trial_active = False
    if user:
        trial_active = is_trial_active(user.id, db)
    
    return UsageStatsResponse(
        plan_tier=plan_tier,
        is_premium_mode=stats.get("is_premium_mode", False),
        features=stats.get("features", {}),
        trial_active=trial_active,
    )


@router.post("/trial/start", response_model=TrialStartResponse)
async def start_user_trial(
    request: Request,
    db: Session = Depends(get_db),
):
    """Start a 3-day free trial for the authenticated user."""
    user = get_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not check_trial_eligibility(user.id, db):
        return TrialStartResponse(
            success=False,
            message="You are not eligible for a trial. You may already have an active trial or be a premium user."
        )
    
    try:
        trial = start_trial(user.id, db)
        return TrialStartResponse(
            success=True,
            trial={
                "id": trial.id,
                "user_id": trial.user_id,
                "started_at": trial.started_at.isoformat(),
                "expires_at": trial.expires_at.isoformat(),
                "is_active": trial.is_active,
            },
            message="Trial started successfully. You now have access to all premium features for 3 days."
        )
    except ValueError as e:
        return TrialStartResponse(
            success=False,
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting trial: {e}")
        raise HTTPException(status_code=500, detail="Failed to start trial")


@router.get("/trial/status", response_model=TrialStatusResponse)
async def get_trial_status(
    request: Request,
    db: Session = Depends(get_db),
):
    """Get trial status for the authenticated user."""
    user = get_user_from_request(request, db)
    if not user:
        return TrialStatusResponse(
            has_trial=False,
            is_active=False,
        )
    
    from app.models import TrialPeriod
    from datetime import datetime
    from sqlalchemy import and_
    
    trial = db.query(TrialPeriod).filter(
        and_(
            TrialPeriod.user_id == user.id,
            TrialPeriod.is_active == True
        )
    ).first()
    
    if not trial:
        return TrialStatusResponse(
            has_trial=False,
            is_active=False,
        )
    
    is_active = trial.expires_at > datetime.utcnow()
    
    return TrialStatusResponse(
        has_trial=True,
        is_active=is_active,
        expires_at=trial.expires_at.isoformat() if trial.expires_at else None,
        started_at=trial.started_at.isoformat() if trial.started_at else None,
    )


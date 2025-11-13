"""Legacy auth endpoints (signup/login) - using database."""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.models import LoginPayload, SignupPayload
from app.core.config import settings
from app.core.db import get_db
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
async def signup(payload: SignupPayload, db: Session = Depends(get_db)):
    """User registration"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        email=payload.email,
        name=payload.name,
        password=payload.password,  # In production, hash this password
        is_premium=not settings.premium_mode,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = secrets.token_urlsafe(32)

    logger.info(f"New user signup: {payload.email} (Premium: {new_user.is_premium})")
    return {
        "token": token,
        "user": {
            "email": new_user.email,
            "name": new_user.name,
            "isPremium": new_user.is_premium,
            "createdAt": new_user.created_at.isoformat(),
        },
        "message": "Account created successfully",
    }


@router.post("/login")
async def login(payload: LoginPayload, db: Session = Depends(get_db)):
    """User authentication"""
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    logger.info(f"User login: {payload.email}")

    return {
        "token": token,
        "user": {
            "email": user.email,
            "name": user.name,
            "isPremium": user.is_premium,
            "createdAt": user.created_at.isoformat(),
        },
        "message": "Login successful",
    }


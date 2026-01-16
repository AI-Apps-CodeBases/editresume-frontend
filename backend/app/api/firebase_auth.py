from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/auth", tags=["auth"])


class FirebaseUserPayload(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    emailVerified: bool = False
    isAnonymous: bool = False
    isPremium: bool = False
    signInProvider: str | None = None
    claims: dict[str, Any] = Field(default_factory=dict)


class SessionResponse(BaseModel):
    user: FirebaseUserPayload


def require_firebase_user(request: Request) -> dict[str, Any]:
    user = getattr(request.state, "firebase_user", None)
    if not user:
        auth_error = getattr(request.state, "firebase_auth_error", None)
        error_detail = "Unauthorized"
        if auth_error == "verification_failed":
            error_detail = (
                "Authentication failed due to network connectivity issues. "
                "Please check your internet connection and try again. "
                "If the problem persists, the service may be temporarily unavailable."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail
        )
    return user


@router.get("/session", response_model=SessionResponse)
async def get_current_session(
    user: dict[str, Any] = Depends(require_firebase_user),
) -> SessionResponse:
    return SessionResponse(user=user)

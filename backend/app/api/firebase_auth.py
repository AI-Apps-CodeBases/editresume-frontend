from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/auth", tags=["auth"])


class FirebaseUserPayload(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    emailVerified: bool = False
    isAnonymous: bool = False
    isPremium: bool = False
    signInProvider: Optional[str] = None
    claims: Dict[str, Any] = Field(default_factory=dict)


class SessionResponse(BaseModel):
    user: FirebaseUserPayload


def require_firebase_user(request: Request) -> Dict[str, Any]:
    user = getattr(request.state, "firebase_user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )
    return user


@router.get("/session", response_model=SessionResponse)
async def get_current_session(
    user: Dict[str, Any] = Depends(require_firebase_user),
) -> SessionResponse:
    return SessionResponse(user=user)

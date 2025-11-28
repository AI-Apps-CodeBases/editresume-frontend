"""LinkedIn OAuth and API endpoints."""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.firebase_admin import verify_id_token, sanitized_user_from_token
from app.models import User
from app.services.linkedin_service import linkedin_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


@router.get("/auth/url")
async def get_linkedin_auth_url(
    authorization: str = Query(..., description="Firebase ID token"),
):
    """Generate LinkedIn OAuth authorization URL."""
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = verify_id_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        state = secrets.token_urlsafe(32)
        auth_url = linkedin_service.get_authorization_url(state)

        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        logger.error(f"Error generating LinkedIn auth URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@router.get("/auth/callback")
async def linkedin_callback(
    code: str = Query(..., description="Authorization code from LinkedIn"),
    state: str = Query(None, description="State parameter"),
    authorization: str = Query(None, description="Firebase ID token"),
    db: Session = Depends(get_db),
):
    """Handle LinkedIn OAuth callback and store token."""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization required")

        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = verify_id_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_info = sanitized_user_from_token(decoded_token)
        user_email = user_info.get("email")

        if not user_email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        token_data = await linkedin_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")

        profile_data = await linkedin_service.get_user_profile(access_token)
        linkedin_id = profile_data.get("profile", {}).get("sub")
        linkedin_profile_url = f"https://www.linkedin.com/in/{linkedin_id}" if linkedin_id else None

        user = db.query(User).filter(User.email.ilike(user_email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.linkedin_token = access_token
        user.linkedin_id = linkedin_id
        user.linkedin_profile_url = linkedin_profile_url
        db.commit()
        db.refresh(user)

        frontend_url = "http://localhost:3000"
        if state and "redirect_uri" in state:
            frontend_url = state.split("redirect_uri=")[1] if "redirect_uri=" in state else frontend_url

        return RedirectResponse(
            url=f"{frontend_url}/profile?linkedin_connected=true"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in LinkedIn callback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process callback: {str(e)}")


@router.get("/profile")
async def get_linkedin_profile(
    authorization: str = Query(..., description="Firebase ID token"),
    db: Session = Depends(get_db),
):
    """Get user's LinkedIn profile data."""
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = verify_id_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_info = sanitized_user_from_token(decoded_token)
        user_email = user_info.get("email")

        if not user_email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        user = db.query(User).filter(User.email.ilike(user_email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.linkedin_token:
            raise HTTPException(status_code=400, detail="LinkedIn not connected")

        profile_data = await linkedin_service.get_user_profile(user.linkedin_token)

        return {
            "connected": True,
            "profile_url": user.linkedin_profile_url,
            "profile_data": profile_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching LinkedIn profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.post("/share")
async def share_to_linkedin(
    text: str = Query(..., description="Post text"),
    share_url: str = Query(None, description="URL to share"),
    authorization: str = Query(..., description="Firebase ID token"),
    db: Session = Depends(get_db),
):
    """Share content to LinkedIn feed."""
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = verify_id_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_info = sanitized_user_from_token(decoded_token)
        user_email = user_info.get("email")

        if not user_email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        user = db.query(User).filter(User.email.ilike(user_email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.linkedin_token:
            raise HTTPException(status_code=400, detail="LinkedIn not connected")

        result = await linkedin_service.share_to_linkedin(
            user.linkedin_token, text, share_url
        )

        return {"success": True, "post_id": result.get("id")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing to LinkedIn: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to share: {str(e)}")


@router.get("/status")
async def get_linkedin_status(
    authorization: str = Query(..., description="Firebase ID token"),
    db: Session = Depends(get_db),
):
    """Check if user has LinkedIn connected."""
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = verify_id_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_info = sanitized_user_from_token(decoded_token)
        user_email = user_info.get("email")

        if not user_email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        user = db.query(User).filter(User.email.ilike(user_email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "connected": bool(user.linkedin_token),
            "profile_url": user.linkedin_profile_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking LinkedIn status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")


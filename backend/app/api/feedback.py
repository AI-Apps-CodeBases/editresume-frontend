from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.services.email_service import send_feedback_notification
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    rating: Optional[int] = None
    feedback: str
    category: str = "general"
    page_url: Optional[str] = None
    user_email: Optional[str] = None

    @field_validator('user_email')
    @classmethod
    def validate_email_format(cls, v):
        """Validate email format if provided"""
        if v is not None and v.strip():
            email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_pattern, v.strip()):
                raise ValueError('Invalid email format')
        return v.strip() if v else None


class FeedbackResponse(BaseModel):
    id: int
    user_email: Optional[str]
    rating: Optional[int]
    feedback: str
    category: str
    page_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=dict)
async def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db)
):
    # Validate that email is provided (required for anonymous users)
    if not payload.user_email or not payload.user_email.strip():
        raise HTTPException(
            status_code=400, 
            detail="Email address is required to submit feedback. Please provide a valid email address."
        )

    user = None
    if payload.user_email:
        user = db.query(User).filter(User.email == payload.user_email).first()
    
    feedback = Feedback(
        user_id=user.id if user else None,
        user_email=payload.user_email.strip() if payload.user_email else None,
        rating=payload.rating,
        feedback=payload.feedback,
        category=payload.category,
        page_url=payload.page_url
    )
    
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    email_sent = send_feedback_notification(
        feedback_text=payload.feedback,
        category=payload.category,
        rating=payload.rating,
        user_email=payload.user_email,
        page_url=payload.page_url,
    )
    
    if not email_sent:
        logger.warning(f"Feedback saved (ID: {feedback.id}) but email notification failed. Check logs for details.")
    
    return {"success": True, "id": feedback.id, "email_sent": email_sent}


@router.get("", response_model=List[FeedbackResponse])
async def get_feedback(
    user_email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_premium:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    return feedbacks


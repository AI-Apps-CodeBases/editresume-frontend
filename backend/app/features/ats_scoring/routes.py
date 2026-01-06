"""ATS Scoring API routes - extracted from api/ai.py for better feature isolation."""

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.models import EnhancedATSPayload, ResumePayload
from app.core.db import get_db
from app.core.dependencies import ats_checker
from app.core.service_factory import get_enhanced_ats_service
from app.services.enhanced_ats_service import EnhancedATSChecker
from app.services.usage_service import record_ai_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ats-scoring"])


def get_user_from_request(request: Request, db: Session):
    """Get user from Firebase auth or return None for guests."""
    firebase_user = getattr(request.state, "firebase_user", None)
    if not firebase_user:
        return None
    
    email = firebase_user.get("email")
    if not email:
        return None
    
    from app.models import User
    user = db.query(User).filter(User.email == email).first()
    return user


@router.post("/ats_score")
async def get_ats_score(payload: ResumePayload):
    """Get ATS compatibility score and suggestions for resume"""
    try:
        logger.info("Processing ATS score request")

        # Check if ATS checker is available
        if not ats_checker:
            return {
                "success": False,
                "score": 0,
                "suggestions": [
                    "ATS analysis is not available. Please install required dependencies."
                ],
                "details": {},
                "error": "ATS checker not available",
            }

        # Convert ResumePayload to dict for ATSChecker
        resume_data = {
            "name": payload.name,
            "title": payload.title,
            "email": payload.email,
            "phone": payload.phone,
            "location": payload.location,
            "summary": payload.summary,
            "sections": payload.sections,
        }

        # Get ATS score and analysis
        result = ats_checker.get_ats_score(resume_data)

        logger.info(f"ATS analysis completed. Score: {result.get('score', 0)}")

        return {
            "success": True,
            "score": result.get("score", 0),
            "suggestions": result.get("suggestions", []),
            "details": result.get("details", {}),
            "message": f"ATS compatibility score: {result.get('score', 0)}/100",
        }

    except Exception as e:
        logger.error(f"ATS score calculation error: {str(e)}")
        return {
            "success": False,
            "score": 0,
            "suggestions": ["Unable to analyze resume. Please check your content."],
            "details": {},
            "error": str(e),
        }


@router.options("/enhanced_ats_score")
async def options_enhanced_ats_score(request: Request):
    """Handle OPTIONS preflight for enhanced_ats_score endpoint"""
    from app.core.config import settings
    
    origin = request.headers.get("origin")
    
    headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    # Get allowed origins from settings
    allowed_origins = settings.allowed_origins
    env = os.getenv("ENVIRONMENT", "development")
    
    # Check if origin is allowed
    if origin:
        if env == "staging":
            headers["Access-Control-Allow-Origin"] = "*"
            headers["Access-Control-Allow-Credentials"] = "false"
        elif origin in allowed_origins or origin.startswith("chrome-extension://"):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        else:
            # Still allow for OPTIONS (preflight), actual request will be validated
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "false"
    
    return Response(status_code=200, headers=headers)


@router.post("/enhanced_ats_score")
async def get_enhanced_ats_score(
    payload: EnhancedATSPayload,
    request: Request,
    db: Session = Depends(get_db),
    session_id: Optional[str] = None,
    ats_service: EnhancedATSChecker = Depends(get_enhanced_ats_service),
):
    """Get enhanced ATS compatibility score with AI improvements using TF-IDF when job description provided
    
    Uses dependency injection for EnhancedATSChecker - can be mocked in tests.
    """
    try:
        logger.info("Processing enhanced ATS score request")

        # ATS scoring is always free - no usage limit check needed
        # Still record usage for analytics but don't block
        try:
            user = get_user_from_request(request, db)
            user_id = user.id if user else None
            record_ai_usage(user_id, "ats_enhanced", session_id, db)
        except Exception as e:
            logger.warning(f"Failed to record ATS usage: {e}")

        # Check if enhanced ATS checker is available (now injected, but check for safety)
        if not ats_service:
            return {
                "success": False,
                "score": 0,
                "suggestions": [
                    "Enhanced ATS analysis is not available. Please install required dependencies."
                ],
                "details": {},
                "ai_improvements": [],
                "error": "Enhanced ATS checker not available",
            }

        # If resume_text is provided (from live preview), use it directly for more accurate scoring
        resume_text_to_use = None
        resume_data_to_use = None
        
        if payload.resume_text and payload.resume_text.strip():
            resume_text_to_use = payload.resume_text.strip()
            logger.info(f"Using resume_text from preview (length: {len(resume_text_to_use)})")
            # Still need resume_data for structure analysis
            if payload.resume_data:
                resume_data_to_use = {
                    "name": payload.resume_data.name,
                    "title": payload.resume_data.title,
                    "email": payload.resume_data.email,
                    "phone": payload.resume_data.phone,
                    "location": payload.resume_data.location,
                    "summary": payload.resume_data.summary,
                    "sections": [
                        {
                            "id": section.id,
                            "title": section.title,
                            "bullets": [
                                {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                                for bullet in section.bullets
                            ],
                        }
                        for section in payload.resume_data.sections
                    ],
                }
        elif payload.resume_data:
            # Fallback to extracting from resume_data
            resume_data_to_use = {
                "name": payload.resume_data.name,
                "title": payload.resume_data.title,
                "email": payload.resume_data.email,
                "phone": payload.resume_data.phone,
                "location": payload.resume_data.location,
                "summary": payload.resume_data.summary,
                "sections": [
                    {
                        "id": section.id,
                        "title": section.title,
                        "bullets": [
                            {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                            for bullet in section.bullets
                        ],
                    }
                    for section in payload.resume_data.sections
                ],
            }
            resume_text_to_use = ats_service.extract_text_from_resume(resume_data_to_use)
            logger.info(f"Extracted resume_text from resume_data (length: {len(resume_text_to_use)})")
        else:
            raise HTTPException(status_code=400, detail="Either resume_text or resume_data required")
        
        # Log for debugging score inconsistency issues
        if previewExtractionSuccess := (payload.resume_text and payload.resume_text.strip()):
            logger.info(f"Score calculation: Using resume_text from preview (length: {len(payload.resume_text)})")
        else:
            logger.info(f"Score calculation: Using resume_data extraction (resume_data provided: {payload.resume_data is not None})")

        # Get enhanced ATS score and analysis
        # Automatically use industry-standard TF-IDF when job description or extracted_keywords is provided
        use_tfidf = bool(
            (payload.job_description and payload.job_description.strip()) or 
            (payload.extracted_keywords and payload.extracted_keywords.get("total_keywords", 0) > 0)
        )
        result = ats_service.get_enhanced_ats_score(
            resume_data_to_use,  # Still pass for structure analysis
            payload.job_description, 
            resume_text=resume_text_to_use,  # Pass extracted text for more accurate scoring
            use_industry_standard=use_tfidf,
            extracted_keywords=payload.extracted_keywords,
            previous_score=payload.previous_score
        )

        logger.info(f"Enhanced ATS analysis completed. Score: {result.get('score', 0)}")

        return {
            "success": True,
            "score": result.get("score", 0),
            "suggestions": result.get("suggestions", []),
            "details": result.get("details", {}),
            "ai_improvements": result.get("ai_improvements", []),
            "method": result.get("method", "comprehensive"),
            "message": f"Enhanced ATS compatibility score: {result.get('score', 0)}/100",
        }

    except Exception as e:
        logger.error(f"Enhanced ATS score calculation error: {str(e)}")
        return {
            "success": False,
            "score": 0,
            "suggestions": ["Unable to analyze resume. Please check your content."],
            "details": {},
            "ai_improvements": [],
            "error": str(e),
        }


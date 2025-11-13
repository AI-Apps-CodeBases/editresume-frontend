"""Resume automation endpoints."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.firebase_auth import require_firebase_user
from app.core.db import get_db
from app.domain.resume_matcher.models import ATSScore
from app.services.resume_automation import ResumeAutomationService
from app.models.user import User

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


class AutoGenerateRequest(BaseModel):
    job_id: int = Field(..., ge=1)
    source_resume_ids: List[int] = Field(..., min_length=1, max_length=3)


class GeneratedResume(BaseModel):
    id: int
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    template: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class GeneratedVersion(BaseModel):
    id: int
    resume_id: int
    version_number: int
    resume_data: Dict[str, Any]
    created_at: str | None = None
    change_summary: str | None = None


class AutoGenerateResponse(BaseModel):
    resume: GeneratedResume
    version: GeneratedVersion
    ats_score: ATSScore
    insights: Dict[str, Any]


def _resolve_user_id(session: Session, firebase_user: Dict[str, Any]) -> int:
    email = (firebase_user or {}).get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated user email is required",
        )

    user = session.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return user.id


@router.post(
    "/auto-generate",
    response_model=AutoGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a resume draft for a saved job",
)
async def auto_generate_resume(
    payload: AutoGenerateRequest,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, Any] = Depends(require_firebase_user),
) -> AutoGenerateResponse:
    user_id = _resolve_user_id(database, firebase_user)

    service = ResumeAutomationService(database)
    try:
        generated_resume, ats_score = await service.generate_resume_from_job(
            user_id=user_id,
            job_id=payload.job_id,
            source_resume_ids=payload.source_resume_ids,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return AutoGenerateResponse(
        resume=GeneratedResume(**generated_resume["resume"]),
        version=GeneratedVersion(**generated_resume["version"]),
        ats_score=ats_score,
        insights=generated_resume.get("insights", {}),
    )


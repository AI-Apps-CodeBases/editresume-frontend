"""Job Management Feature - handles all job description, cover letter, and matching operations.

This module contains all job-related endpoints extracted from app/api/job.py
for better feature isolation and organization.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.models import (
    JobCoverLetterCreate,
    JobCoverLetterUpdate,
    JobDescriptionUpdate,
    MatchCreate,
)
from app.core.db import get_db
from app.models import JobDescription, JobCoverLetter, MatchSession, Resume, ResumeVersion, JobResumeVersion, User
from app.services.job_service import (
    create_or_update_job_description,
    get_job_description_detail,
    list_user_job_descriptions,
    list_cover_letters,
    create_cover_letter,
    update_cover_letter,
    delete_cover_letter,
)
from app.utils.job_helpers import safe_get_job_description
from app.utils.match_helpers import _resume_to_text, _compute_match_breakdown

logger = logging.getLogger(__name__)

# Main job descriptions router
router = APIRouter(prefix="/api/job-descriptions", tags=["jobs"])

# Jobs router (for saved jobs management - from app/api/jobs/routes.py)
jobs_router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def get_user_email_from_request(
    request: Request,
    user_email: Optional[str] = None,
) -> Optional[str]:
    """Extract user email from Firebase auth or query parameter"""
    # First try Firebase auth (for extension and frontend)
    firebase_user = getattr(request.state, "firebase_user", None)
    if firebase_user and firebase_user.get("email"):
        logger.info(f"Extracted email from Firebase auth: {firebase_user.get('email')}")
        return firebase_user["email"]
    elif firebase_user:
        logger.warning(f"Firebase user found but no email: {firebase_user}")
    else:
        logger.warning(f"No Firebase user in request.state, falling back to query param: {user_email}")
    # Fallback to query parameter (for backward compatibility)
    return user_email


@router.post("")
async def create_job_description(
    payload: dict,  # TODO: Create proper Pydantic model
    request: Request,
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Create or update a job description"""
    # Extract user email from Firebase auth or query parameter
    email = get_user_email_from_request(request, user_email)
    logger.info(f"Creating job description - extracted email: {email}, query param: {user_email}")
    if email:
        payload["user_email"] = email
        logger.info(f"Added user_email to payload: {email}")
    else:
        logger.warning("No user email found in request - job will be saved without user association")
    return create_or_update_job_description(payload, db)


@router.get("")
async def list_job_descriptions(
    request: Request,
    user_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List job descriptions for a user"""
    # Extract user email from Firebase auth or query parameter
    email = get_user_email_from_request(request, user_email)
    logger.info(f"GET /api/job-descriptions - query param: {user_email}, extracted email: {email}, firebase_user: {getattr(request.state, 'firebase_user', None)}")
    return list_user_job_descriptions(email, db)


@router.get("/{jd_id}")
async def get_job_description(
    jd_id: int,
    request: Request,
    user_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get a specific job description"""
    # Extract user email from Firebase auth or query parameter
    email = get_user_email_from_request(request, user_email)
    return get_job_description_detail(jd_id, email, db)


@router.delete("/{jd_id}")
async def delete_job_description(
    jd_id: int,
    request: Request,
    user_email: Optional[str] = Query(None, description="User email for authentication (optional if using Firebase auth)"),
    db: Session = Depends(get_db),
):
    """Delete a job description"""
    try:
        # Extract user email from Firebase auth or query parameter
        email = get_user_email_from_request(request, user_email)
        if not email:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        jd, _ = safe_get_job_description(jd_id, db)
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")

        # Verify ownership
        if jd.user_id != user.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to delete this job description"
            )

        db.delete(jd)
        db.commit()

        return {"success": True, "message": "Job description deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job description: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Failed to delete job description"
        )


@router.patch("/{jd_id}")
async def update_job_description(
    jd_id: int,
    payload: JobDescriptionUpdate,
    request: Request,
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Update specific fields of a job description"""
    try:
        # Extract user email from Firebase auth or query parameter
        email = get_user_email_from_request(request, user_email)
        
        jd, jd_has_new_columns = safe_get_job_description(jd_id, db)
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")
        if not jd_has_new_columns:
            raise HTTPException(
                status_code=400,
                detail="Job description advanced fields are unavailable. Please run the database migration to add job metadata columns.",
            )

        # Update allowed fields
        if payload.max_salary is not None:
            jd.max_salary = payload.max_salary
        if payload.status is not None:
            jd.status = payload.status
        if payload.follow_up_date is not None:
            if payload.follow_up_date:
                try:
                    # Handle ISO format dates
                    if "T" in payload.follow_up_date:
                        jd.follow_up_date = datetime.fromisoformat(
                            payload.follow_up_date.replace("Z", "+00:00")
                        )
                    else:
                        # Handle date-only format (YYYY-MM-DD)
                        jd.follow_up_date = datetime.strptime(
                            payload.follow_up_date, "%Y-%m-%d"
                        )
                except Exception as e:
                    logger.warning(f"Failed to parse follow_up_date: {e}")
            else:
                jd.follow_up_date = None
        if payload.importance is not None:
            # Validate importance is between 0 and 5
            if payload.importance < 0 or payload.importance > 5:
                raise HTTPException(status_code=400, detail="Importance must be between 0 and 5")
            jd.importance = payload.importance
        if payload.notes is not None:
            jd.notes = payload.notes

        db.commit()
        db.refresh(jd)

        return get_job_description_detail(jd_id, email, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job description {jd_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update job description: {str(e)}"
        )


@router.get("/{jd_id}/cover-letters")
async def get_cover_letters(jd_id: int, db: Session = Depends(get_db)):
    """List all cover letters for a job description"""
    return list_cover_letters(jd_id, db)


@router.post("/{jd_id}/cover-letters")
async def create_cover_letter_endpoint(
    jd_id: int, payload: JobCoverLetterCreate, db: Session = Depends(get_db)
):
    """Create a new cover letter for a job description"""
    return create_cover_letter(jd_id, payload.dict(), db)


@router.patch("/{jd_id}/cover-letters/{letter_id}")
async def update_cover_letter_endpoint(
    jd_id: int,
    letter_id: int,
    payload: JobCoverLetterUpdate,
    db: Session = Depends(get_db),
):
    """Update a cover letter"""
    return update_cover_letter(jd_id, letter_id, payload.dict(exclude_unset=True), db)


@router.delete("/{jd_id}/resume-versions/{version_id}")
async def delete_job_resume_version(
    jd_id: int,
    version_id: int,
    request: Request,
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Delete a job resume version match"""
    try:
        email = get_user_email_from_request(request, user_email)
        if not email:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        jd, _ = safe_get_job_description(jd_id, db)
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")

        if jd.user_id and jd.user_id != user.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to delete this match"
            )

        job_resume_version = (
            db.query(JobResumeVersion)
            .filter(
                JobResumeVersion.id == version_id,
                JobResumeVersion.job_description_id == jd_id
            )
            .first()
        )

        if not job_resume_version:
            raise HTTPException(status_code=404, detail="Resume version match not found")

        db.delete(job_resume_version)
        db.commit()

        logger.info(f"Deleted job resume version {version_id} for job {jd_id}")
        return {"success": True, "message": "Resume version match deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job resume version: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Failed to delete resume version match"
        )


@router.delete("/{jd_id}/cover-letters/{letter_id}")
async def delete_cover_letter_endpoint(
    jd_id: int, letter_id: int, db: Session = Depends(get_db)
):
    """Delete a cover letter"""
    return delete_cover_letter(jd_id, letter_id, db)


@router.get("/{jd_id}/matches")
async def get_job_description_matches(jd_id: int, db: Session = Depends(get_db)):
    """Get all match sessions for a specific job description"""
    try:
        matches = (
            db.query(MatchSession)
            .filter(MatchSession.job_description_id == jd_id)
            .order_by(MatchSession.created_at.desc())
            .all()
        )

        result = []
        for match in matches:
            resume_name = None
            resume_version_id = None

            if match.resume_id:
                resume = db.query(Resume).filter(Resume.id == match.resume_id).first()
                if resume:
                    resume_name = resume.name
                    # Get latest version ID if available
                    try:
                        latest_version = (
                            db.query(ResumeVersion)
                            .filter(ResumeVersion.resume_id == resume.id)
                            .order_by(ResumeVersion.version_number.desc())
                            .first()
                        )
                        if latest_version:
                            resume_version_id = latest_version.id
                    except Exception as e:
                        logger.warning(
                            f"Failed to get resume version for resume {resume.id}: {e}"
                        )

            result.append(
                {
                    "id": match.id,
                    "score": match.score,
                    "resume_id": match.resume_id,
                    "resume_name": resume_name,
                    "resume_version_id": resume_version_id,
                    "keyword_coverage": match.keyword_coverage,
                    "matched_keywords": match.matched_keywords or [],
                    "missing_keywords": match.missing_keywords or [],
                    "excess_keywords": match.excess_keywords or [],
                    "created_at": (
                        match.created_at.isoformat() if match.created_at else None
                    ),
                }
            )

        return result
    except Exception as e:
        logger.exception("Failed to get job description matches")
        raise HTTPException(status_code=500, detail=str(e))


# Match endpoints - registered directly in main.py due to different prefix
def create_match(payload: MatchCreate, db: Session):
    """Create a match session between resume and job description"""
    try:
        logger.info(
            f"create_match: Starting match creation for JD {payload.jobDescriptionId}, resumeId: {payload.resumeId}"
        )

        # Find or create resume if needed
        resume = None
        if payload.resumeId:
            resume = db.query(Resume).filter(Resume.id == payload.resumeId).first()
            if not resume:
                logger.warning(
                    f"create_match: Resume {payload.resumeId} not found, will try to create if user_email provided"
                )

        # If resume doesn't exist but we have user_email and resume data, create it
        if not resume and payload.user_email and payload.resume_name:
            try:
                user = db.query(User).filter(User.email == payload.user_email).first()
                if user:
                    logger.info(
                        f"create_match: Creating new resume for user {user.email}"
                    )
                    # Check if resume with this name already exists
                    existing_resume = (
                        db.query(Resume)
                        .filter(
                            Resume.user_id == user.id,
                            Resume.name == payload.resume_name,
                        )
                        .first()
                    )

                    if existing_resume:
                        resume = existing_resume
                        logger.info(
                            f"create_match: Found existing resume {resume.id} with same name"
                        )
                    else:
                        # Create new resume from snapshot or basic info
                        resume = Resume(
                            user_id=user.id,
                            name=payload.resume_name,
                            title=payload.resume_title or "",
                            email="",
                            phone="",
                            location="",
                            summary="",
                            template="tech",
                        )
                        db.add(resume)
                        db.commit()
                        db.refresh(resume)
                        logger.info(f"create_match: Created new resume {resume.id}")

                        # Create version if snapshot provided
                        if payload.resume_snapshot:
                            try:
                                from app.services.version_control_service import VersionControlService
                                version_service = VersionControlService(db)
                                resume_data = {
                                    "personalInfo": payload.resume_snapshot.get(
                                        "personalInfo",
                                        {
                                            "name": payload.resume_name,
                                            "title": payload.resume_title or "",
                                            "email": "",
                                            "phone": "",
                                            "location": "",
                                        },
                                    ),
                                    "summary": payload.resume_snapshot.get(
                                        "summary", ""
                                    ),
                                    "sections": payload.resume_snapshot.get(
                                        "sections", []
                                    ),
                                }
                                version = version_service.create_version(
                                    user_id=user.id,
                                    resume_id=resume.id,
                                    resume_data=resume_data,
                                    change_summary="Auto-created from match session",
                                    is_auto_save=False,
                                )
                                logger.info(
                                    f"create_match: Created version {version.id} for resume {resume.id}"
                                )
                                resolved_resume_version_id = version.id
                                resolved_resume_version_obj = version
                                resolved_resume_version_label = (
                                    f"v{version.version_number}"
                                )
                            except Exception as e:
                                logger.warning(
                                    f"create_match: Failed to create version: {e}"
                                )
                else:
                    logger.warning(f"create_match: User {payload.user_email} not found")
            except Exception as e:
                logger.error(f"create_match: Error creating resume: {e}")

        if not resume:
            raise HTTPException(
                status_code=404,
                detail="Resume not found and could not be created. Provide resumeId or user_email with resume_name.",
            )

        resolved_resume_version_id = payload.resume_version_id
        resolved_resume_version_obj: Optional[ResumeVersion] = None
        resolved_resume_version_label = None

        # Get job description (use safe query to handle missing columns)
        jd, jd_has_new_columns = safe_get_job_description(payload.jobDescriptionId, db)
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")

        # If resume exists and resume_snapshot is provided, create a new version with tailored data
        # This ensures tailored resumes are saved as new versions (v1, v2, etc.)
        if resume and payload.resume_snapshot and resume.user_id:
            try:
                from app.services.version_control_service import VersionControlService
                version_service = VersionControlService(db)
                resume_data = {
                    "personalInfo": payload.resume_snapshot.get(
                        "personalInfo",
                        {
                            "name": resume.name,
                            "title": resume.title or "",
                            "email": resume.email or "",
                            "phone": resume.phone or "",
                            "location": resume.location or "",
                        },
                    ),
                    "summary": payload.resume_snapshot.get("summary", resume.summary or ""),
                    "sections": payload.resume_snapshot.get("sections", []),
                }
                version = version_service.create_version(
                    user_id=resume.user_id,
                    resume_id=resume.id,
                    resume_data=resume_data,
                    change_summary=f"Tailored for job: {jd.title or 'Job'}",
                    is_auto_save=False,
                )
                resolved_resume_version_id = version.id
                resolved_resume_version_obj = version
                resolved_resume_version_label = f"v{version.version_number}"
                logger.info(
                    f"create_match: Created new tailored version {version.id} (v{version.version_number}) for resume {resume.id}"
                )
            except Exception as e:
                logger.warning(f"create_match: Failed to create tailored version: {e}")
                # Fall back to existing version logic below

        # Update JD with metadata if provided
        if payload.jd_metadata:
            metadata = payload.jd_metadata
            if jd_has_new_columns:
                updated = False
                if metadata.get("easy_apply_url") and not jd.easy_apply_url:
                    jd.easy_apply_url = metadata.get("easy_apply_url")
                    updated = True
                if metadata.get("work_type") and not jd.work_type:
                    jd.work_type = metadata.get("work_type")
                    updated = True
                if metadata.get("job_type") and not jd.job_type:
                    jd.job_type = metadata.get("job_type")
                    updated = True
                if metadata.get("company") and not jd.company:
                    jd.company = metadata.get("company")
                    updated = True
                if updated:
                    db.commit()
                    db.refresh(jd)
            else:
                # Fallback to raw SQL update when new columns are absent
                update_sql = text(
                    """
                    UPDATE job_descriptions
                    SET easy_apply_url = COALESCE(:easy_apply_url, easy_apply_url),
                        work_type = COALESCE(:work_type, work_type),
                        job_type = COALESCE(:job_type, job_type),
                        company = COALESCE(:company, company)
                    WHERE id = :jd_id
                """
                )
                db.execute(
                    update_sql,
                    {
                        "easy_apply_url": metadata.get("easy_apply_url"),
                        "work_type": metadata.get("work_type"),
                        "job_type": metadata.get("job_type"),
                        "company": metadata.get("company"),
                        "jd_id": payload.jobDescriptionId,
                    },
                )
                db.commit()
                # Update local object for downstream use
                if metadata.get("easy_apply_url"):
                    jd.easy_apply_url = metadata.get("easy_apply_url")
                if metadata.get("work_type"):
                    jd.work_type = metadata.get("work_type")
                if metadata.get("job_type"):
                    jd.job_type = metadata.get("job_type")
                if metadata.get("company"):
                    jd.company = metadata.get("company")

        # Get resume text from version or resume data
        resume_text = ""
        # If we just created a new version, use it
        if resolved_resume_version_obj:
            resume_text = _resume_to_text(resolved_resume_version_obj.resume_data)
        elif payload.resume_version_id:
            rv = (
                db.query(ResumeVersion)
                .filter(ResumeVersion.id == payload.resume_version_id)
                .first()
            )
            if rv:
                resume_text = _resume_to_text(rv.resume_data)
                resolved_resume_version_id = rv.id
                resolved_resume_version_obj = rv
                resolved_resume_version_label = f"v{rv.version_number}"

        if not resume_text:
            rv = (
                db.query(ResumeVersion)
                .filter(ResumeVersion.resume_id == resume.id)
                .order_by(ResumeVersion.version_number.desc())
                .first()
            )
            if rv:
                resume_text = _resume_to_text(rv.resume_data)
                resolved_resume_version_id = rv.id
                resolved_resume_version_obj = rv
                resolved_resume_version_label = f"v{rv.version_number}"
            else:
                resume_text = "\n".join(
                    [resume.name or "", resume.title or "", resume.summary or ""]
                )

        # Use provided keyword data if available, otherwise compute it
        keyword_coverage = None
        if (
            payload.matched_keywords is not None
            and payload.missing_keywords is not None
        ):
            # Use provided keyword data
            matched_kw = (
                payload.matched_keywords
                if isinstance(payload.matched_keywords, list)
                else []
            )
            missing_kw = (
                payload.missing_keywords
                if isinstance(payload.missing_keywords, list)
                else []
            )
            keyword_coverage = payload.keyword_coverage
            logger.info(
                f"create_match: Using provided keyword data - matched: {len(matched_kw)}, missing: {len(missing_kw)}, coverage: {keyword_coverage}"
            )
            # Still compute breakdown for score if ATS score not provided
            if payload.ats_score is None:
                breakdown = _compute_match_breakdown(
                    jd.content, resume_text, jd.extracted_keywords or {}
                )
                # Use computed keyword_coverage if not provided
                if keyword_coverage is None:
                    keyword_coverage = breakdown.get("keyword_coverage", 0)
            else:
                breakdown = {
                    "matched_keywords": matched_kw,
                    "missing_keywords": missing_kw,
                    "keyword_coverage": keyword_coverage or 0,
                }
        else:
            # Compute breakdown from scratch
            breakdown = _compute_match_breakdown(
                jd.content, resume_text, jd.extracted_keywords or {}
            )
            matched_kw = breakdown.get("matched_keywords", [])
            missing_kw = breakdown.get("missing_keywords", [])
            keyword_coverage = breakdown.get("keyword_coverage", 0)

        # Use provided ATS score if available, otherwise use computed score
        final_score = (
            payload.ats_score
            if payload.ats_score is not None
            else int(breakdown.get("score", 0))
        )
        logger.info(
            f"create_match: Using ATS score: {final_score} (provided: {payload.ats_score}, computed: {breakdown.get('score', 0)})"
        )

        # Ensure JSON fields are Python lists/dicts, not JSON strings
        if not isinstance(matched_kw, list):
            matched_kw = breakdown.get("matched_keywords", [])
        if not isinstance(missing_kw, list):
            missing_kw = breakdown.get("missing_keywords", [])

        logger.info(
            f"create_match: Raw breakdown data types - matched_keywords: {type(matched_kw)}, missing_keywords: {type(missing_kw)}"
        )

        # Convert to list if it's already a string (defensive)
        if isinstance(matched_kw, str):
            logger.warning(
                f"create_match: matched_keywords is string, parsing: {matched_kw[:50]}"
            )
            try:
                matched_kw = json.loads(matched_kw)
            except Exception as e:
                logger.error(
                    f"create_match: Failed to parse matched_keywords string: {e}"
                )
                matched_kw = []
        if isinstance(missing_kw, str):
            logger.warning(
                f"create_match: missing_keywords is string, parsing: {missing_kw[:50]}"
            )
            try:
                missing_kw = json.loads(missing_kw)
            except Exception as e:
                logger.error(
                    f"create_match: Failed to parse missing_keywords string: {e}"
                )
                missing_kw = []

        # Ensure they're lists (handle sets, tuples, etc.)
        if not isinstance(matched_kw, list):
            matched_kw = list(matched_kw) if matched_kw else []
        if not isinstance(missing_kw, list):
            missing_kw = list(missing_kw) if missing_kw else []

        # Use provided keyword_coverage or compute from breakdown
        if keyword_coverage is None:
            keyword_coverage = breakdown.get("keyword_coverage", 0)

        logger.info(
            f"create_match: Final data types - matched_keywords: {type(matched_kw)} (len={len(matched_kw)}), missing_keywords: {type(missing_kw)} (len={len(missing_kw)}), keyword_coverage: {keyword_coverage}"
        )

        # Get user_id from resume
        if not resume.user_id:
            raise HTTPException(
                status_code=400,
                detail="Resume must belong to a user to create match session",
            )

        # Upsert job resume version summary
        job_resume_version = None
        try:
            resume_version_label = resolved_resume_version_label
            if not resume_version_label and resolved_resume_version_obj:
                resume_version_label = f"v{resolved_resume_version_obj.version_number}"
            if not resume_version_label and resolved_resume_version_id:
                fetched_version = (
                    db.query(ResumeVersion)
                    .filter(ResumeVersion.id == resolved_resume_version_id)
                    .first()
                )
                if fetched_version:
                    resolved_resume_version_obj = fetched_version
                    resume_version_label = f"v{fetched_version.version_number}"
            if not resume_version_label:
                resume_version_label = "Current"

            version_query = db.query(JobResumeVersion).filter(
                JobResumeVersion.job_description_id == jd.id
            )
            if resolved_resume_version_id:
                job_resume_version = version_query.filter(
                    JobResumeVersion.resume_version_id == resolved_resume_version_id
                ).first()
            else:
                job_resume_version = version_query.filter(
                    JobResumeVersion.resume_version_id.is_(None),
                    JobResumeVersion.resume_id == resume.id,
                ).first()

            if not job_resume_version:
                job_resume_version = JobResumeVersion(
                    job_description_id=jd.id,
                    resume_id=resume.id,
                    resume_version_id=resolved_resume_version_id,
                )
                db.add(job_resume_version)

            job_resume_version.resume_name = resume.name
            job_resume_version.resume_version_label = resume_version_label
            job_resume_version.ats_score = final_score
            job_resume_version.keyword_coverage = (
                float(keyword_coverage) if keyword_coverage is not None else None
            )
            job_resume_version.matched_keywords = matched_kw
            job_resume_version.missing_keywords = missing_kw
        except Exception as link_error:
            logger.error(
                f"create_match: Failed to upsert job resume version: {link_error}",
                exc_info=True,
            )
            job_resume_version = None

        ms = MatchSession(
            user_id=resume.user_id,
            resume_id=resume.id,
            job_description_id=jd.id,
            score=final_score,  # Use ATS score
            keyword_coverage=(
                float(keyword_coverage)
                if keyword_coverage is not None
                else (
                    float(breakdown.get("keyword_coverage", 0.0))
                    if breakdown.get("keyword_coverage") is not None
                    else 0.0
                )
            ),
            matched_keywords=matched_kw,
            missing_keywords=missing_kw,
            excess_keywords=[],  # Empty list for now
        )
        db.add(ms)
        db.commit()
        db.refresh(ms)
        if job_resume_version:
            db.refresh(job_resume_version)

        logger.info(
            f"create_match: Successfully created match session {ms.id} with score {ms.score}"
        )
        response_payload = {
            "id": ms.id,
            "job_resume_version_id": (
                job_resume_version.id if job_resume_version else None
            ),
            "resume_id": resume.id,
            "resume_version_id": resolved_resume_version_id,
            "ats_score": final_score,
            "keyword_coverage": (
                float(keyword_coverage) if keyword_coverage is not None else None
            ),
        }
        response_payload.update(breakdown)
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to create match")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_match(match_id: int, db: Session):
    """Get a match session by ID"""
    ms = db.query(MatchSession).filter(MatchSession.id == match_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Match not found")
    return {
        "id": ms.id,
        "resume_id": ms.resume_id,
        "job_description_id": ms.job_description_id,
        "score": ms.score,
        "keyword_coverage": ms.keyword_coverage,
        "matched_keywords": ms.matched_keywords,
        "missing_keywords": ms.missing_keywords,
        "excess_keywords": ms.excess_keywords,
        "created_at": ms.created_at.isoformat(),
    }
"""HTTP routes for managing saved jobs."""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.firebase_auth import require_firebase_user
from app.core.db import get_db
from app.domain.jobs.models import Job, JobBase, JobCreate
from app.domain.jobs.services import JobService
from app.models.user import User

# jobs_router already defined above - all jobs endpoints use jobs_router


class JobCreateRequest(JobBase):
    """Payload for creating a job entry."""

    pass


def _resolve_user_id(session: Session, firebase_user: Dict[str, str]) -> int:
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


@jobs_router.post(
    "",
    response_model=Job,
    status_code=status.HTTP_201_CREATED,
    summary="Save a job description",
)
def create_job(
    payload: JobCreateRequest,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Job:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    job = service.create_job(
        JobCreate(
            user_id=user_id,
            title=payload.title,
            company=payload.company,
            description=payload.description,
            url=payload.url,
            skills=payload.skills,
        )
    )
    return job


@jobs_router.get(
    "",
    response_model=List[Job],
    summary="List jobs saved by the authenticated user",
)
def list_jobs(
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> List[Job]:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    return service.list_jobs(user_id)


@jobs_router.get(
    "/{job_id}",
    response_model=Job,
    summary="Retrieve a saved job by id",
)
def get_job(
    job_id: int,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Job:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    job = service.get_job(job_id, user_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@jobs_router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved job",
)
def delete_job(
    job_id: int,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Response:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    removed = service.delete_job(job_id, user_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)










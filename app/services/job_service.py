"""Job description service - CRUD operations"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from app.core.dependencies import keyword_extractor
from app.models import JobDescription, JobCoverLetter, JobResumeVersion, User
from app.utils.job_helpers import (
    _classify_priority_keywords,
    _determine_final_job_title,
    _normalize_json_field,
    safe_get_job_description,
)

logger = logging.getLogger(__name__)


def create_or_update_job_description(
    payload: Dict[str, Any], db: Session
) -> Dict[str, Any]:
    """Create or update a job description"""
    try:
        from app.api.models import JobDescriptionCreate

        # Convert dict to JobDescriptionCreate if needed
        if isinstance(payload, dict):
            # Create a JobDescriptionCreate-like object
            class JobDescriptionCreateWrapper:
                def __init__(self, data: Dict):
                    for key, value in data.items():
                        setattr(self, key, value)

            payload = JobDescriptionCreateWrapper(payload)

        user = None
        if hasattr(payload, "user_email") and payload.user_email:
            user = db.query(User).filter(User.email == payload.user_email).first()

        jd = None
        if hasattr(payload, "id") and payload.id:
            jd, _ = safe_get_job_description(payload.id, db)
            if not jd:
                raise HTTPException(
                    status_code=404, detail="Job description not found"
                )
        else:
            jd = JobDescription()

        # Check if new columns exist in database
        new_columns_exist = False
        try:
            result = db.execute(
                text(
                    """
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'job_descriptions' 
                AND column_name IN ('max_salary', 'status', 'follow_up_date', 'important_emoji', 'notes')
            """
                )
            )
            count = result.fetchone()[0]
            new_columns_exist = count == 5
        except Exception as check_error:
            logger.warning(
                f"Could not check for new columns: {check_error}, using fallback method"
            )
            new_columns_exist = False

        precomputed_extracted = _normalize_json_field(
            getattr(payload, "extracted_keywords", None)
        )
        if precomputed_extracted:
            extracted = precomputed_extracted
        else:
            extracted = keyword_extractor.extract_keywords(
                getattr(payload, "content", "")
            )

        extracted_dict = extracted if isinstance(extracted, dict) else {}

        final_title = _determine_final_job_title(
            getattr(payload, "title", None),
            getattr(payload, "content", ""),
            extracted_dict,
        )
        if not final_title or not final_title.strip():
            raise HTTPException(
                status_code=400, detail="Unable to determine job title"
            )
        final_title = final_title.strip()

        precomputed_priority = _normalize_json_field(
            getattr(payload, "priority_keywords", None)
        )
        if precomputed_priority:
            if isinstance(precomputed_priority, dict):
                priority_list = [str(v) for v in precomputed_priority.values() if v]
            elif isinstance(precomputed_priority, list):
                priority_list = [str(v) for v in precomputed_priority if v]
            else:
                priority_list = []
        else:
            priority_list = (
                _classify_priority_keywords(extracted_dict).get("high_priority", [])
                if extracted_dict
                else []
            )

        soft_skills_list = list(getattr(payload, "soft_skills", []) or [])
        if not soft_skills_list and isinstance(extracted_dict, dict):
            soft_skills_list = extracted_dict.get("soft_skills", []) or []

        high_frequency_raw = _normalize_json_field(
            getattr(payload, "high_frequency_keywords", None)
        )
        if high_frequency_raw is None and isinstance(extracted_dict, dict):
            high_frequency_raw = extracted_dict.get("high_frequency_keywords")
        if isinstance(high_frequency_raw, list):
            high_frequency_list = high_frequency_raw
        elif isinstance(high_frequency_raw, dict):
            high_frequency_list = list(high_frequency_raw.values())
        else:
            high_frequency_list = []

        ats_insights_raw = _normalize_json_field(
            getattr(payload, "ats_insights", None)
        )
        if ats_insights_raw is None and isinstance(extracted_dict, dict):
            ats_insights_raw = extracted_dict.get("ats_keywords", {})
        ats_insights_dict = (
            ats_insights_raw if isinstance(ats_insights_raw, dict) else {}
        )

        # If new columns don't exist, use raw SQL
        if not new_columns_exist:
            # Handle UPDATE case
            if jd and jd.id:
                logger.info(
                    "New columns don't exist, using raw SQL update method"
                )
                try:
                    update_sql = text(
                        """
                        UPDATE job_descriptions 
                        SET user_id = :user_id, title = :title, company = :company, source = :source, 
                            url = :url, easy_apply_url = :easy_apply_url, location = :location, 
                            work_type = :work_type, job_type = :job_type, content = :content,
                            extracted_keywords = :extracted_keywords, priority_keywords = :priority_keywords,
                            soft_skills = :soft_skills, high_frequency_keywords = :high_frequency_keywords,
                            ats_insights = :ats_insights
                        WHERE id = :jd_id
                    """
                    )

                    db.execute(
                        update_sql,
                        {
                            "user_id": user.id if user else None,
                            "title": final_title,
                            "company": getattr(payload, "company", None),
                            "source": getattr(payload, "source", None),
                            "url": getattr(payload, "url", None),
                            "easy_apply_url": getattr(
                                payload, "easy_apply_url", None
                            ),
                            "location": getattr(payload, "location", None),
                            "work_type": getattr(payload, "work_type", None),
                            "job_type": getattr(payload, "job_type", None),
                            "content": getattr(payload, "content", ""),
                            "extracted_keywords": (
                                json.dumps(extracted_dict)
                                if extracted_dict
                                else json.dumps({})
                            ),
                            "priority_keywords": (
                                json.dumps(priority_list)
                                if priority_list
                                else json.dumps([])
                            ),
                            "soft_skills": (
                                json.dumps(soft_skills_list)
                                if soft_skills_list
                                else json.dumps([])
                            ),
                            "high_frequency_keywords": (
                                json.dumps(high_frequency_list)
                                if high_frequency_list
                                else json.dumps([])
                            ),
                            "ats_insights": (
                                json.dumps(ats_insights_dict)
                                if ats_insights_dict
                                else json.dumps({})
                            ),
                            "jd_id": jd.id,
                        },
                    )
                    db.commit()
                    logger.info(
                        f"Successfully updated job description {jd.id} using fallback method"
                    )
                    return {
                        "id": jd.id,
                        "message": "saved",
                        "extracted": extracted_dict,
                        "priority_keywords": priority_list,
                    }
                except Exception as update_error:
                    db.rollback()
                    logger.error(f"Fallback update failed: {update_error}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to update job description: {str(update_error)}",
                    )
            # Handle INSERT case
            logger.info("New columns don't exist, using raw SQL insert method")
            try:
                insert_sql = text(
                    """
                    INSERT INTO job_descriptions 
                    (user_id, title, company, source, url, easy_apply_url, location, work_type, job_type, content, 
                     extracted_keywords, priority_keywords, soft_skills, high_frequency_keywords, ats_insights, created_at)
                    VALUES 
                    (:user_id, :title, :company, :source, :url, :easy_apply_url, :location, :work_type, :job_type, :content,
                     :extracted_keywords, :priority_keywords, :soft_skills, :high_frequency_keywords, :ats_insights, :created_at)
                    RETURNING id
                """
                )

                result = db.execute(
                    insert_sql,
                    {
                        "user_id": user.id if user else None,
                        "title": final_title,
                        "company": getattr(payload, "company", None),
                        "source": getattr(payload, "source", None),
                        "url": getattr(payload, "url", None),
                        "easy_apply_url": getattr(payload, "easy_apply_url", None),
                        "location": getattr(payload, "location", None),
                        "work_type": getattr(payload, "work_type", None),
                        "job_type": getattr(payload, "job_type", None),
                        "content": getattr(payload, "content", ""),
                        "extracted_keywords": (
                            json.dumps(extracted_dict)
                            if extracted_dict
                            else json.dumps({})
                        ),
                        "priority_keywords": (
                            json.dumps(priority_list)
                            if priority_list
                            else json.dumps([])
                        ),
                        "soft_skills": (
                            json.dumps(soft_skills_list)
                            if soft_skills_list
                            else json.dumps([])
                        ),
                        "high_frequency_keywords": (
                            json.dumps(high_frequency_list)
                            if high_frequency_list
                            else json.dumps([])
                        ),
                        "ats_insights": (
                            json.dumps(ats_insights_dict)
                            if ats_insights_dict
                            else json.dumps({})
                        ),
                        "created_at": datetime.utcnow(),
                    },
                )
                jd_id = result.fetchone()[0]
                db.commit()
                logger.info(
                    f"Successfully saved job description {jd_id} using fallback method"
                )
                return {
                    "id": jd_id,
                    "message": "saved",
                    "extracted": extracted_dict,
                    "priority_keywords": priority_list,
                }
            except Exception as fallback_error:
                db.rollback()
                logger.error(f"Fallback insert failed: {fallback_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save job description: {str(fallback_error)}",
                )

        # New columns exist - use normal SQLAlchemy
        jd.user_id = user.id if user else None
        jd.title = final_title
        jd.company = getattr(payload, "company", None)
        jd.source = getattr(payload, "source", None)
        jd.url = getattr(payload, "url", None)
        jd.easy_apply_url = getattr(payload, "easy_apply_url", None)
        jd.location = getattr(payload, "location", None)
        jd.work_type = getattr(payload, "work_type", None)
        jd.job_type = getattr(payload, "job_type", None)
        jd.content = getattr(payload, "content", "")
        jd.extracted_keywords = extracted_dict or {}
        jd.priority_keywords = priority_list or []
        jd.soft_skills = soft_skills_list or []
        jd.high_frequency_keywords = high_frequency_list or []
        jd.ats_insights = ats_insights_dict or {}
        jd.max_salary = getattr(payload, "max_salary", None)
        jd.status = getattr(payload, "status", "bookmarked")
        jd.follow_up_date = getattr(payload, "follow_up_date", None)
        jd.important_emoji = getattr(payload, "important_emoji", None)
        jd.notes = getattr(payload, "notes", None)

        db.add(jd)
        db.commit()
        db.refresh(jd)
        return {
            "id": jd.id,
            "message": "saved",
            "extracted": extracted_dict,
            "priority_keywords": jd.priority_keywords,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to save job description")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def list_user_job_descriptions(
    user_email: Optional[str], db: Session
) -> List[Dict[str, Any]]:
    """List job descriptions for a user"""
    try:
        # Check if new columns exist
        try:
            result = db.execute(
                text(
                    """
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'job_descriptions' 
                AND column_name IN ('max_salary', 'status', 'follow_up_date', 'important_emoji', 'notes')
            """
                )
            )
            count = result.fetchone()[0]
            new_columns_exist = count == 5
        except:
            new_columns_exist = False

        if new_columns_exist:
            # Columns exist - use normal SQLAlchemy query
            q = db.query(JobDescription)
            if user_email:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    q = q.filter(
                        or_(
                            JobDescription.user_id == user.id,
                            JobDescription.user_id.is_(None),
                        )
                    )
                else:
                    q = q.filter(JobDescription.user_id.is_(None))
            items = q.order_by(JobDescription.created_at.desc()).limit(100).all()
        else:
            # Columns don't exist - use raw SQL query
            sql = """
                SELECT id, user_id, title, company, source, url, easy_apply_url, location, 
                       work_type, job_type, content, extracted_keywords, priority_keywords, 
                       soft_skills, high_frequency_keywords, ats_insights, created_at
                FROM job_descriptions
            """
            params = {}
            if user_email:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    sql += " WHERE (user_id = :user_id OR user_id IS NULL)"
                    params["user_id"] = user.id
                else:
                    sql += " WHERE user_id IS NULL"
            sql += " ORDER BY created_at DESC LIMIT 100"

            result = db.execute(text(sql), params)
            rows = result.fetchall()
            items = []
            for row in rows:
                jd = JobDescription()
                jd.id = row[0]
                jd.user_id = row[1]
                jd.title = row[2] or ""
                jd.company = row[3]
                jd.source = row[4]
                jd.url = row[5]
                jd.easy_apply_url = row[6]
                jd.location = row[7]
                jd.work_type = row[8]
                jd.job_type = row[9]
                jd.content = row[10] or ""
                jd.extracted_keywords = row[11]
                jd.priority_keywords = row[12]
                jd.soft_skills = row[13]
                jd.high_frequency_keywords = row[14]
                jd.ats_insights = row[15]
                jd.created_at = row[16]
                jd.max_salary = None
                jd.status = "bookmarked"
                jd.follow_up_date = None
                jd.important_emoji = None
                jd.notes = None
                items.append(jd)

        job_ids = [it.id for it in items if getattr(it, "id", None)]
        resume_links_map: Dict[int, List[JobResumeVersion]] = {}
        if job_ids:
            try:
                resume_links = (
                    db.query(JobResumeVersion)
                    .filter(JobResumeVersion.job_description_id.in_(job_ids))
                    .order_by(
                        JobResumeVersion.updated_at.desc().nullslast(),
                        JobResumeVersion.ats_score.desc().nullslast(),
                    )
                    .all()
                )
                for link in resume_links:
                    resume_links_map.setdefault(link.job_description_id, []).append(
                        link
                    )
            except Exception as e:
                logger.warning(
                    f"Failed to load resume links for jobs: {e}", exc_info=True
                )

        result = []
        for it in items:
            try:
                priority_kw = it.priority_keywords
                if priority_kw is not None:
                    if isinstance(priority_kw, str):
                        try:
                            priority_kw = json.loads(priority_kw)
                        except Exception:
                            priority_kw = []
                    elif not isinstance(priority_kw, list):
                        priority_kw = []

                resume_links = resume_links_map.get(it.id, [])
                resume_versions_payload: List[Dict[str, Any]] = []
                best_link_payload: Optional[Dict[str, Any]] = None
                for link in resume_links:
                    link_payload = {
                        "id": link.id,
                        "score": link.ats_score or 0,
                        "resume_id": link.resume_id,
                        "resume_name": link.resume_name,
                        "resume_version_id": link.resume_version_id,
                        "resume_version_label": link.resume_version_label,
                        "keyword_coverage": link.keyword_coverage,
                        "matched_keywords": link.matched_keywords or [],
                        "missing_keywords": link.missing_keywords or [],
                        "created_at": (
                            link.created_at.isoformat() if link.created_at else None
                        ),
                        "updated_at": (
                            link.updated_at.isoformat() if link.updated_at else None
                        ),
                    }
                    resume_versions_payload.append(link_payload)
                    if not best_link_payload or (link_payload["score"] or 0) > (
                        best_link_payload["score"] or 0
                    ):
                        best_link_payload = link_payload

                item_data = {
                    "id": it.id,
                    "title": it.title or "",
                    "company": it.company or "",
                    "source": it.source or "",
                    "url": it.url or "",
                    "easy_apply_url": it.easy_apply_url or "",
                    "location": it.location or "",
                    "work_type": it.work_type or "",
                    "job_type": it.job_type or "",
                    "created_at": (
                        it.created_at.isoformat() if it.created_at else None
                    ),
                    "priority_keywords": priority_kw or [],
                    "soft_skills": it.soft_skills or [],
                    "high_frequency_keywords": it.high_frequency_keywords or [],
                    "ats_insights": it.ats_insights or {},
                    "max_salary": getattr(it, "max_salary", None),
                    "status": getattr(it, "status", "bookmarked"),
                    "follow_up_date": getattr(it, "follow_up_date", None),
                    "important_emoji": getattr(it, "important_emoji", None),
                    "notes": getattr(it, "notes", None),
                    "best_resume_version": best_link_payload,
                    "resume_versions": resume_versions_payload,
                    "last_match": best_link_payload,
                    "all_matches": resume_versions_payload,
                }

                result.append(item_data)
            except Exception as e:
                logger.error(f"Error processing JD {it.id}: {e}", exc_info=True)
                result.append(
                    {
                        "id": it.id,
                        "title": it.title or "",
                        "company": it.company or "",
                        "source": it.source or "",
                        "url": it.url or "",
                        "easy_apply_url": it.easy_apply_url or "",
                        "location": it.location or "",
                        "work_type": it.work_type or "",
                        "job_type": it.job_type or "",
                        "created_at": (
                            it.created_at.isoformat() if it.created_at else None
                        ),
                        "priority_keywords": [],
                        "soft_skills": [],
                        "high_frequency_keywords": [],
                        "ats_insights": {},
                        "max_salary": getattr(it, "max_salary", None),
                        "status": getattr(it, "status", "bookmarked"),
                        "follow_up_date": getattr(it, "follow_up_date", None),
                        "important_emoji": getattr(it, "important_emoji", None),
                        "notes": getattr(it, "notes", None),
                        "best_resume_version": None,
                        "resume_versions": [],
                        "last_match": None,
                        "all_matches": [],
                    }
                )

        return result
    except Exception as e:
        logger.exception("Failed to list job descriptions")
        raise HTTPException(status_code=500, detail=str(e))


def _cover_letter_to_dict(letter: JobCoverLetter) -> Dict[str, Any]:
    """Convert JobCoverLetter model to dictionary"""
    return {
        "id": letter.id,
        "job_description_id": letter.job_description_id,
        "title": letter.title,
        "content": letter.content,
        "version_number": letter.version_number,
        "created_at": letter.created_at.isoformat() if letter.created_at else None,
        "updated_at": letter.updated_at.isoformat() if letter.updated_at else None,
    }


def list_cover_letters(jd_id: int, db: Session) -> List[Dict[str, Any]]:
    """List all cover letters for a job description"""
    jd, _ = safe_get_job_description(jd_id, db)
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    letters = (
        db.query(JobCoverLetter)
        .filter(JobCoverLetter.job_description_id == jd_id)
        .order_by(JobCoverLetter.created_at.desc())
        .all()
    )
    return [_cover_letter_to_dict(letter) for letter in letters]


def create_cover_letter(
    jd_id: int, payload: Dict[str, Any], db: Session
) -> Dict[str, Any]:
    """Create a new cover letter for a job description"""
    jd, _ = safe_get_job_description(jd_id, db)
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    latest_letter = (
        db.query(JobCoverLetter)
        .filter(JobCoverLetter.job_description_id == jd_id)
        .order_by(JobCoverLetter.version_number.desc())
        .first()
    )
    next_version = (latest_letter.version_number + 1) if latest_letter else 1
    letter = JobCoverLetter(
        job_description_id=jd_id,
        title=payload.get("title", "").strip() if payload.get("title") else "Cover Letter",
        content=payload.get("content", "").strip(),
        version_number=next_version,
    )
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return _cover_letter_to_dict(letter)


def update_cover_letter(
    jd_id: int, letter_id: int, payload: Dict[str, Any], db: Session
) -> Dict[str, Any]:
    """Update a cover letter"""
    jd, _ = safe_get_job_description(jd_id, db)
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    letter = (
        db.query(JobCoverLetter)
        .filter(
            JobCoverLetter.id == letter_id, JobCoverLetter.job_description_id == jd_id
        )
        .first()
    )
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    if payload.get("title") is not None:
        letter.title = payload.get("title", "").strip() if payload.get("title") else letter.title
    if payload.get("content") is not None:
        letter.content = payload.get("content", "").strip()
    db.commit()
    db.refresh(letter)
    return _cover_letter_to_dict(letter)


def delete_cover_letter(jd_id: int, letter_id: int, db: Session) -> Dict[str, Any]:
    """Delete a cover letter"""
    jd, _ = safe_get_job_description(jd_id, db)
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    letter = (
        db.query(JobCoverLetter)
        .filter(
            JobCoverLetter.id == letter_id, JobCoverLetter.job_description_id == jd_id
        )
        .first()
    )
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    db.delete(letter)
    db.commit()
    return {"success": True, "id": letter_id}


def get_job_description_detail(
    jd_id: int, user_email: Optional[str], db: Session
) -> Dict[str, Any]:
    """Get a specific job description"""
    jd, _ = safe_get_job_description(jd_id, db)
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    # Handle JSON fields safely
    extracted_kw = jd.extracted_keywords
    if isinstance(extracted_kw, str):
        try:
            extracted_kw = json.loads(extracted_kw)
        except:
            extracted_kw = {}
    elif extracted_kw is None:
        extracted_kw = {}

    priority_kw = jd.priority_keywords
    if isinstance(priority_kw, str):
        try:
            priority_kw = json.loads(priority_kw)
        except:
            priority_kw = []
    elif priority_kw is None:
        priority_kw = []

    return {
        "id": jd.id,
        "title": jd.title or "",
        "company": jd.company or "",
        "source": jd.source or "",
        "url": jd.url or "",
        "easy_apply_url": jd.easy_apply_url or "",
        "location": jd.location or "",
        "work_type": jd.work_type or "",
        "job_type": jd.job_type or "",
        "content": jd.content or "",
        "extracted_keywords": extracted_kw,
        "priority_keywords": priority_kw,
        "soft_skills": jd.soft_skills or [],
        "high_frequency_keywords": jd.high_frequency_keywords or [],
        "ats_insights": jd.ats_insights or {},
        "created_at": jd.created_at.isoformat() if jd.created_at else None,
        "max_salary": getattr(jd, "max_salary", None),
        "status": getattr(jd, "status", "bookmarked"),
        "follow_up_date": getattr(jd, "follow_up_date", None),
        "important_emoji": getattr(jd, "important_emoji", None),
        "notes": getattr(jd, "notes", None),
    }


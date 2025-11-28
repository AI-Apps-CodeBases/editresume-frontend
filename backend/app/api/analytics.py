"""Analytics API endpoints - migrated from legacy_app.py"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import ExportAnalytics, JobMatch, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/exports")
async def get_export_analytics(user_email: str, db: Session = Depends(get_db)):
    """Get export analytics for a user"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get export analytics
        exports = (
            db.query(ExportAnalytics)
            .filter(ExportAnalytics.user_id == user.id)
            .order_by(ExportAnalytics.created_at.desc())
            .all()
        )

        # Get summary statistics
        total_exports = len(exports)
        pdf_exports = len([e for e in exports if e.export_format == "pdf"])
        docx_exports = len([e for e in exports if e.export_format == "docx"])

        # Get template usage
        template_usage = {}
        for export in exports:
            template = export.template_used or "unknown"
            template_usage[template] = template_usage.get(template, 0) + 1

        # Get recent exports (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_exports = [e for e in exports if e.created_at >= thirty_days_ago]

        return {
            "success": True,
            "analytics": {
                "total_exports": total_exports,
                "pdf_exports": pdf_exports,
                "docx_exports": docx_exports,
                "recent_exports": len(recent_exports),
                "template_usage": template_usage,
                "exports": [
                    {
                        "id": e.id,
                        "format": e.export_format,
                        "template": e.template_used,
                        "file_size": e.file_size,
                        "success": e.export_success,
                        "created_at": e.created_at.isoformat(),
                        "resume_name": e.resume.name if e.resume else "Unknown",
                    }
                    for e in exports[:50]  # Last 50 exports
                ],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting export analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get export analytics")


@router.get("/job-matches")
async def get_job_match_analytics(user_email: str, db: Session = Depends(get_db)):
    """Get job match analytics for a user"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get job matches
        job_matches = (
            db.query(JobMatch)
            .filter(JobMatch.user_id == user.id)
            .order_by(JobMatch.created_at.desc())
            .all()
        )

        # Calculate analytics
        total_matches = len(job_matches)
        if total_matches == 0:
            return {
                "success": True,
                "analytics": {
                    "total_matches": 0,
                    "average_score": 0,
                    "score_trend": [],
                    "top_missing_keywords": [],
                    "improvement_areas": [],
                    "matches": [],
                },
            }

        # Calculate average score
        average_score = sum(match.match_score for match in job_matches) / total_matches

        # Calculate score trend (last 10 matches)
        recent_matches = job_matches[:10]
        score_trend = [
            {
                "date": match.created_at.date().isoformat(),
                "score": match.match_score,
                "resume_name": match.resume.name if match.resume else "Unknown",
            }
            for match in reversed(recent_matches)
        ]

        # Get top missing keywords
        all_missing_keywords = []
        for match in job_matches:
            if match.missing_keywords:
                all_missing_keywords.extend(match.missing_keywords)

        keyword_counts = Counter(all_missing_keywords)
        top_missing_keywords = [
            {"keyword": keyword, "count": count}
            for keyword, count in keyword_counts.most_common(10)
        ]

        # Get improvement areas
        improvement_areas = []
        for match in job_matches:
            if match.improvement_suggestions:
                for suggestion in match.improvement_suggestions:
                    if isinstance(suggestion, dict) and "category" in suggestion:
                        improvement_areas.append(suggestion["category"])

        improvement_counts = Counter(improvement_areas)
        top_improvement_areas = [
            {"area": area, "count": count}
            for area, count in improvement_counts.most_common(5)
        ]

        # Get recent matches with details
        recent_matches_details = [
            {
                "id": match.id,
                "resume_name": match.resume.name if match.resume else "Unknown",
                "match_score": match.match_score,
                "keyword_matches": match.keyword_matches or [],
                "missing_keywords": match.missing_keywords or [],
                "created_at": match.created_at.isoformat(),
                "job_description_preview": (
                    match.job_description[:200] + "..."
                    if len(match.job_description) > 200
                    else match.job_description
                ),
            }
            for match in job_matches[:20]  # Last 20 matches
        ]

        return {
            "success": True,
            "analytics": {
                "total_matches": total_matches,
                "average_score": round(average_score, 1),
                "score_trend": score_trend,
                "top_missing_keywords": top_missing_keywords,
                "improvement_areas": top_improvement_areas,
                "matches": recent_matches_details,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job match analytics: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get job match analytics"
        )


@router.get("/job-matches/{match_id}")
async def get_job_match_detail(match_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific job match"""
    try:
        match = db.query(JobMatch).filter(JobMatch.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Job match not found")

        return {
            "success": True,
            "match": {
                "id": match.id,
                "resume_name": match.resume.name if match.resume else "Unknown",
                "match_score": match.match_score,
                "keyword_matches": match.keyword_matches or [],
                "missing_keywords": match.missing_keywords or [],
                "improvement_suggestions": match.improvement_suggestions or [],
                "created_at": match.created_at.isoformat(),
                "job_description": match.job_description,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job match detail: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get job match detail"
        )


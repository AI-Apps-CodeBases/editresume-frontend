"""Job description helper utilities - extracted from legacy_app.py"""

from __future__ import annotations

import html
import json
import logging
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import JobDescription

logger = logging.getLogger(__name__)


def safe_get_job_description(jd_id: int, db: Session) -> tuple[JobDescription | None, bool]:
    """Safely get job description, handling missing columns gracefully.
    Returns a tuple of (job_description, new_columns_exist_flag).
    """
    # Check if new columns exist
    try:
        result = db.execute(
            text(
                """
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'job_descriptions' 
            AND column_name IN ('max_salary', 'status', 'follow_up_date', 'importance', 'notes')
        """
            )
        )
        count = result.fetchone()[0]
        new_columns_exist = count == 5
    except:
        new_columns_exist = False

    if new_columns_exist:
        # Columns exist - use normal SQLAlchemy query
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
        return jd, True
    else:
        # Columns don't exist - use raw SQL query
        try:
            result = db.execute(
                text(
                    """
                SELECT id, user_id, title, company, source, url, easy_apply_url, location, 
                       work_type, job_type, content, extracted_keywords, priority_keywords, 
                       soft_skills, high_frequency_keywords, ats_insights, created_at
                FROM job_descriptions 
                WHERE id = :jd_id
                LIMIT 1
            """
                ),
                {"jd_id": jd_id},
            )
            row = result.fetchone()
            if not row:
                return None, False

            # Create a JobDescription-like object
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
            # New columns don't exist, so set to None/defaults
            jd.max_salary = None
            jd.status = "bookmarked"
            jd.follow_up_date = None
            jd.importance = 0
            jd.notes = None
            return jd, False
        except Exception as e:
            logger.error(f"Error in safe_get_job_description: {e}")
            return None, False


def _normalize_json_field(value: Any):
    """Normalize JSON field value"""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


GENERIC_TITLE_PATTERNS = [
    "untitled job",
    "this is a full time",
    "this is a part time",
    "this is a contractor",
    "full time",
    "part time",
    "contractor",
    "job title",
    "job description",
    "n/a",
    "not specified",
]


def _looks_generic_title(title: str) -> bool:
    """Check if title looks generic"""
    if not title:
        return True
    normalized = re.sub(r"\s+", " ", title).strip().lower()
    for pattern in GENERIC_TITLE_PATTERNS:
        if normalized == pattern or normalized.startswith(pattern):
            return True
    return False


def _clean_candidate_title(candidate: str) -> str | None:
    """Clean candidate title"""
    if not candidate:
        return None
    candidate = html.unescape(candidate)
    candidate = re.sub(r"<[^>]+>", " ", candidate)
    candidate = candidate.strip()
    candidate = re.sub(r"^[•*\-]+", "", candidate).strip()
    candidate = re.sub(
        r"^(job\s*title|title)\s*[:\-]\s*", "", candidate, flags=re.IGNORECASE
    ).strip()
    candidate = re.sub(r"\s+", " ", candidate)
    if not candidate:
        return None
    lower = candidate.lower()
    if any(
        lower.startswith(prefix)
        for prefix in [
            "company",
            "location",
            "about ",
            "description",
            "job description",
            "responsibilit",
            "requirements",
        ]
    ):
        return None
    if (
        any(
            word in lower
            for word in [
                "full time",
                "part time",
                "contract",
                "internship",
                "permanent",
            ]
        )
        and len(candidate.split()) <= 3
    ):
        return None
    if len(candidate) < 4 or len(candidate.split()) < 2 or len(candidate) > 80:
        return None
    return candidate.title() if candidate.isupper() else candidate


def _extract_title_from_extracted_keywords(extracted: dict[str, Any]) -> str | None:
    """Extract title from extracted keywords"""
    if not isinstance(extracted, dict):
        return None
    for key in ["job_title", "title", "position"]:
        value = extracted.get(key)
        if isinstance(value, str):
            cleaned = _clean_candidate_title(value)
            if cleaned:
                return cleaned
    return None


def _extract_job_title_from_content(content: str) -> str | None:
    """Extract job title from content"""
    if not content:
        return None
    text = html.unescape(content)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "\n", text)
    lines = [line.strip() for line in re.split(r"[\r\n]+", text) if line.strip()]
    for line in lines:
        cleaned = _clean_candidate_title(line)
        if cleaned:
            return cleaned
    return None


def _determine_final_job_title(
    provided_title: str | None, content: str, extracted_dict: dict[str, Any]
) -> str | None:
    """Determine final job title from multiple sources"""
    candidates: list[str] = []
    if provided_title and provided_title.strip():
        candidates.append(re.sub(r"\s+", " ", provided_title).strip())
    extracted_title = _extract_title_from_extracted_keywords(extracted_dict)
    if extracted_title:
        candidates.append(extracted_title)
    content_title = _extract_job_title_from_content(content)
    if content_title:
        candidates.append(content_title)

    for candidate in candidates:
        if candidate and not _looks_generic_title(candidate):
            return candidate

    for candidate in candidates:
        if candidate:
            return candidate

    return None


def _classify_priority_keywords(extracted: dict[str, Any]) -> dict[str, list[str]]:
    """Classify keywords by priority"""
    keyword_freq: dict[str, int] = (
        extracted.get("keyword_frequency", {}) if isinstance(extracted, dict) else {}
    )
    technical = (
        set(extracted.get("technical_keywords", []))
        if isinstance(extracted, dict)
        else set()
    )
    high_priority: list[str] = []
    regular: list[str] = []
    for kw, cnt in keyword_freq.items():
        if cnt >= 3 or kw in technical:
            high_priority.append(kw)
        else:
            regular.append(kw)
    return {
        "high_priority": sorted(set(high_priority)),
        "regular": sorted(set(regular)),
    }


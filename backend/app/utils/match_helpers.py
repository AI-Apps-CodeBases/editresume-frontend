"""Match helper utilities - extracted from legacy_app.py"""

from __future__ import annotations

from typing import Any

logger = None
try:
    import logging
    logger = logging.getLogger(__name__)
except:
    pass


def _get_keyword_extractor():
    """Lazy import to avoid circular dependencies"""
    from app.core.dependencies import keyword_extractor
    return keyword_extractor


def _get_classify_priority_keywords():
    """Lazy import to avoid circular dependencies"""
    from app.utils.job_helpers import _classify_priority_keywords
    return _classify_priority_keywords


def _resume_to_text(resume_data: dict[str, Any]) -> str:
    """Convert resume data dictionary to plain text"""
    parts: list[str] = []
    for key in ["name", "title", "summary", "email", "phone", "location"]:
        val = resume_data.get(key)
        if isinstance(val, str):
            parts.append(val)
    for section in resume_data.get("sections", []) or []:
        parts.append(section.get("title", ""))
        for b in section.get("bullets", []) or []:
            txt = b.get("text") if isinstance(b, dict) else None
            if txt:
                parts.append(txt)
    return "\n".join([p for p in parts if p])


def _compute_match_breakdown(
    jd_text: str, resume_text: str, extracted_jd: dict[str, Any]
) -> dict[str, Any]:
    """Compute match breakdown between job description and resume"""
    keyword_extractor = _get_keyword_extractor()
    _classify_priority_keywords = _get_classify_priority_keywords()

    similarity = keyword_extractor.calculate_similarity(jd_text, resume_text)
    hp = set(_classify_priority_keywords(extracted_jd)["high_priority"])
    matched = set(similarity["matching_keywords"])
    missing = set(similarity["missing_keywords"])

    total = len(hp) * 2 + max(1, similarity.get("total_job_keywords", 0) - len(hp))
    score = 0
    for kw in matched:
        score += 2 if kw in hp else 1
    critical_misses = len([k for k in missing if k in hp])
    score -= critical_misses
    score_pct = max(0, min(100, int(round((score / max(1, total)) * 100))))

    return {
        "score": score_pct,
        "matched_keywords": sorted(list(matched)),
        "missing_keywords": sorted(list(missing)),
        "priority_keywords": sorted(list(hp)),
        "keyword_coverage": round(
            (len(matched) / max(1, similarity.get("total_job_keywords", 0))) * 100, 2
        ),
        "similarity": similarity,
    }


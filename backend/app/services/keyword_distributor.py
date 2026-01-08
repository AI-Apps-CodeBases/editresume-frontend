"""Utility for distributing keywords across resume sections."""

from __future__ import annotations

from typing import Any


def categorize_keywords(
    keywords: list[str], job_description: str
) -> dict[str, list[str]]:
    """Categorize keywords into skills, experience-related, and summary-worthy."""
    job_lower = job_description.lower()
    skills_keywords: list[str] = []
    experience_keywords: list[str] = []
    summary_keywords: list[str] = []

    technical_indicators = [
        "language",
        "framework",
        "tool",
        "platform",
        "software",
        "system",
        "database",
        "api",
        "cloud",
        "devops",
        "methodology",
        "certification",
    ]

    action_indicators = [
        "managed",
        "led",
        "developed",
        "implemented",
        "designed",
        "built",
        "created",
        "improved",
        "optimized",
        "achieved",
        "delivered",
        "executed",
    ]

    for keyword in keywords:
        if not keyword or len(keyword.strip()) < 2:
            continue

        kw_lower = keyword.lower()
        is_technical = any(ind in kw_lower for ind in technical_indicators)
        is_action = any(ind in kw_lower for ind in action_indicators)

        if is_technical or (
            kw_lower in job_lower
            and len(kw_lower.split()) <= 2
            and not is_action
        ):
            skills_keywords.append(keyword)
        elif is_action or len(kw_lower.split()) > 2:
            experience_keywords.append(keyword)
        else:
            summary_keywords.append(keyword)

    return {
        "skills": list(set(skills_keywords)),
        "experience": list(set(experience_keywords)),
        "summary": list(set(summary_keywords)),
    }


def distribute_keywords_to_sections(
    missing_keywords: list[str],
    resume_data: dict[str, Any],
    job_description: str,
) -> dict[str, Any]:
    """Distribute missing keywords across appropriate resume sections."""
    categorized = categorize_keywords(missing_keywords, job_description)

    distribution = {
        "summary_keywords": categorized["summary"][:10],
        "experience_keywords": categorized["experience"],
        "skill_keywords": categorized["skills"],
        "section_mapping": {},
    }

    sections = resume_data.get("sections", []) or []
    experience_sections = []
    skills_sections = []

    for section in sections:
        if not isinstance(section, dict):
            continue
        title_lower = (section.get("title") or "").lower()
        if any(
            term in title_lower
            for term in ["experience", "work", "employment", "professional"]
        ):
            experience_sections.append(section)
        elif "skill" in title_lower:
            skills_sections.append(section)

    for idx, exp_section in enumerate(experience_sections):
        keywords_per_section = len(categorized["experience"]) // max(
            len(experience_sections), 1
        )
        start_idx = idx * keywords_per_section
        end_idx = (
            start_idx + keywords_per_section
            if idx < len(experience_sections) - 1
            else len(categorized["experience"])
        )
        distribution["section_mapping"][idx] = categorized["experience"][
            start_idx:end_idx
        ]

    return distribution


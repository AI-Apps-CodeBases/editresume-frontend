"""Keyword-based ATS rules."""

from __future__ import annotations

import re
from typing import Any

from app.domain.ats_rules.models import ATSRule, ImpactType, RuleType


def _extract_keywords_from_text(text: str) -> set[str]:
    """Extract keywords from text."""
    if not text:
        return set()
    # Extract words (including technical terms with numbers/special chars)
    word_pattern = r'\b[a-zA-Z0-9][a-zA-Z0-9+/#.-]*[a-zA-Z]|[a-zA-Z][a-zA-Z0-9+/#.-]*[a-zA-Z0-9]|[a-zA-Z]{2,}\b'
    tokens = re.findall(word_pattern, text.lower())
    # Filter and clean
    keywords = set()
    for token in tokens:
        cleaned = token.strip('.,!?;:"()[]{}')
        if len(cleaned) >= 2 and re.search(r'[a-zA-Z]', cleaned) and not re.match(r'^\d+$', cleaned):
            keywords.add(cleaned)
    return keywords


def _get_resume_text(resume_data: dict[str, Any]) -> str:
    """Extract text content from resume data."""
    text_parts = []
    
    # Add header fields
    if resume_data.get("name"):
        text_parts.append(str(resume_data["name"]))
    if resume_data.get("title"):
        text_parts.append(str(resume_data["title"]))
    if resume_data.get("summary"):
        text_parts.append(str(resume_data["summary"]))
    
    # Add section content
    sections = resume_data.get("sections", [])
    for section in sections:
        if isinstance(section, dict):
            title = section.get("title", "")
            if title:
                text_parts.append(title)
            
            bullets = section.get("bullets", [])
            for bullet in bullets:
                if isinstance(bullet, dict):
                    bullet_text = bullet.get("text", "")
                    # Skip hidden bullets
                    if bullet.get("params", {}).get("visible") is not False:
                        text_parts.append(bullet_text)
                elif isinstance(bullet, str):
                    text_parts.append(bullet)
    
    return " ".join(text_parts).lower()


def _get_high_importance_keywords(job_description: str | None, context: dict[str, Any]) -> set[str]:
    """Extract high-importance keywords from job description or context."""
    keywords = set()
    
    # Check context for extracted keywords with importance
    extracted_keywords = context.get("extracted_keywords", {})
    if extracted_keywords:
        high_freq_keywords = extracted_keywords.get("high_frequency_keywords", [])
        for kw_item in high_freq_keywords:
            if isinstance(kw_item, dict):
                importance = kw_item.get("importance", "").lower()
                if importance == "high":
                    keywords.add(kw_item.get("keyword", "").lower())
            elif isinstance(kw_item, str):
                keywords.add(kw_item.lower())
        
        # Also check technical keywords
        technical_keywords = extracted_keywords.get("technical_keywords", [])
        for kw in technical_keywords:
            if isinstance(kw, str):
                keywords.add(kw.lower())
            elif isinstance(kw, dict):
                keywords.add(kw.get("keyword", "").lower())
    
    # Extract from job description if available
    if job_description:
        jd_keywords = _extract_keywords_from_text(job_description)
        # Prioritize longer, more specific keywords
        for kw in jd_keywords:
            if len(kw) >= 4:  # Focus on meaningful keywords
                keywords.add(kw)
    
    return keywords


def _check_keyword_in_summary(resume_data: dict[str, Any], keyword: str) -> bool:
    """Check if keyword appears in summary section."""
    summary = resume_data.get("summary", "").lower()
    return keyword.lower() in summary


def _check_keyword_in_experience(resume_data: dict[str, Any], keyword: str) -> bool:
    """Check if keyword appears in experience sections."""
    sections = resume_data.get("sections", [])
    for section in sections:
        if isinstance(section, dict):
            title = section.get("title", "").lower()
            if "experience" in title or "work" in title or "employment" in title:
                bullets = section.get("bullets", [])
                for bullet in bullets:
                    if isinstance(bullet, dict):
                        bullet_text = bullet.get("text", "").lower()
                    elif isinstance(bullet, str):
                        bullet_text = bullet.lower()
                    else:
                        continue
                    if keyword.lower() in bullet_text:
                        return True
    return False


def get_keyword_rules() -> list[ATSRule]:
    """Get all keyword-based rules."""
    rules = []

    # Rule 1: Required Keywords Missing
    def check_required_keywords_missing(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if high-importance keywords are missing."""
        high_importance_keywords = _get_high_importance_keywords(job_description, context)
        if not high_importance_keywords:
            return False  # No keywords to check
        
        resume_text = _get_resume_text(resume_data)
        resume_keywords = _extract_keywords_from_text(resume_text)
        
        missing_count = 0
        for keyword in high_importance_keywords:
            if keyword not in resume_keywords:
                missing_count += 1
        
        # Store details for rule evaluation
        context.setdefault("rule_details", {})["keyword_required_missing"] = {
            "missing_count": missing_count,
            "total_high_importance": len(high_importance_keywords),
        }
        
        # Rule passes if missing keywords (to apply penalty)
        return missing_count > 0

    rules.append(
        ATSRule(
            id="keyword_required_missing",
            name="Required Keywords Missing",
            category=RuleType.KEYWORD,
            condition=check_required_keywords_missing,
            impact=ImpactType.PENALTY,
            base_value=-2.0,  # -2 points per missing high-importance keyword
            max_impact=-10.0,  # Cap at -10 points
            priority="high",
            description="Penalty for missing high-importance keywords from job description",
            suggestion="Add missing high-importance keywords to your resume, especially in experience sections",
        )
    )

    # Rule 2: Keyword Placement (Summary)
    def check_keyword_in_summary_rule(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if keywords appear in summary section."""
        high_importance_keywords = _get_high_importance_keywords(job_description, context)
        if not high_importance_keywords:
            return False
        
        summary = resume_data.get("summary", "").lower()
        if not summary:
            return False
        
        keywords_in_summary = sum(
            1 for kw in high_importance_keywords if kw in summary
        )
        
        context.setdefault("rule_details", {})["keyword_placement_summary"] = {
            "keywords_in_summary": keywords_in_summary,
            "total_keywords": len(high_importance_keywords),
        }
        
        return keywords_in_summary >= min(2, len(high_importance_keywords) * 0.3)

    rules.append(
        ATSRule(
            id="keyword_placement_summary",
            name="Keywords in Summary",
            category=RuleType.KEYWORD,
            condition=check_keyword_in_summary_rule,
            impact=ImpactType.BONUS,
            base_value=3.0,
            max_impact=5.0,
            priority="medium",
            description="Bonus for including keywords in summary section",
            suggestion="Include relevant keywords from the job description in your summary section",
        )
    )

    # Rule 3: Keyword Placement (Experience)
    def check_keyword_in_experience_rule(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if keywords appear in experience bullets."""
        high_importance_keywords = _get_high_importance_keywords(job_description, context)
        if not high_importance_keywords:
            return False
        
        keywords_in_experience = 0
        for keyword in high_importance_keywords:
            if _check_keyword_in_experience(resume_data, keyword):
                keywords_in_experience += 1
        
        context.setdefault("rule_details", {})["keyword_placement_experience"] = {
            "keywords_in_experience": keywords_in_experience,
            "total_keywords": len(high_importance_keywords),
        }
        
        return keywords_in_experience >= min(3, len(high_importance_keywords) * 0.5)

    rules.append(
        ATSRule(
            id="keyword_placement_experience",
            name="Keywords in Experience",
            category=RuleType.KEYWORD,
            condition=check_keyword_in_experience_rule,
            impact=ImpactType.BONUS,
            base_value=4.0,
            max_impact=8.0,
            priority="high",
            description="Bonus for including keywords in experience bullets",
            suggestion="Incorporate relevant keywords naturally into your work experience bullet points",
        )
    )

    # Rule 4: Technical Skills Coverage
    def check_technical_skills_coverage(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check coverage of technical skills from job description."""
        extracted_keywords = context.get("extracted_keywords", {})
        technical_keywords = extracted_keywords.get("technical_keywords", [])
        
        if not technical_keywords:
            return False
        
        resume_text = _get_resume_text(resume_data)
        resume_keywords = _extract_keywords_from_text(resume_text)
        
        matched_technical = sum(
            1 for tech_kw in technical_keywords
            if (tech_kw.lower() if isinstance(tech_kw, str) else tech_kw.get("keyword", "").lower()) in resume_keywords
        )
        
        coverage_percentage = (matched_technical / len(technical_keywords) * 100) if technical_keywords else 0
        
        context.setdefault("rule_details", {})["technical_skills_coverage"] = {
            "matched": matched_technical,
            "total": len(technical_keywords),
            "coverage_percentage": coverage_percentage,
        }
        
        return coverage_percentage >= 60.0

    rules.append(
        ATSRule(
            id="technical_skills_coverage",
            name="Technical Skills Coverage",
            category=RuleType.KEYWORD,
            condition=check_technical_skills_coverage,
            impact=ImpactType.BONUS,
            base_value=5.0,
            max_impact=10.0,
            priority="high",
            description="Bonus for covering 60%+ of required technical skills",
            suggestion="Add more technical skills from the job description to your resume",
        )
    )

    # Rule 5: Keyword Density (avoid overuse)
    def check_keyword_density(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if keywords are used appropriately (not overused)."""
        high_importance_keywords = _get_high_importance_keywords(job_description, context)
        if not high_importance_keywords:
            return True  # No keywords to check, rule passes
        
        resume_text = _get_resume_text(resume_data)
        words = resume_text.split()
        total_words = len(words)
        
        if total_words == 0:
            return False
        
        overused_count = 0
        for keyword in high_importance_keywords:
            keyword_count = resume_text.count(keyword.lower())
            # Check if keyword appears more than 5% of total words (overuse)
            if keyword_count > total_words * 0.05:
                overused_count += 1
        
        context.setdefault("rule_details", {})["keyword_density"] = {
            "overused_keywords": overused_count,
        }
        
        # Rule passes if no overuse (to avoid penalty)
        return overused_count == 0

    rules.append(
        ATSRule(
            id="keyword_density",
            name="Keyword Density",
            category=RuleType.KEYWORD,
            condition=check_keyword_density,
            impact=ImpactType.PENALTY,
            base_value=-1.0,
            max_impact=-3.0,
            priority="low",
            description="Penalty for keyword stuffing (overuse of keywords)",
            suggestion="Use keywords naturally throughout your resume, avoid repeating them excessively",
        )
    )

    return rules

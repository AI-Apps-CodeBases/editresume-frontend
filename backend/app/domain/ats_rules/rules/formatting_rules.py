"""Formatting-based ATS rules."""

from __future__ import annotations

import re
from typing import Any

from app.domain.ats_rules.models import ATSRule, ImpactType, RuleType


def _get_resume_text(resume_data: dict[str, Any]) -> str:
    """Extract text content from resume data."""
    text_parts = []
    
    if resume_data.get("name"):
        text_parts.append(str(resume_data["name"]))
    if resume_data.get("title"):
        text_parts.append(str(resume_data["title"]))
    if resume_data.get("summary"):
        text_parts.append(str(resume_data["summary"]))
    
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
                    if bullet.get("params", {}).get("visible") is not False:
                        text_parts.append(bullet_text)
                elif isinstance(bullet, str):
                    text_parts.append(bullet)
    
    return " ".join(text_parts)


def _estimate_resume_length(resume_data: dict[str, Any]) -> int:
    """Estimate resume length in words."""
    text = _get_resume_text(resume_data)
    words = text.split()
    return len(words)


def _check_contact_format(resume_data: dict[str, Any]) -> bool:
    """Check if contact information is properly formatted."""
    email = resume_data.get("email", "")
    phone = resume_data.get("phone", "")
    
    # Check email format
    email_valid = bool(email and re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))
    
    # Check phone format (basic check - contains digits)
    phone_valid = bool(phone and re.search(r'\d', phone))
    
    return email_valid or phone_valid


def get_formatting_rules() -> list[ATSRule]:
    """Get all formatting-based rules."""
    rules = []

    # Rule 1: Resume Length
    def check_resume_length(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume length is optimal (1-2 pages, ~400-800 words)."""
        word_count = _estimate_resume_length(resume_data)
        
        # Optimal: 400-800 words (approximately 1-2 pages)
        is_optimal = 400 <= word_count <= 800
        
        context.setdefault("rule_details", {})["resume_length"] = {
            "word_count": word_count,
            "is_optimal": is_optimal,
        }
        
        return is_optimal

    rules.append(
        ATSRule(
            id="resume_length",
            name="Resume Length",
            category=RuleType.FORMATTING,
            condition=check_resume_length,
            impact=ImpactType.BONUS,
            base_value=2.0,
            max_impact=3.0,
            priority="medium",
            description="Bonus for optimal resume length (1-2 pages, 400-800 words)",
            suggestion="Optimize resume length to 1-2 pages (approximately 400-800 words)",
        )
    )

    # Rule 2: Contact Information Format
    def check_contact_format_rule(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if contact information is properly formatted."""
        is_valid = _check_contact_format(resume_data)
        
        context.setdefault("rule_details", {})["contact_format"] = {
            "is_valid": is_valid,
            "has_email": bool(resume_data.get("email")),
            "has_phone": bool(resume_data.get("phone")),
        }
        
        return is_valid

    rules.append(
        ATSRule(
            id="contact_format",
            name="Contact Information Format",
            category=RuleType.FORMATTING,
            condition=check_contact_format_rule,
            impact=ImpactType.BONUS,
            base_value=1.0,
            max_impact=2.0,
            priority="high",
            description="Bonus for properly formatted contact information",
            suggestion="Ensure contact information (email and/or phone) is properly formatted",
        )
    )

    # Rule 3: ATS-Friendly Formatting (check for tables/graphics indicators)
    def check_ats_friendly_formatting(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume uses ATS-friendly formatting (no tables, minimal special chars)."""
        text = _get_resume_text(resume_data)
        
        # Check for table-like patterns (multiple consecutive pipes or tabs)
        has_tables = bool(re.search(r'\|{2,}|\t{2,}', text))
        
        # Check for excessive special characters that might indicate graphics
        special_char_ratio = len(re.findall(r'[^\w\s]', text)) / max(len(text), 1)
        has_excessive_special = special_char_ratio > 0.15  # More than 15% special chars
        
        is_ats_friendly = not (has_tables or has_excessive_special)
        
        context.setdefault("rule_details", {})["ats_friendly_formatting"] = {
            "is_ats_friendly": is_ats_friendly,
            "has_tables": has_tables,
            "has_excessive_special": has_excessive_special,
        }
        
        return is_ats_friendly

    rules.append(
        ATSRule(
            id="ats_friendly_formatting",
            name="ATS-Friendly Formatting",
            category=RuleType.FORMATTING,
            condition=check_ats_friendly_formatting,
            impact=ImpactType.BONUS,
            base_value=3.0,
            max_impact=5.0,
            priority="high",
            description="Bonus for ATS-friendly formatting (no tables, minimal special characters)",
            suggestion="Use plain text formatting, avoid tables and excessive special characters",
        )
    )

    # Rule 4: Summary Length
    def check_summary_length(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if summary section has appropriate length."""
        summary = resume_data.get("summary", "")
        if not summary:
            return False
        
        word_count = len(summary.split())
        # Optimal: 50-150 words
        is_optimal = 50 <= word_count <= 150
        
        context.setdefault("rule_details", {})["summary_length"] = {
            "word_count": word_count,
            "is_optimal": is_optimal,
        }
        
        return is_optimal

    rules.append(
        ATSRule(
            id="summary_length",
            name="Summary Length",
            category=RuleType.FORMATTING,
            condition=check_summary_length,
            impact=ImpactType.BONUS,
            base_value=1.0,
            max_impact=2.0,
            priority="medium",
            description="Bonus for optimal summary length (50-150 words)",
            suggestion="Optimize summary length to 50-150 words for better ATS parsing",
        )
    )

    # Rule 5: Excessive Length Penalty
    def check_excessive_length(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume is too long (penalty)."""
        word_count = _estimate_resume_length(resume_data)
        
        # Too long: > 1000 words (approximately 3+ pages)
        is_too_long = word_count > 1000
        
        context.setdefault("rule_details", {})["excessive_length"] = {
            "word_count": word_count,
            "is_too_long": is_too_long,
        }
        
        # Rule passes if NOT too long (to avoid penalty)
        return not is_too_long

    rules.append(
        ATSRule(
            id="excessive_length",
            name="Excessive Length",
            category=RuleType.FORMATTING,
            condition=check_excessive_length,
            impact=ImpactType.PENALTY,
            base_value=-2.0,
            max_impact=-4.0,
            priority="low",
            description="Penalty for resume that is too long (>1000 words, 3+ pages)",
            suggestion="Condense resume to 1-2 pages (400-800 words) for better ATS compatibility",
        )
    )

    return rules

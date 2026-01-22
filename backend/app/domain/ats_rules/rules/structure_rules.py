"""Structure-based ATS rules."""

from __future__ import annotations

from typing import Any

from app.domain.ats_rules.models import ATSRule, ImpactType, RuleType


def _get_section_titles(resume_data: dict[str, Any]) -> list[str]:
    """Get all section titles from resume."""
    sections = resume_data.get("sections", [])
    titles = []
    for section in sections:
        if isinstance(section, dict):
            title = section.get("title", "")
            if title:
                titles.append(title.lower())
    return titles


def _has_section(resume_data: dict[str, Any], section_keywords: list[str]) -> bool:
    """Check if resume has a section matching keywords."""
    titles = _get_section_titles(resume_data)
    for title in titles:
        for keyword in section_keywords:
            if keyword in title:
                return True
    return False


def _count_bullets_in_section(section: dict[str, Any]) -> int:
    """Count visible bullets in a section."""
    bullets = section.get("bullets", [])
    count = 0
    for bullet in bullets:
        if isinstance(bullet, dict):
            # Count visible bullets
            if bullet.get("params", {}).get("visible") is not False:
                bullet_text = bullet.get("text", "").strip()
                if bullet_text:
                    count += 1
        elif isinstance(bullet, str) and bullet.strip():
            count += 1
    return count


def _get_ats_friendly_section_order() -> list[list[str]]:
    """Return ATS-friendly section order (list of possible section keywords for each position)."""
    return [
        ["contact", "header", "personal"],  # Position 0: Contact info
        ["summary", "objective", "profile", "about"],  # Position 1: Summary
        ["experience", "work", "employment", "career", "professional"],  # Position 2: Experience
        ["education", "academic", "degree", "qualifications"],  # Position 3: Education
        ["skills", "technical", "competencies", "expertise"],  # Position 4: Skills
        ["certification", "certificate", "certifications"],  # Position 5: Certifications
    ]


def get_structure_rules() -> list[ATSRule]:
    """Get all structure-based rules."""
    rules = []

    # Rule 1: Required Sections
    def check_required_sections(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if all required sections are present."""
        required_sections = [
            (["contact", "header", "personal"], "Contact Information"),
            (["experience", "work", "employment"], "Work Experience"),
            (["education", "academic", "degree"], "Education"),
        ]
        
        missing_sections = []
        for keywords, section_name in required_sections:
            if not _has_section(resume_data, keywords):
                missing_sections.append(section_name)
        
        context.setdefault("rule_details", {})["required_sections"] = {
            "missing_sections": missing_sections,
        }
        
        # Rule passes if no missing sections
        return len(missing_sections) == 0

    rules.append(
        ATSRule(
            id="required_sections",
            name="Required Sections",
            category=RuleType.STRUCTURE,
            condition=check_required_sections,
            impact=ImpactType.PENALTY,
            base_value=-3.0,  # -3 points per missing section
            max_impact=-9.0,  # Cap at -9 points
            priority="high",
            description="Penalty for missing critical sections (contact, experience, education)",
            suggestion="Add missing required sections: Contact Information, Work Experience, and Education",
        )
    )

    # Rule 2: Section Order
    def check_section_order(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if sections follow ATS-friendly order."""
        section_order = _get_ats_friendly_section_order()
        titles = _get_section_titles(resume_data)
        
        if len(titles) < 2:
            return True  # Not enough sections to check order
        
        # Find positions of key sections
        section_positions = {}
        for idx, title in enumerate(titles):
            for pos, keywords_list in enumerate(section_order):
                for keywords in keywords_list:
                    if any(kw in title for kw in keywords):
                        if pos not in section_positions:
                            section_positions[pos] = idx
                        break
        
        # Check if sections are in correct order
        correct_order = True
        last_position = -1
        for pos in sorted(section_positions.keys()):
            if section_positions[pos] < last_position:
                correct_order = False
                break
            last_position = section_positions[pos]
        
        context.setdefault("rule_details", {})["section_order"] = {
            "is_correct_order": correct_order,
            "section_positions": section_positions,
        }
        
        return correct_order

    rules.append(
        ATSRule(
            id="section_order",
            name="Section Order",
            category=RuleType.STRUCTURE,
            condition=check_section_order,
            impact=ImpactType.BONUS,
            base_value=2.0,
            max_impact=3.0,
            priority="medium",
            description="Bonus for ATS-friendly section ordering",
            suggestion="Reorder sections: Contact → Summary → Experience → Education → Skills",
        )
    )

    # Rule 3: Section Completeness
    def check_section_completeness(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if sections have sufficient content."""
        sections = resume_data.get("sections", [])
        incomplete_sections = []
        
        for section in sections:
            if isinstance(section, dict):
                title = section.get("title", "").lower()
                bullet_count = _count_bullets_in_section(section)
                
                # Check experience and education sections need bullets
                if any(kw in title for kw in ["experience", "work", "employment", "education", "academic"]):
                    if bullet_count < 2:
                        incomplete_sections.append(section.get("title", "Unknown"))
        
        context.setdefault("rule_details", {})["section_completeness"] = {
            "incomplete_sections": incomplete_sections,
        }
        
        # Rule passes if all sections are complete
        return len(incomplete_sections) == 0

    rules.append(
        ATSRule(
            id="section_completeness",
            name="Section Completeness",
            category=RuleType.STRUCTURE,
            condition=check_section_completeness,
            impact=ImpactType.PENALTY,
            base_value=-2.0,
            max_impact=-6.0,
            priority="medium",
            description="Penalty for sections with insufficient content",
            suggestion="Add more content to incomplete sections (at least 2 bullet points for experience/education)",
        )
    )

    # Rule 4: Bullet Point Format
    def check_bullet_format(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if bullet points are consistently formatted."""
        sections = resume_data.get("sections", [])
        inconsistent_count = 0
        total_bullets = 0
        
        for section in sections:
            if isinstance(section, dict):
                bullets = section.get("bullets", [])
                for bullet in bullets:
                    if isinstance(bullet, dict):
                        bullet_text = bullet.get("text", "").strip()
                        if bullet.get("params", {}).get("visible") is not False and bullet_text:
                            total_bullets += 1
                            # Check for consistent formatting (should start with bullet or action verb)
                            if not (bullet_text.startswith("•") or 
                                   bullet_text.startswith("-") or
                                   bullet_text[0].isupper()):
                                inconsistent_count += 1
        
        consistency_percentage = (
            ((total_bullets - inconsistent_count) / total_bullets * 100)
            if total_bullets > 0 else 100
        )
        
        context.setdefault("rule_details", {})["bullet_format"] = {
            "consistency_percentage": consistency_percentage,
            "inconsistent_count": inconsistent_count,
            "total_bullets": total_bullets,
        }
        
        return consistency_percentage >= 80.0

    rules.append(
        ATSRule(
            id="bullet_format",
            name="Bullet Point Format",
            category=RuleType.STRUCTURE,
            condition=check_bullet_format,
            impact=ImpactType.BONUS,
            base_value=2.0,
            max_impact=3.0,
            priority="low",
            description="Bonus for consistent bullet point formatting",
            suggestion="Ensure all bullet points follow consistent formatting (start with • or action verb)",
        )
    )

    # Rule 5: Header Consistency
    def check_header_consistency(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if section headers are consistent."""
        titles = _get_section_titles(resume_data)
        
        if len(titles) < 2:
            return True  # Not enough sections to check consistency
        
        # Check for consistent capitalization
        all_title_case = all(title.istitle() or title.isupper() or title.islower() for title in titles)
        all_same_case = len(set(title[0].isupper() if title else False for title in titles)) <= 1
        
        context.setdefault("rule_details", {})["header_consistency"] = {
            "is_consistent": all_same_case,
        }
        
        return all_same_case

    rules.append(
        ATSRule(
            id="header_consistency",
            name="Header Consistency",
            category=RuleType.STRUCTURE,
            condition=check_header_consistency,
            impact=ImpactType.PENALTY,
            base_value=-1.0,
            max_impact=-2.0,
            priority="low",
            description="Penalty for inconsistent section header formatting",
            suggestion="Use consistent capitalization for all section headers",
        )
    )

    return rules

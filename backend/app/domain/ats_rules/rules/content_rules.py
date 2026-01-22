"""Content quality-based ATS rules."""

from __future__ import annotations

import re
from typing import Any

from app.domain.ats_rules.models import ATSRule, ImpactType, RuleType

# Action verbs that strengthen resume content
ACTION_VERBS = {
    "achieved", "accomplished", "administered", "analyzed", "architected", "built",
    "collaborated", "created", "delivered", "developed", "designed", "executed",
    "implemented", "improved", "increased", "led", "managed", "optimized",
    "produced", "reduced", "resolved", "streamlined", "transformed", "utilized",
    "coordinated", "facilitated", "initiated", "launched", "pioneered", "spearheaded",
    "established", "generated", "enhanced", "expanded", "maintained", "upgraded",
    "migrated", "integrated", "deployed", "supervised", "directed", "oversaw",
}

# Unprofessional words/phrases to avoid
UNPROFESSIONAL_PATTERNS = [
    r'\b(yo|hey|dude|bro|lol|omg|wtf)\b',
    r'\b(i think|i feel|i believe|maybe|perhaps|kind of|sort of)\b',
    r'\b(just|only|simply)\s+(did|made|created)',
    r'\b(very|really|super|extremely)\s+\w+',  # Excessive intensifiers
]


def _get_resume_text(resume_data: dict[str, Any]) -> str:
    """Extract text content from resume data."""
    text_parts = []
    
    if resume_data.get("summary"):
        text_parts.append(str(resume_data["summary"]))
    
    sections = resume_data.get("sections", [])
    for section in sections:
        if isinstance(section, dict):
            bullets = section.get("bullets", [])
            for bullet in bullets:
                if isinstance(bullet, dict):
                    bullet_text = bullet.get("text", "")
                    if bullet.get("params", {}).get("visible") is not False:
                        text_parts.append(bullet_text)
                elif isinstance(bullet, str):
                    text_parts.append(bullet)
    
    return " ".join(text_parts).lower()


def _count_action_verbs(text: str) -> int:
    """Count action verbs in text."""
    words = text.split()
    count = 0
    for word in words:
        # Remove punctuation
        cleaned = re.sub(r'[^\w]', '', word.lower())
        if cleaned in ACTION_VERBS:
            count += 1
    return count


def _count_quantifiable_achievements(text: str) -> int:
    """Count quantifiable achievements (numbers, percentages, metrics)."""
    # Patterns for quantifiable achievements
    patterns = [
        r'\d+%',  # Percentages
        r'\$\d+[KMB]?',  # Dollar amounts
        r'\d+\s*(million|billion|thousand|k|m|b)',  # Large numbers
        r'\d+\s*(years?|months?|days?)',  # Time periods
        r'\d+\s*(people|users|clients|customers|employees)',  # People counts
        r'increased|decreased|improved|reduced|saved|generated.*\d+',  # Achievement verbs with numbers
    ]
    
    count = 0
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        count += len(matches)
    
    return count


def _check_unprofessional_language(text: str) -> bool:
    """Check for unprofessional language patterns."""
    for pattern in UNPROFESSIONAL_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _extract_keywords_from_text(text: str) -> set[str]:
    """Extract keywords from text."""
    import re
    if not text:
        return set()
    word_pattern = r'\b[a-zA-Z0-9][a-zA-Z0-9+/#.-]*[a-zA-Z]|[a-zA-Z][a-zA-Z0-9+/#.-]*[a-zA-Z0-9]|[a-zA-Z]{2,}\b'
    tokens = re.findall(word_pattern, text.lower())
    keywords = set()
    for token in tokens:
        cleaned = token.strip('.,!?;:"()[]{}')
        if len(cleaned) >= 2 and re.search(r'[a-zA-Z]', cleaned) and not re.match(r'^\d+$', cleaned):
            keywords.add(cleaned)
    return keywords


def _get_high_importance_keywords(job_description: str | None, context: dict[str, Any]) -> set[str]:
    """Extract high-importance keywords from job description or context."""
    keywords = set()
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
        technical_keywords = extracted_keywords.get("technical_keywords", [])
        for kw in technical_keywords:
            if isinstance(kw, str):
                keywords.add(kw.lower())
            elif isinstance(kw, dict):
                keywords.add(kw.get("keyword", "").lower())
    if job_description:
        jd_keywords = _extract_keywords_from_text(job_description)
        for kw in jd_keywords:
            if len(kw) >= 4:
                keywords.add(kw)
    return keywords


def _check_keyword_context(
    resume_data: dict[str, Any],
    job_description: str | None,
    context: dict[str, Any],
) -> tuple[int, int]:
    """Check if keywords are used in meaningful context vs just listed."""
    
    high_importance_keywords = _get_high_importance_keywords(job_description, context)
    if not high_importance_keywords:
        return 0, 0
    
    resume_text = _get_resume_text(resume_data)
    
    # Keywords in context (appear in sentences with other words)
    keywords_in_context = 0
    # Keywords just listed (standalone or in lists)
    keywords_listed = 0
    
    for keyword in high_importance_keywords:
        # Check if keyword appears in a sentence (surrounded by other words)
        pattern = rf'\b\w+\s+{re.escape(keyword)}\s+\w+\b'
        if re.search(pattern, resume_text, re.IGNORECASE):
            keywords_in_context += 1
        elif keyword in resume_text:
            keywords_listed += 1
    
    return keywords_in_context, keywords_listed


def get_content_rules() -> list[ATSRule]:
    """Get all content quality-based rules."""
    rules = []

    # Rule 1: Action Verbs Usage
    def check_action_verbs(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume uses strong action verbs."""
        text = _get_resume_text(resume_data)
        action_verb_count = _count_action_verbs(text)
        
        # Count total words in experience/summary
        words = text.split()
        total_words = len(words)
        
        # Good: at least 1 action verb per 50 words, or at least 5 action verbs total
        has_sufficient_verbs = (
            action_verb_count >= 5 or
            (total_words > 0 and (action_verb_count / total_words * 100) >= 2.0)
        )
        
        context.setdefault("rule_details", {})["action_verbs"] = {
            "action_verb_count": action_verb_count,
            "total_words": total_words,
            "has_sufficient": has_sufficient_verbs,
        }
        
        return has_sufficient_verbs

    rules.append(
        ATSRule(
            id="action_verbs",
            name="Action Verbs Usage",
            category=RuleType.CONTENT,
            condition=check_action_verbs,
            impact=ImpactType.BONUS,
            base_value=3.0,
            max_impact=5.0,
            priority="medium",
            description="Bonus for using strong action verbs in experience bullets",
            suggestion="Start bullet points with strong action verbs (e.g., 'Led', 'Developed', 'Implemented')",
        )
    )

    # Rule 2: Quantifiable Achievements
    def check_quantifiable_achievements(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume includes quantifiable achievements."""
        text = _get_resume_text(resume_data)
        achievement_count = _count_quantifiable_achievements(text)
        
        # Good: at least 3 quantifiable achievements
        has_sufficient_achievements = achievement_count >= 3
        
        context.setdefault("rule_details", {})["quantifiable_achievements"] = {
            "achievement_count": achievement_count,
            "has_sufficient": has_sufficient_achievements,
        }
        
        return has_sufficient_achievements

    rules.append(
        ATSRule(
            id="quantifiable_achievements",
            name="Quantifiable Achievements",
            category=RuleType.CONTENT,
            condition=check_quantifiable_achievements,
            impact=ImpactType.BONUS,
            base_value=4.0,
            max_impact=8.0,
            priority="high",
            description="Bonus for including quantifiable achievements (metrics, percentages, numbers)",
            suggestion="Add quantifiable achievements with specific numbers, percentages, or metrics",
        )
    )

    # Rule 3: Achievement Focus
    def check_achievement_focus(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if resume focuses on achievements rather than responsibilities."""
        text = _get_resume_text(resume_data)
        
        # Count achievement-oriented phrases
        achievement_phrases = [
            r'\b(achieved|accomplished|delivered|improved|increased|reduced|saved|generated|led to|resulted in)',
            r'\b(successfully|effectively|efficiently)',
        ]
        
        achievement_count = 0
        for pattern in achievement_phrases:
            achievement_count += len(re.findall(pattern, text, re.IGNORECASE))
        
        # Count responsibility-oriented phrases
        responsibility_phrases = [
            r'\b(responsible for|duties included|tasked with|assigned to)',
        ]
        
        responsibility_count = 0
        for pattern in responsibility_phrases:
            responsibility_count += len(re.findall(pattern, text, re.IGNORECASE))
        
        # Good: more achievements than responsibilities
        is_achievement_focused = achievement_count > responsibility_count
        
        context.setdefault("rule_details", {})["achievement_focus"] = {
            "achievement_count": achievement_count,
            "responsibility_count": responsibility_count,
            "is_achievement_focused": is_achievement_focused,
        }
        
        return is_achievement_focused

    rules.append(
        ATSRule(
            id="achievement_focus",
            name="Achievement Focus",
            category=RuleType.CONTENT,
            condition=check_achievement_focus,
            impact=ImpactType.BONUS,
            base_value=3.0,
            max_impact=5.0,
            priority="medium",
            description="Bonus for results-oriented language vs responsibility-focused",
            suggestion="Focus on achievements and results rather than responsibilities",
        )
    )

    # Rule 4: Keyword Context
    def check_keyword_context_rule(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check if keywords are used in meaningful context."""
        keywords_in_context, keywords_listed = _check_keyword_context(
            resume_data, job_description, context
        )
        
        total_keywords = keywords_in_context + keywords_listed
        if total_keywords == 0:
            return False
        
        # Good: at least 50% of keywords used in context
        context_percentage = (keywords_in_context / total_keywords * 100) if total_keywords > 0 else 0
        has_good_context = context_percentage >= 50.0
        
        context.setdefault("rule_details", {})["keyword_context"] = {
            "keywords_in_context": keywords_in_context,
            "keywords_listed": keywords_listed,
            "context_percentage": context_percentage,
            "has_good_context": has_good_context,
        }
        
        return has_good_context

    rules.append(
        ATSRule(
            id="keyword_context",
            name="Keyword Context",
            category=RuleType.CONTENT,
            condition=check_keyword_context_rule,
            impact=ImpactType.BONUS,
            base_value=2.0,
            max_impact=4.0,
            priority="medium",
            description="Bonus for using keywords in meaningful context (not just listed)",
            suggestion="Use keywords naturally in sentences rather than just listing them",
        )
    )

    # Rule 5: Professional Language
    def check_professional_language(
        resume_data: dict[str, Any], job_description: str | None, context: dict[str, Any]
    ) -> bool:
        """Check for unprofessional language."""
        text = _get_resume_text(resume_data)
        has_unprofessional = _check_unprofessional_language(text)
        
        context.setdefault("rule_details", {})["professional_language"] = {
            "has_unprofessional": has_unprofessional,
        }
        
        # Rule passes if language IS professional (to avoid penalty)
        return not has_unprofessional

    rules.append(
        ATSRule(
            id="professional_language",
            name="Professional Language",
            category=RuleType.CONTENT,
            condition=check_professional_language,
            impact=ImpactType.PENALTY,
            base_value=-3.0,
            max_impact=-5.0,
            priority="high",
            description="Penalty for unprofessional or casual language",
            suggestion="Use professional, formal language throughout your resume",
        )
    )

    return rules

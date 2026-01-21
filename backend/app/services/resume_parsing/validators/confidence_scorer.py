"""Validate parsed resume data and calculate confidence scores."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def validate_and_score(parsed_data: dict[str, Any]) -> dict[str, Any]:
    """
    Validate parsed resume data and calculate confidence scores.
    
    Returns:
        {
            'overall_confidence': float,  # weighted average
            'field_scores': {
                'name': float,
                'contact': float,
                'sections': float,
                'format_consistency': float
            },
            'issues': [str],  # list of detected problems
            'recommendation': 'accept' | 'retry_with_vision' | 'manual_review'
        }
    """
    field_scores = {}
    issues = []
    
    # 1. Required Fields Check (0.6 total weight)
    name_score = _check_name(parsed_data)
    contact_score = _check_contact(parsed_data)
    sections_score = _check_sections(parsed_data)
    
    field_scores['name'] = name_score
    field_scores['contact'] = contact_score
    field_scores['sections'] = sections_score
    
    # Weighted required fields score (0.6 total)
    required_fields_score = (
        name_score * 0.2 +
        contact_score * 0.2 +
        sections_score * 0.3
    ) / 0.7  # Normalize to 0-1
    
    # 2. Section Quality Check (0.3 weight)
    section_quality_score, section_issues = _check_section_quality(parsed_data)
    field_scores['section_quality'] = section_quality_score
    issues.extend(section_issues)
    
    # 3. Format Consistency Check (0.1 weight)
    format_score, format_issues = _check_format_consistency(parsed_data)
    field_scores['format_consistency'] = format_score
    issues.extend(format_issues)
    
    # Calculate overall confidence (weighted average)
    overall_confidence = (
        required_fields_score * 0.6 +
        section_quality_score * 0.3 +
        format_score * 0.1
    )
    
    # Determine recommendation
    if overall_confidence >= 0.8:
        recommendation = 'accept'
    elif overall_confidence >= 0.6:
        recommendation = 'accept'
    elif overall_confidence >= 0.4:
        recommendation = 'retry_with_vision'
    else:
        recommendation = 'manual_review'
    
    logger.info(
        f"Confidence scoring: overall={overall_confidence:.2f}, "
        f"recommendation={recommendation}, issues={len(issues)}"
    )
    
    return {
        'overall_confidence': float(overall_confidence),
        'field_scores': field_scores,
        'issues': issues,
        'recommendation': recommendation
    }


def _check_name(parsed_data: dict[str, Any]) -> float:
    """Check if name is present (0.0 to 1.0)."""
    name = parsed_data.get('name', '').strip()
    if not name:
        return 0.0
    if len(name) < 2:
        return 0.3
    if len(name.split()) < 2:
        return 0.7
    # Valid name (at least first and last)
    return 1.0


def _check_contact(parsed_data: dict[str, Any]) -> float:
    """Check if contact info is present (email OR phone) (0.0 to 1.0)."""
    email = parsed_data.get('email', '').strip()
    phone = parsed_data.get('phone', '').strip()
    
    has_email = bool(email and '@' in email)
    has_phone = bool(phone and re.search(r'\d', phone))
    
    if has_email and has_phone:
        return 1.0
    elif has_email or has_phone:
        return 0.7
    else:
        return 0.0


def _check_sections(parsed_data: dict[str, Any]) -> float:
    """Check if at least one meaningful section is present (0.0 to 1.0)."""
    sections = parsed_data.get('sections', [])
    
    if not sections:
        return 0.0
    
    # Check for experience or education sections
    has_experience = any(
        'experience' in section.get('title', '').lower()
        for section in sections
    )
    has_education = any(
        'education' in section.get('title', '').lower()
        for section in sections
    )
    
    if has_experience and has_education:
        return 1.0
    elif has_experience or has_education:
        return 0.8
    elif len(sections) >= 2:
        return 0.6
    elif len(sections) >= 1:
        return 0.4
    else:
        return 0.0


def _check_section_quality(
    parsed_data: dict[str, Any]
) -> tuple[float, list[str]]:
    """
    Check section quality (0.0 to 1.0).
    Returns (score, list of issues).
    """
    sections = parsed_data.get('sections', [])
    issues = []
    total_score = 0.0
    
    if not sections:
        return 0.0, ['No sections found']
    
    for section in sections:
        section_score = 1.0
        bullets = section.get('bullets', [])
        title = section.get('title', '').lower()
        
        # Check for empty sections
        if not bullets:
            issues.append(f"Section '{section.get('title', '')}' has no content")
            section_score *= 0.5
        elif len(bullets) > 50:
            issues.append(f"Section '{section.get('title', '')}' has too many bullets ({len(bullets)})")
            section_score *= 0.7
        
        # Check for experience section patterns
        if 'experience' in title or 'work' in title:
            # Check if bullets match expected pattern (company header, then bullets)
            has_company_headers = any(
                '**' in bullet.get('text', '') or '/' in bullet.get('text', '')
                for bullet in bullets[:5]
            )
            if not has_company_headers and len(bullets) > 0:
                section_score *= 0.8
                issues.append(f"Experience section may be missing company/job headers")
        
        # Check for duplicate content
        bullet_texts = [b.get('text', '').strip().lower() for b in bullets]
        duplicates = len(bullet_texts) - len(set(bullet_texts))
        if duplicates > 0:
            section_score *= max(0.5, 1.0 - (duplicates / len(bullets)))
            issues.append(f"Section '{section.get('title', '')}' has {duplicates} duplicate bullets")
        
        # Check for dates (in experience/education)
        if 'experience' in title or 'education' in title:
            has_dates = any(
                re.search(r'\d{4}|\d{1,2}[/-]\d{4}', bullet.get('text', ''))
                for bullet in bullets
            )
            if not has_dates:
                section_score *= 0.8
                issues.append(f"Section '{section.get('title', '')}' may be missing dates")
        
        total_score += section_score
    
    avg_score = total_score / len(sections) if sections else 0.0
    return avg_score, issues


def _check_format_consistency(
    parsed_data: dict[str, Any]
) -> tuple[float, list[str]]:
    """
    Check format consistency (0.0 to 1.0).
    Returns (score, list of issues).
    """
    issues = []
    score = 1.0
    
    sections = parsed_data.get('sections', [])
    all_bullets = []
    for section in sections:
        all_bullets.extend(section.get('bullets', []))
    
    if not all_bullets:
        return 0.0, ['No content to check format consistency']
    
    # Check for extraction artifacts (page numbers, headers/footers)
    artifact_patterns = [
        r'page\s+\d+',
        r'^\d+$',  # Just a number
        r'^[^\w]{0,5}$',  # Very short non-word content
    ]
    
    artifact_count = 0
    for bullet in all_bullets:
        text = bullet.get('text', '').strip()
        for pattern in artifact_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                artifact_count += 1
                break
    
    if artifact_count > 0:
        score -= min(0.3, artifact_count / len(all_bullets))
        issues.append(f"Found {artifact_count} potential extraction artifacts")
    
    # Check date format consistency
    date_formats = set()
    for bullet in all_bullets:
        text = bullet.get('text', '')
        dates = re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}', text)
        if dates:
            # Simple check: 4-digit year vs 2-digit year
            for date in dates:
                if len(date) == 4 and date.isdigit():
                    date_formats.add('YYYY')
                elif '/' in date or '-' in date:
                    date_formats.add('MM/DD/YYYY')
    
    if len(date_formats) > 2:
        score -= 0.1
        issues.append("Inconsistent date formats detected")
    
    # Check bullet formatting consistency
    bullet_prefixes = set()
    for bullet in all_bullets[:20]:  # Sample first 20
        text = bullet.get('text', '')
        if text.startswith('•'):
            bullet_prefixes.add('•')
        elif text.startswith('-'):
            bullet_prefixes.add('-')
        elif text.startswith('**'):
            bullet_prefixes.add('**')
    
    # Mixed bullet styles are OK, but if many are inconsistent, penalize
    if len(bullet_prefixes) > 3:
        score -= 0.1
        issues.append("Inconsistent bullet formatting")
    
    return max(0.0, score), issues

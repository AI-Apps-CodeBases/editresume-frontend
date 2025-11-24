"""Resume formatting utilities - extracted from legacy_app.py"""

from __future__ import annotations
import re

from typing import Dict, List

from app.api.models import BulletParam


def apply_replacements(text: str, replacements: Dict[str, str]) -> str:
    """Apply variable replacements to text"""
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def strip_bullet_markers(text: str) -> str:
    """Remove all bullet point markers from text"""
    if not text:
        return text
    
    # Common bullet characters and patterns
    bullet_chars = ['•', '*', '-', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽']
    cleaned = text
    
    # Remove all occurrences of each bullet character (not just first)
    for char in bullet_chars:
        cleaned = cleaned.replace(char, '')
    
    # Remove bullet patterns at the start: "• ", "* ", "- ", " •", etc.
    # This regex matches one or more bullet chars followed by optional whitespace at the start
    cleaned = re.sub(r'^[\s•*\-▪▫◦‣⁃→·○●◾◽]+\s*', '', cleaned, flags=re.MULTILINE)
    
    # Remove bullet patterns at the end
    cleaned = re.sub(r'\s*[\s•*\-▪▫◦‣⁃→·○●◾◽]+$', '', cleaned, flags=re.MULTILINE)
    
    # Remove any remaining leading/trailing whitespace
    cleaned = cleaned.strip()
    
    return cleaned


def format_bold_text(text: str) -> str:
    """Convert **text** to <strong>text</strong> for HTML"""
    return text.replace("**", "<strong>").replace("**", "</strong>")


def format_work_experience_bullets(bullets: List[BulletParam], replacements: Dict[str, str]) -> str:
    """Format work experience bullets with proper company headers and tasks"""
    html_parts = []
    current_company = None

    for bullet in bullets:
        if not bullet.text.strip():
            continue

        bullet_text = apply_replacements(bullet.text, replacements)

        # Check if this is a company header (starts with **)
        if bullet_text.startswith("**") and "**" in bullet_text[2:]:
            # Company header - new format: Company Name / Location / Title / Date Range
            header_text = bullet_text.replace("**", "").strip()
            parts = header_text.split(' / ')
            # Support both old format (3 parts) and new format (4 parts)
            company_name = parts[0] if parts else ''
            location = parts[1] if len(parts) >= 4 else ''
            title = parts[2] if len(parts) >= 4 else (parts[1] if len(parts) >= 2 else '')
            date_range = parts[3] if len(parts) >= 4 else (parts[2] if len(parts) >= 3 else '')
            
            # Format: Line 1: Company Name / Location, Line 2: Title (left) Date Range (right)
            company_line = company_name
            if location:
                company_line += f' / {location}'
            
            html_parts.append(
                f'<div class="job-entry">'
                f'<div class="company-header">'
                f'<div class="company-name-line">{company_line}</div>'
                f'<div class="company-title-line">'
                f'<span class="job-title">{title}</span>'
                f'<span class="job-date">{date_range}</span>'
                f'</div>'
                f'</div>'
            )
            current_company = company_name
        else:
            # Regular task bullet - remove all bullet markers
            task_text = strip_bullet_markers(bullet_text)
            if task_text:
                html_parts.append(f"<li>{task_text}</li>")

    # Close the last job entry if needed
    if current_company:
        html_parts.append("</div>")

    return "\n".join(html_parts)


def format_regular_bullets(bullets: List[BulletParam], replacements: Dict[str, str], section_title: str = "") -> str:
    """Format regular section bullets"""
    # Check if this is a skills section
    section_lower = section_title.lower()
    is_skill_section = (
        "skill" in section_lower
        or "technical" in section_lower
        or "technology" in section_lower
        or "competencies" in section_lower
        or "expertise" in section_lower
        or "proficiencies" in section_lower
    )
    
    if is_skill_section:
        # Skills section - render as comma-separated, no bullets
        skill_items = []
        for bullet in bullets:
            if bullet.text.strip():
                bullet_text = apply_replacements(bullet.text, replacements)
                # Remove all bullet markers
                clean_text = strip_bullet_markers(bullet_text)
                if clean_text:
                    skill_items.append(clean_text)
        return f'<div class="skills-section">{", ".join(skill_items)}</div>'
    
    # Regular section with bullets
    html_parts = []
    for bullet in bullets:
        if bullet.text.strip():
            bullet_text = apply_replacements(bullet.text, replacements)
            # Remove all bullet markers
            clean_text = strip_bullet_markers(bullet_text)
            if clean_text:
                html_parts.append(f"<li>{format_bold_text(clean_text)}</li>")

    return "\n".join(html_parts)


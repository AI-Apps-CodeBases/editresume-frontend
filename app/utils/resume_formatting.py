"""Resume formatting utilities - extracted from legacy_app.py"""

from __future__ import annotations

from typing import Dict, List

from app.api.models import BulletParam


def apply_replacements(text: str, replacements: Dict[str, str]) -> str:
    """Apply variable replacements to text"""
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def format_bold_text(text: str) -> str:
    """Convert **text** to <strong>text</strong> for HTML"""
    return text.replace("**", "<strong>").replace("**", "</strong>")


def format_work_experience_bullets(bullets: List[BulletParam], replacements: Dict[str, str]) -> str:
    """Format work experience bullets with proper company headers and tasks"""
    html_parts = []
    current_company = None

    for bullet in bullets:
        if not bullet.text.strip():
            # Empty separator - add spacing
            html_parts.append('<div class="job-separator"></div>')
            continue

        bullet_text = apply_replacements(bullet.text, replacements)

        # Check if this is a company header (starts with **)
        if bullet_text.startswith("**") and "**" in bullet_text[2:]:
            # Company header - extract company name and format
            company_text = bullet_text.replace("**", "").strip()
            html_parts.append(
                f'<div class="job-entry"><div class="company-name">{company_text}</div>'
            )
            current_company = company_text
        else:
            # Regular task bullet - remove any existing bullet points
            task_text = bullet_text.replace("•", "").replace("*", "").strip()
            if task_text:
                html_parts.append(f"<li>{task_text}</li>")

    # Close the last job entry if needed
    if current_company:
        html_parts.append("</div>")

    return "\n".join(html_parts)


def format_regular_bullets(bullets: List[BulletParam], replacements: Dict[str, str]) -> str:
    """Format regular section bullets"""
    html_parts = []

    for bullet in bullets:
        if bullet.text.strip():
            bullet_text = apply_replacements(bullet.text, replacements)
            # Remove any existing bullet points and format
            clean_text = bullet_text.replace("•", "").replace("*", "").strip()
            if clean_text:
                html_parts.append(f"<li>{format_bold_text(clean_text)}</li>")

    return "\n".join(html_parts)


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
    """Remove all bullet point markers from text, and any remaining ** that weren't converted"""
    if not text:
        return text
    
    # Remove any remaining ** characters that weren't converted to <strong> tags
    # This handles edge cases where ** might not have been properly converted
    cleaned = text.replace('**', '')
    
    # Common bullet characters (including square ■ which might appear in text)
    # Expanded list to include more Unicode bullet variants
    bullet_chars = [
        '•', '◦', '‣', '⁃', '⁌', '⁍', '→', '·', '○', '●', 
        '▪', '▫', '◾', '◽', '■', '□', '◼', '◻', '⬛', '⬜',
        '-', '–', '—', '―'
    ]
    
    # Remove all occurrences of each bullet character (not just first)
    for char in bullet_chars:
        cleaned = cleaned.replace(char, '')
    
    # Remove standalone * patterns (single asterisk used as bullet)
    # Remove * at start followed by space
    cleaned = re.sub(r'^\*\s+', '', cleaned, flags=re.MULTILINE)
    # Remove standalone * at start of line
    cleaned = re.sub(r'^\*$', '', cleaned, flags=re.MULTILINE)
    # Remove * at end
    cleaned = re.sub(r'\s+\*$', '', cleaned, flags=re.MULTILINE)
    
    # Remove bullet patterns at the start: "• ", "- ", etc.
    cleaned = re.sub(r'^[\s•\-▪▫◦‣⁃→·○●◾◽◦‣⁃⁌⁍■□◼◻⬛⬜–—―]+\s*', '', cleaned, flags=re.MULTILINE)
    
    # Remove bullet patterns at the end
    cleaned = re.sub(r'\s*[\s•\-▪▫◦‣⁃→·○●◾◽◦‣⁃⁌⁍■□◼◻⬛⬜–—―]+$', '', cleaned, flags=re.MULTILINE)
    
    # Remove any remaining leading/trailing whitespace
    cleaned = cleaned.strip()
    
    return cleaned


def format_bold_text(text: str) -> str:
    """Convert **text** to <strong>text</strong> for HTML and remove any remaining **"""
    if not text:
        return text
    
    # Use regex to properly handle multiple bold sections
    # Match **text** and replace with <strong>text</strong>
    # This regex handles:
    # - **text** -> <strong>text</strong>
    # - **text with spaces** -> <strong>text with spaces</strong>
    # - Multiple bold sections in one line
    # Use non-greedy matching to handle multiple bold sections
    result = re.sub(r'\*\*([^*]+?)\*\*', r'<strong>\1</strong>', text)
    
    # Aggressively remove ALL remaining ** characters (safety net)
    # This handles edge cases like unmatched ** or ** that didn't match the pattern
    # Replace all occurrences of ** with empty string
    while '**' in result:
        result = result.replace('**', '')
    
    # Also remove any single * that might be left (but not inside <strong> tags)
    # Only remove * at word boundaries or standalone
    result = re.sub(r'\s+\*\s+', ' ', result)  # Remove * with spaces around it
    result = re.sub(r'^\*\s+', '', result)  # Remove * at start
    result = re.sub(r'\s+\*$', '', result)  # Remove * at end
    
    return result


def format_work_experience_bullets(bullets: List[BulletParam], replacements: Dict[str, str]) -> str:
    """Format work experience bullets with proper company headers and tasks"""
    html_parts = []
    current_company = None
    current_list_items = []

    for bullet in bullets:
        if not bullet.text.strip():
            continue

        bullet_text = apply_replacements(bullet.text, replacements)

        # Check if this is a company header (starts with **)
        if bullet_text.startswith("**") and "**" in bullet_text[2:]:
            # If we have accumulated list items, wrap them in <ul> and add to html_parts
            if current_list_items:
                html_parts.append("<ul>")
                html_parts.extend(current_list_items)
                html_parts.append("</ul>")
                current_list_items = []
            
            # Close previous job entry if needed
            if current_company:
                html_parts.append("</div>")
            
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
            # Regular task bullet - remove leading bullet markers first
            bullet_text = bullet_text.lstrip('•').lstrip('-').lstrip('*').lstrip()
            if bullet_text.startswith('• '):
                bullet_text = bullet_text[2:]
            elif bullet_text.startswith('- '):
                bullet_text = bullet_text[2:]
            elif bullet_text.startswith('* '):
                bullet_text = bullet_text[2:]
            
            # Convert ** to <strong> first, then remove ALL remaining ** and * characters
            bullet_text = format_bold_text(bullet_text)
            task_text = strip_bullet_markers(bullet_text)
            
            # Final safety check: remove any remaining * or ** characters
            # Use regex to remove standalone * that aren't part of HTML tags
            task_text = re.sub(r'\*(?![*<>/])', '', task_text)  # Remove * not followed by *, <, >, or /
            task_text = task_text.replace('**', '')  # Remove any remaining **
            
            # Additional pass to remove any bullet characters that might remain
            bullet_chars = ['•', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽', '■']
            for char in bullet_chars:
                task_text = task_text.replace(char, '')
            
            if task_text and task_text.strip():
                current_list_items.append(f"<li>{task_text}</li>")

    # If we have accumulated list items, wrap them in <ul> and add to html_parts
    if current_list_items:
        html_parts.append("<ul>")
        html_parts.extend(current_list_items)
        html_parts.append("</ul>")

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
                # Convert ** to <strong> first, then remove bullet markers
                bullet_text = format_bold_text(bullet_text)
                clean_text = strip_bullet_markers(bullet_text)
                if clean_text:
                    skill_items.append(clean_text)
        return f'<div class="skills-section">{", ".join(skill_items)}</div>'
    
    # Regular section with bullets
    html_parts = []
    for bullet in bullets:
        if bullet.text.strip():
            bullet_text = apply_replacements(bullet.text, replacements)
            
            # Remove any leading bullet markers first (•, -, *, etc.)
            bullet_text = bullet_text.lstrip('•').lstrip('-').lstrip('*').lstrip()
            if bullet_text.startswith('• '):
                bullet_text = bullet_text[2:]
            elif bullet_text.startswith('- '):
                bullet_text = bullet_text[2:]
            elif bullet_text.startswith('* '):
                bullet_text = bullet_text[2:]
            
            # Convert ** to <strong> first, then remove ALL remaining ** and * characters
            bullet_text = format_bold_text(bullet_text)
            clean_text = strip_bullet_markers(bullet_text)
            
            # Final safety check: remove any remaining * or ** characters
            # Use regex to remove standalone * that aren't part of HTML tags
            clean_text = re.sub(r'\*(?![*<>/])', '', clean_text)  # Remove * not followed by *, <, >, or /
            clean_text = clean_text.replace('**', '')  # Remove any remaining **
            
            # Additional pass to remove any bullet characters that might remain
            bullet_chars = [
                '•', '◦', '‣', '⁃', '⁌', '⁍', '→', '·', '○', '●', 
                '▪', '▫', '◾', '◽', '■', '□', '◼', '◻', '⬛', '⬜',
                '-', '–', '—', '―'
            ]
            for char in bullet_chars:
                clean_text = clean_text.replace(char, '')
            
            if clean_text and clean_text.strip():
                html_parts.append(f"<li>{clean_text}</li>")

    return "\n".join(html_parts)


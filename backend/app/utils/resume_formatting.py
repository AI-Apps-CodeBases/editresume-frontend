"""Resume formatting utilities - extracted from legacy_app.py"""

from __future__ import annotations

import re

from app.api.models import BulletParam


MONTH_PATTERN = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)


def _split_title_date(text: str) -> tuple[str, str]:
    """Split a trailing date range from a title string."""
    text = text.strip()
    if not text:
        return "", ""

    month_range = re.compile(
        rf"^(?P<title>.*?)(?:,?\s*(?P<date>(?:{MONTH_PATTERN})\s+\d{{4}}"
        rf"\s*(?:[–-]\s*(?:Present|Current|(?:{MONTH_PATTERN})\s+\d{{4}}|\d{{4}}))?))$",
        re.IGNORECASE,
    )
    year_range = re.compile(
        r"^(?P<title>.*?)(?:,?\s*(?P<date>\d{4}\s*[–-]\s*(?:\d{4}|Present|Current)|\d{4}|Present|Current))$",
        re.IGNORECASE,
    )

    for pattern in (month_range, year_range):
        match = pattern.match(text)
        if match:
            title = (match.group("title") or "").rstrip(",-– ").strip()
            date = (match.group("date") or "").strip()
            return title, date

    return text, ""


def parse_work_experience_header(text: str) -> dict[str, str]:
    """Parse work experience header into parts for export."""
    header_text = text.replace("**", "").strip()
    if not header_text:
        return {"company": "", "location": "", "title": "", "date_range": ""}

    if " / " in header_text:
        parts = [part.strip() for part in header_text.split(" / ") if part.strip()]
        if len(parts) >= 4:
            return {
                "company": parts[0],
                "location": parts[1],
                "title": parts[2],
                "date_range": parts[3],
            }
        if len(parts) == 3:
            return {
                "company": parts[0],
                "location": "",
                "title": parts[1],
                "date_range": parts[2],
            }
        if len(parts) == 2:
            return {"company": parts[0], "location": "", "title": parts[1], "date_range": ""}

    if " - " in header_text:
        company, rest = header_text.split(" - ", 1)
        title, date_range = _split_title_date(rest)
        return {
            "company": company.strip(),
            "location": "",
            "title": title,
            "date_range": date_range,
        }

    title, date_range = _split_title_date(header_text)
    return {"company": title, "location": "", "title": "", "date_range": date_range}


def apply_replacements(text: str, replacements: dict[str, str]) -> str:
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


def format_work_experience_bullets(bullets: list[BulletParam], replacements: dict[str, str]) -> str:
    """Format work experience bullets with proper company headers and tasks
    CRITICAL: Filters out bullets with params.visible === False to respect user visibility settings
    """
    html_parts = []
    current_company = None
    current_list_items = []
    current_header_visible = True

    for bullet in bullets:
        # CRITICAL: Filter out bullets with visible === false
        if bullet.params and bullet.params.get("visible") is False:
            continue

        if not bullet.text.strip():
            continue

        bullet_text = apply_replacements(bullet.text, replacements)

        # Check if this is a company header (starts with **)
        if bullet_text.startswith("**") and "**" in bullet_text[2:]:
            # CRITICAL: Check if header is visible - hide header and all its bullets if not visible
            is_header_visible = not (bullet.params and bullet.params.get("visible") is False)
            current_header_visible = is_header_visible

            if not is_header_visible:
                continue
            # If we have accumulated list items, wrap them in <ul> and add to html_parts
            if current_list_items:
                html_parts.append("<ul>")
                html_parts.extend(current_list_items)
                html_parts.append("</ul>")
                current_list_items = []

            # Close previous job entry if needed
            if current_company:
                html_parts.append("</div>")

            header_parts = parse_work_experience_header(bullet_text)
            company_name = header_parts["company"]
            location = header_parts["location"]
            title = header_parts["title"]
            date_range = header_parts["date_range"]

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
            # CRITICAL: Only add bullets if their header is visible
            if not current_header_visible:
                continue

            # Regular task bullet - remove leading bullet markers first
            bullet_text = bullet_text.lstrip('•').lstrip('-').lstrip('*').lstrip()
            if bullet_text.startswith('• ') or bullet_text.startswith('- ') or bullet_text.startswith('* '):
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


def format_regular_bullets(bullets: list[BulletParam], replacements: dict[str, str], section_title: str = "") -> str:
    """Format regular section bullets
    CRITICAL: Filters out bullets with params.visible === False to respect user visibility settings
    """
    # CRITICAL: Filter out bullets with visible === false
    visible_bullets = [
        bullet for bullet in bullets
        if not (bullet.params and bullet.params.get("visible") is False)
    ]

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
        for bullet in visible_bullets:
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
    for bullet in visible_bullets:
        if bullet.text.strip():
            bullet_text = apply_replacements(bullet.text, replacements)

            # Remove any leading bullet markers first (•, -, *, etc.)
            bullet_text = bullet_text.lstrip('•').lstrip('-').lstrip('*').lstrip()
            if bullet_text.startswith('• ') or bullet_text.startswith('- ') or bullet_text.startswith('* '):
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

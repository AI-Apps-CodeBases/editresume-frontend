"""Text extraction from resume data - extracted from EnhancedATSChecker.

This module handles extracting all visible text content from resume data structures,
filtering out invisible bullets and formatting markdown headers.
"""
from typing import Dict, Union


def get_value(obj, key, default=""):
    """Helper to get value from object or dict."""
    if hasattr(obj, key):
        return getattr(obj, key, default)
    elif isinstance(obj, dict):
        return obj.get(key, default)
    return default


def extract_text_from_resume(resume_data: Dict, separate_sections: bool = False) -> Union[str, Dict[str, str]]:
    """Extract all text content from resume data.
    
    Filters out invisible bullets (visible=false) and handles markdown formatting.
    
    Args:
        resume_data: Resume data dictionary with name, title, summary, sections
        separate_sections: If True, returns dict with 'summary' and 'sections' keys
        
    Returns:
        String of all text, or dict if separate_sections=True
    """
    text_parts = []

    # Add basic info
    name = get_value(resume_data, "name")
    if name:
        text_parts.append(name)

    title = get_value(resume_data, "title")
    if title:
        text_parts.append(title)

    summary = get_value(resume_data, "summary")
    if summary:
        text_parts.append(summary)

    # Add sections
    sections = get_value(resume_data, "sections", [])
    for section in sections:
        section_title = get_value(section, "title")
        if section_title:
            text_parts.append(section_title)

        bullets = get_value(section, "bullets", [])
        for bullet in bullets:
            # Filter out invisible bullets (visible=false)
            bullet_params = get_value(bullet, "params", {})
            if isinstance(bullet_params, dict) and bullet_params.get("visible") is False:
                continue  # Skip invisible bullets
            
            bullet_text = get_value(bullet, "text")
            if bullet_text:
                # Extract company headers from work experience sections
                # Format: **Company / Role / Date** or **Company / Role / Date**
                if bullet_text.startswith("**") and bullet_text.endswith("**"):
                    # Remove markdown formatting but keep the content
                    clean_text = bullet_text.replace("**", "").strip()
                    # Split by / to extract company, role, and date separately
                    parts = [p.strip() for p in clean_text.split("/")]
                    for part in parts:
                        if part:
                            text_parts.append(part)
                    # Also add the full text for context
                    text_parts.append(clean_text)
                else:
                    # Regular bullet point
                    text_parts.append(bullet_text)
            
            # Also check for any additional metadata in bullet params (excluding visible flag)
            if isinstance(bullet_params, dict):
                for key, value in bullet_params.items():
                    if key != "visible" and isinstance(value, str) and value.strip():
                        text_parts.append(value)

    if separate_sections:
        return {
            "summary": summary or "",
            "sections": " ".join([
                (get_value(s, "title", "") + " " + " ".join([
                    get_value(b, "text", "") 
                    for b in get_value(s, "bullets", [])
                ])).strip()
                for s in sections
            ])
        }
    
    return " ".join(text_parts)


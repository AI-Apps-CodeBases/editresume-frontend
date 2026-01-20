"""Two-phase AI parsing for text-based resume extraction."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings
from app.core.openai_client import get_httpx_client, openai_client

logger = logging.getLogger(__name__)


async def parse_with_structured_ai(
    extracted_data: dict[str, Any],
    layout_data: dict[str, Any],
    raw_text: str
) -> dict[str, Any]:
    """
    Two-phase AI parsing:
    
    Phase 1: Structure Detection - identify section boundaries and types
    Phase 2: Content Extraction - extract structured content per section
    
    Returns parsed resume data in standard format.
    """
    if not openai_client:
        logger.warning("OpenAI client not available, cannot use structured parser")
        return _create_empty_result()

    try:
        # Phase 1: Structure Detection
        structure_map = await _detect_structure(raw_text, layout_data)
        
        # Phase 2: Content Extraction
        parsed_data = await _extract_content(raw_text, structure_map)
        
        return parsed_data
        
    except (asyncio.TimeoutError, httpx.ReadTimeout) as e:
        # Re-raise timeout exceptions so orchestrator can handle fallback
        logger.error(f"Structured parsing timeout: {e}")
        raise
    except Exception as e:
        logger.error(f"Structured parsing failed: {e}", exc_info=True)
        return _create_empty_result()


async def _detect_structure(
    text: str,
    layout_data: dict[str, Any]
) -> dict[str, Any]:
    """Phase 1: Detect section boundaries and types."""
    headers = layout_data.get('headers', [])
    
    # Build structured text with position hints
    structured_text = text[:15000]  # Limit for API
    
    prompt = f"""Given this resume text with preserved structure, analyze it step by step.

Resume Text:
{structured_text}

Step 1: Identify all section headers and their types.
Step 2: For each section, identify the hierarchical structure (company → role → bullets).
Step 3: Return a document map as JSON.

Return ONLY valid JSON (no markdown code blocks):
{{
    "sections": [
        {{
            "title": "section name",
            "type": "experience" | "education" | "skills" | "projects" | "summary" | "other",
            "start_position": {{"line": int}},
            "end_position": {{"line": int}},
            "structure": "flat" | "hierarchical" | "tabular"
        }}
    ]
}}"""

    model = getattr(settings, 'openai_model_text', 'gpt-4o-mini')
    
    response = await _call_openai(prompt, model, temperature=0.3)
    
    # Clean and parse JSON
    response_text = response.strip()
    response_text = re.sub(r"^```json\s*", "", response_text)
    response_text = re.sub(r"\s*```$", "", response_text)
    
    try:
        structure_map = json.loads(response_text)
        logger.info(f"Structure detection found {len(structure_map.get('sections', []))} sections")
        return structure_map
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse structure detection response: {e}")
        logger.debug(f"Response text: {response_text[:500]}")
        return {'sections': []}


async def _extract_content(
    text: str,
    structure_map: dict[str, Any]
) -> dict[str, Any]:
    """Phase 2: Extract structured content for all sections in one optimized call."""
    sections_map = structure_map.get('sections', [])
    
    result = {
        'name': '',
        'title': '',
        'email': '',
        'phone': '',
        'location': '',
        'summary': '',
        'sections': []
    }
    
    # Extract contact info from header
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if email_match:
        result['email'] = email_match.group()
    
    phone_match = re.search(r'[\+\(]?[0-9][0-9 .\-\(\)]{8,}[0-9]', text)
    if phone_match:
        result['phone'] = phone_match.group()
    
    # Extract name (typically first line)
    lines = text.split('\n')
    if lines:
        result['name'] = lines[0].strip()
        if len(lines) > 1:
            result['title'] = lines[1].strip()
    
    # Try to extract summary from header area (before sections)
    # Look for common summary indicators in first 20 lines
    summary_keywords = ['summary', 'professional summary', 'objective', 'profile', 'about', 'overview']
    for i, line in enumerate(lines[:20]):
        line_lower = line.lower().strip()
        if any(keyword in line_lower for keyword in summary_keywords) and len(line_lower) < 50:
            # Found summary header, collect following lines until next section
            summary_lines = []
            for j in range(i + 1, min(i + 10, len(lines))):
                next_line = lines[j].strip()
                # Stop if we hit another section header
                if next_line and (next_line.isupper() or len(next_line) < 50 and any(
                    section_kw in next_line.lower() for section_kw in ['experience', 'education', 'skills', 'projects', 'certifications']
                )):
                    break
                if next_line and not next_line.startswith(('•', '-', '*')):
                    summary_lines.append(next_line)
            if summary_lines:
                result['summary'] = ' '.join(summary_lines)
                break
    
    # Batch extract all sections in one API call for efficiency
    if sections_map:
        all_content = await _extract_all_sections_batch(text, sections_map)
        
        # Extract summary first (from top-level or summary section)
        extracted_summary = all_content.get('summary', '')
        if extracted_summary:
            result['summary'] = extracted_summary
        else:
            # Try to find summary in sections
            for section_info in sections_map:
                if section_info.get('type', '').lower() == 'summary':
                    section_title = section_info.get('title', '')
                    sections_dict = all_content.get('sections', {})
                    section_content = sections_dict.get(section_title, {})
                    if not section_content:
                        # Try case-insensitive match
                        for key, value in sections_dict.items():
                            if key.lower() == section_title.lower():
                                section_content = value
                                break
                    if section_content:
                        # Summary might be in text field or as entries
                        summary_text = section_content.get('text', '') or section_content.get('content', '')
                        if not summary_text and section_content.get('entries'):
                            # Summary might be formatted as entries
                            entries = section_content.get('entries', [])
                            if entries and isinstance(entries[0], str):
                                summary_text = ' '.join(entries)
                            elif entries and isinstance(entries[0], dict):
                                summary_text = ' '.join(e.get('text', '') or str(e) for e in entries)
                        if summary_text:
                            result['summary'] = summary_text
                            break
        
        # Process extracted content
        sections_dict = all_content.get('sections', {})
        
        for section_idx, section_info in enumerate(sections_map):
            section_type = section_info.get('type', 'other')
            section_title = section_info.get('title', '')
            
            # Skip summary section - already processed above
            if section_type == 'summary':
                continue
            
            # Try to find section content by exact match or case-insensitive match
            section_content = sections_dict.get(section_title, {})
            if not section_content:
                # Try case-insensitive match
                section_title_lower = section_title.lower()
                for key, value in sections_dict.items():
                    if key.lower() == section_title_lower:
                        section_content = value
                        break
            
            # Get actual section type from response if available
            actual_type = section_content.get('type', section_type)
            
            # Convert to bullets format
            bullets = []
            if actual_type == 'experience' or section_type == 'experience':
                entries = section_content.get('entries', [])
                for entry_idx, entry in enumerate(entries):
                    if isinstance(entry, dict):
                        company = entry.get('company', '')
                        title = entry.get('title', '')
                        dates = entry.get('dates', {})
                        if isinstance(dates, dict):
                            date_str = f"{dates.get('start', '')} - {dates.get('end', 'Present')}"
                        else:
                            date_str = str(dates)
                        bullets.append({
                            'id': f"{section_idx}-{entry_idx}-0",
                            'text': f"**{company} / {title} / {date_str}**",
                            'params': {}
                        })
                        for bullet_idx, bullet_text in enumerate(entry.get('bullets', []), 1):
                            bullets.append({
                                'id': f"{section_idx}-{entry_idx}-{bullet_idx}",
                                'text': f"• {bullet_text}",
                                'params': {}
                            })
            elif actual_type == 'education' or section_type == 'education':
                entries = section_content.get('entries', [])
                for entry_idx, entry in enumerate(entries):
                    if isinstance(entry, dict):
                        institution = entry.get('institution', '')
                        degree = entry.get('degree', '')
                        field = entry.get('field', '')
                        year = entry.get('graduation_date', '')
                        bullets.append({
                            'id': f"{section_idx}-{entry_idx}",
                            'text': f"{degree}, {institution}, {field}" + (f", {year}" if year else ""),
                            'params': {}
                        })
            elif actual_type == 'skills' or section_type == 'skills':
                skills = section_content.get('skills', [])
                for skill_idx, skill in enumerate(skills):
                    bullets.append({
                        'id': f"{section_idx}-{skill_idx}",
                        'text': str(skill),
                        'params': {}
                    })
            else:
                # Generic section - use raw text or entries
                content_text = section_content.get('text', '') or section_content.get('content', '')
                if content_text:
                    for line_idx, line in enumerate(content_text.split('\n')):
                        if line.strip():
                            bullets.append({
                                'id': f"{section_idx}-{line_idx}",
                                'text': line.strip(),
                                'params': {}
                            })
                # Also check for entries in generic sections
                entries = section_content.get('entries', [])
                for entry_idx, entry in enumerate(entries):
                    if isinstance(entry, str):
                        bullets.append({
                            'id': f"{section_idx}-{entry_idx}",
                            'text': entry,
                            'params': {}
                        })
                    elif isinstance(entry, dict):
                        # Try to format as text
                        text_parts = [v for v in entry.values() if v]
                        bullets.append({
                            'id': f"{section_idx}-{entry_idx}",
                            'text': ' / '.join(str(p) for p in text_parts),
                            'params': {}
                        })
            
            if bullets:
                result['sections'].append({
                    'id': str(section_idx),
                    'title': section_title,
                    'bullets': bullets
                })
    
    return result


async def _extract_all_sections_batch(
    text: str,
    sections_map: list[dict[str, Any]]
) -> dict[str, Any]:
    """Extract all sections in one optimized API call."""
    sections_list = []
    for section in sections_map:
        sections_list.append({
            'title': section.get('title', ''),
            'type': section.get('type', 'other')
        })
    
    # Build simplified section list for prompt
    section_titles = [s.get('title', '') for s in sections_list]
    section_types = {s.get('title', ''): s.get('type', 'other') for s in sections_list}
    
    prompt = f"""Extract resume content for these sections: {', '.join(section_titles)}

Resume Text:
{text[:12000]}

Return JSON:
{{
    "summary": "professional summary if present",
    "sections": {{
        "Section Title": {{
            "type": "experience" | "education" | "skills" | "other",
            "entries": [{{"company": "...", "title": "...", "dates": {{"start": "...", "end": "..."}}, "bullets": ["..."]}}],
            "skills": ["skill1", "skill2"],
            "text": "content for other sections"
        }}
    }}
}}

Rules:
- Extract exactly as written, no paraphrasing
- CRITICAL: Extract professional summary/objective from the header area (usually at the top after name/title)
- If you see "Summary", "Professional Summary", "Objective", "Profile", or similar section, extract ALL text from that section into the "summary" field
- For experience: company, title, dates, all bullets
- For education: institution, degree, field, year
- For skills: list all skills
- Return ONLY valid JSON, no markdown"""

    model = getattr(settings, 'openai_model_text', 'gpt-4o-mini')
    
    try:
        # Add timeout to individual API call
        response = await asyncio.wait_for(
            _call_openai(prompt, model, temperature=0.3, max_tokens=4000),
            timeout=45.0  # 45 second timeout for this call
        )
    except asyncio.TimeoutError:
        logger.error("Batch extraction API call timed out")
        return {'summary': '', 'sections': {}}
    
    try:
        response_text = response.strip()
        response_text = re.sub(r"^```json\s*", "", response_text)
        response_text = re.sub(r"\s*```$", "", response_text)
        data = json.loads(response_text)
        
        # Normalize the response structure - simplified format
        result = {
            'summary': data.get('summary', ''),
            'sections': data.get('sections', {})
        }
        
        return result
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse batch extraction response: {e}")
        logger.debug(f"Response text: {response_text[:500]}")
        return {'summary': '', 'sections': {}}


async def _extract_experience_section(
    text: str,
    section_info: dict[str, Any]
) -> list[dict[str, Any]]:
    """Extract work experience entries."""
    prompt = f"""Extract work experience entries from this resume section.

Resume Text:
{text[:10000]}

Section: {section_info.get('title', 'Experience')}

Return JSON array:
{{
    "entries": [
        {{
            "company": "Company Name",
            "title": "Job Title",
            "location": "City, State",
            "dates": {{"start": "Month Year", "end": "Month Year" | "Present"}},
            "bullets": ["achievement 1", "achievement 2"]
        }}
    ]
}}

Return ONLY valid JSON (no markdown code blocks)."""

    model = getattr(settings, 'openai_model_text', 'gpt-4o-mini')
    response = await _call_openai(prompt, model, temperature=0.3)
    
    try:
        response_text = response.strip()
        response_text = re.sub(r"^```json\s*", "", response_text)
        response_text = re.sub(r"\s*```$", "", response_text)
        data = json.loads(response_text)
        return data.get('entries', [])
    except json.JSONDecodeError:
        return []


async def _extract_education_section(
    text: str,
    section_info: dict[str, Any]
) -> list[dict[str, Any]]:
    """Extract education entries."""
    prompt = f"""Extract education entries from this resume section.

Resume Text:
{text[:10000]}

Section: {section_info.get('title', 'Education')}

Return JSON array:
{{
    "entries": [
        {{
            "institution": "University Name",
            "degree": "Degree Name",
            "field": "Field of Study",
            "graduation_date": "Year",
            "gpa": "GPA if available",
            "details": ["honor 1", "honor 2"]
        }}
    ]
}}

Return ONLY valid JSON (no markdown code blocks)."""

    model = getattr(settings, 'openai_model_text', 'gpt-4o-mini')
    response = await _call_openai(prompt, model, temperature=0.3)
    
    try:
        response_text = response.strip()
        response_text = re.sub(r"^```json\s*", "", response_text)
        response_text = re.sub(r"\s*```$", "", response_text)
        data = json.loads(response_text)
        return data.get('entries', [])
    except json.JSONDecodeError:
        return []


async def _extract_skills_section(
    text: str,
    section_info: dict[str, Any]
) -> list[str]:
    """Extract skills."""
    prompt = f"""Extract skills from this resume section.

Resume Text:
{text[:10000]}

Section: {section_info.get('title', 'Skills')}

Return JSON array:
{{
    "skills": ["skill1", "skill2", "skill3"]
}}

Return ONLY valid JSON (no markdown code blocks)."""

    model = getattr(settings, 'openai_model_text', 'gpt-4o-mini')
    response = await _call_openai(prompt, model, temperature=0.3)
    
    try:
        response_text = response.strip()
        response_text = re.sub(r"^```json\s*", "", response_text)
        response_text = re.sub(r"\s*```$", "", response_text)
        data = json.loads(response_text)
        return data.get('skills', [])
    except json.JSONDecodeError:
        return []


async def _extract_summary_section(
    text: str,
    section_info: dict[str, Any]
) -> str:
    """Extract summary/professional summary."""
    lines = text.split('\n')
    # Find summary section and extract text
    for i, line in enumerate(lines):
        if 'summary' in line.lower() or 'profile' in line.lower():
            # Get next few lines as summary
            summary_lines = []
            for j in range(i + 1, min(i + 5, len(lines))):
                if lines[j].strip() and not lines[j].strip().isupper():
                    summary_lines.append(lines[j].strip())
            return ' '.join(summary_lines)
    return ''


async def _extract_generic_section(
    text: str,
    section_info: dict[str, Any]
) -> list[str]:
    """Extract generic section content."""
    return []


async def _call_openai(prompt: str, model: str, temperature: float = 0.3, max_tokens: int = 2000) -> str:
    """Call OpenAI API and return response text."""
    if not openai_client:
        raise ValueError("OpenAI client not available")
    
    headers = {
        "Authorization": f"Bearer {openai_client['api_key']}",
        "Content-Type": "application/json",
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a resume parsing expert. Extract structured information accurately. Always return valid JSON."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    httpx_client = get_httpx_client()
    if httpx_client:
        # Use shorter timeout for individual calls
        timeout = httpx.Timeout(40.0, connect=5.0)
        response = await httpx_client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=timeout,
        )
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
        else:
            raise Exception(f"OpenAI API error: {response.status_code}")
    else:
        raise Exception("HTTP client not available")


def _create_empty_result() -> dict[str, Any]:
    """Create empty result structure."""
    return {
        'name': '',
        'title': '',
        'email': '',
        'phone': '',
        'location': '',
        'summary': '',
        'sections': []
    }

"""Vision-based parsing using GPT-4o for complex layouts."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from typing import Any

from app.core.config import settings
from app.core.openai_client import get_httpx_client, openai_client

logger = logging.getLogger(__name__)


async def parse_with_vision(
    vision_pages: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Use GPT-4o Vision to extract structured content from resume images.
    
    Args:
        vision_pages: List of page data with base64 images from vision extractor
        
    Returns:
        Parsed resume data in standard format
    """
    if not openai_client:
        logger.warning("OpenAI client not available, cannot use vision parser")
        return _create_empty_result()

    try:
        model = getattr(settings, 'openai_model_vision', 'gpt-4o')
        
        # Process all pages in parallel for faster parsing
        logger.info(f"Processing {len(vision_pages)} pages in parallel with vision")
        page_tasks = [
            _process_page_with_vision(
                page_data['image_base64'],
                model,
                page_data['page_num']
            )
            for page_data in vision_pages
        ]
        
        # Wait for all pages to complete in parallel
        page_results = await asyncio.gather(*page_tasks, return_exceptions=True)
        
        # Merge results from all pages
        all_sections = []
        contact_info = {
            'name': '',
            'title': '',
            'email': '',
            'phone': '',
            'location': ''
        }
        summary = ''
        
        for idx, result in enumerate(page_results):
            if isinstance(result, Exception):
                logger.error(f"Error processing page {idx + 1}: {result}")
                continue
                
            # Merge contact info (use first non-empty value)
            if result.get('name') and not contact_info['name']:
                contact_info['name'] = result.get('name', '')
            if result.get('title') and not contact_info['title']:
                contact_info['title'] = result.get('title', '')
            if result.get('email') and not contact_info['email']:
                contact_info['email'] = result.get('email', '')
            if result.get('phone') and not contact_info['phone']:
                contact_info['phone'] = result.get('phone', '')
            if result.get('location') and not contact_info['location']:
                contact_info['location'] = result.get('location', '')
            
            if result.get('summary') and not summary:
                summary = result.get('summary', '')
            
            # Merge sections (avoid duplicates)
            for section in result.get('sections', []):
                # Check if section already exists
                existing = next(
                    (s for s in all_sections if s['title'].lower() == section['title'].lower()),
                    None
                )
                if existing:
                    # Merge bullets
                    existing['bullets'].extend(section['bullets'])
                else:
                    all_sections.append(section)
        
        return {
            **contact_info,
            'summary': summary,
            'sections': all_sections
        }
        
    except Exception as e:
        logger.error(f"Vision parsing failed: {e}", exc_info=True)
        return _create_empty_result()


async def _process_page_with_vision(
    image_base64: str,
    model: str,
    page_num: int
) -> dict[str, Any]:
    """Process a single page image with vision API."""
    
    prompt = """Analyze this resume page image and extract ALL information preserving the exact layout.

Return JSON with this exact structure:
{
    "name": "Full Name",
    "title": "Professional Title",
    "email": "email@example.com",
    "phone": "+1-234-567-8900",
    "location": "City, State",
    "summary": "Professional summary if present",
    "sections": [
        {
            "title": "section name",
            "type": "experience" | "education" | "skills" | "projects" | "summary" | "other",
            "bullets": [
                "**Company Name / Job Title / Start Date - End Date**" or "**Company Name / Job Title / Date Range**" if dates missing,
                "• Achievement or task",
                "• Another achievement"
            ]
        }
    ]
}

CRITICAL RULES:
1. Preserve exact wording - do not paraphrase
2. For work experience: Identify by COMPANY NAME and JOB TITLE. Format as "**Company / Title / Dates**" if dates present, or "**Company / Title / Date Range**" if dates missing. Dates are OPTIONAL - do not skip entries without dates.
3. Extract ALL sections visible on this page
4. Maintain section boundaries based on headers in the image
5. Include ALL work experience entries even if they lack dates - identify them by company name + job title only
6. Return ONLY valid JSON, no markdown code blocks"""

    headers = {
        "Authorization": f"Bearer {openai_client['api_key']}",
        "Content-Type": "application/json",
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a resume parsing expert specializing in extracting structured information from resume images. Always return valid JSON."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image_base64}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": settings.openai_max_tokens,
    }
    
    httpx_client = get_httpx_client()
    if not httpx_client:
        raise Exception("HTTP client not available")
    
    response = await httpx_client.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=data,
        timeout=120.0,  # Vision API can take longer
    )
    
    if response.status_code != 200:
        error_text = response.text if hasattr(response, 'text') else str(response.content)
        logger.error(f"OpenAI Vision API error: {response.status_code} - {error_text}")
        raise Exception(f"Vision API error: {response.status_code}")
    
    result = response.json()
    ai_response = result["choices"][0]["message"]["content"].strip()
    
    # Clean JSON response
    ai_response = re.sub(r"^```json\s*", "", ai_response)
    ai_response = re.sub(r"\s*```$", "", ai_response)
    
    try:
        parsed = json.loads(ai_response)
        
        # Convert bullets to standard format
        sections = []
        for section in parsed.get('sections', []):
            bullets = []
            for idx, bullet_text in enumerate(section.get('bullets', [])):
                bullets.append({
                    'id': f"{len(sections)}-{idx}",
                    'text': bullet_text,
                    'params': {}
                })
            
            sections.append({
                'id': str(len(sections)),
                'title': section.get('title', ''),
                'bullets': bullets
            })
        
        return {
            'name': parsed.get('name', ''),
            'title': parsed.get('title', ''),
            'email': parsed.get('email', ''),
            'phone': parsed.get('phone', ''),
            'location': parsed.get('location', ''),
            'summary': parsed.get('summary', ''),
            'sections': sections
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse vision response: {e}")
        logger.debug(f"Response text: {ai_response[:500]}")
        return _create_empty_result()


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

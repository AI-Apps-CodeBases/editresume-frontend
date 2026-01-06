"""Resume structure analysis - extracted from EnhancedATSChecker.

This module analyzes resume structure, checking for required sections and calculating
structure scores based on completeness.
"""
from typing import Dict, Any

from app.services.ats.text_extractor import extract_text_from_resume


# Required sections configuration
REQUIRED_SECTIONS = {
    "contact": ["name", "email", "phone", "location", "address"],
    "summary": ["summary", "objective", "profile", "about"],
    "experience": [
        "experience",
        "work",
        "employment",
        "career",
        "professional",
    ],
    "education": ["education", "academic", "degree", "qualifications"],
}


def analyze_resume_structure(resume_data: Dict) -> Dict[str, Any]:
    """Comprehensive analysis of resume structure.
    
    Checks for required sections and calculates structure score based on:
    - Found sections (20 points each)
    - Contact info bonus (10 points)
    - Section count bonus (up to 20 points)
    - Experience sections bonus (up to 8 points)
    - Summary bonus (5 points)
    
    Args:
        resume_data: Resume data dictionary
        
    Returns:
        Dict with found_sections, missing_sections, section_score, etc.
    """
    text_content = extract_text_from_resume(resume_data).lower()

    # Check required sections
    found_sections = {}
    missing_sections = []

    for section_type, keywords in REQUIRED_SECTIONS.items():
        found = False

        # Check in sections
        sections = resume_data.get("sections", [])
        for section in sections:
            section_title = section.get("title", "").lower()
            for keyword in keywords:
                if keyword in section_title:
                    found = True
                    break
            if found:
                break

        # Check in text content
        if not found:
            for keyword in keywords:
                if keyword in text_content:
                    found = True
                    break

        found_sections[section_type] = found
        if not found:
            missing_sections.append(section_type)

    # Realistic scoring: More accurate base score and better scaling
    found_count = sum(1 for found in found_sections.values() if found)
    base_section_score = found_count * 20  # Realistic: 20 points per section
    
    # Bonus for having contact info
    contact_bonus = 10 if bool(
        resume_data.get("email") or resume_data.get("phone")
    ) else 0
    
    # Bonus for having multiple sections (encourages completeness)
    sections = resume_data.get("sections", [])
    section_count = len(sections)
    section_count_bonus = min(20, section_count * 2)  # Increased cap from 15 to 20
    
    # Bonus for work experience sections (rewards adding experience)
    experience_sections = [s for s in sections if any(
        keyword in s.get("title", "").lower() 
        for keyword in ["experience", "employment", "work", "career", "professional"]
    )]
    experience_bonus = min(8, len(experience_sections) * 2)  # 2 points per experience section, up to 8
    
    # Reduced bonus for having summary/objective to prevent unfair advantage
    summary_bonus = 5 if resume_data.get("summary") else 0
    
    section_score = min(100, base_section_score + contact_bonus + section_count_bonus + summary_bonus + experience_bonus)
    
    # More realistic minimum score - only if resume has meaningful content
    if len(resume_data.get("sections", [])) > 0:
        section_score = max(15, section_score)  # Reduced from 30 to 15 for more realistic scoring

    return {
        "found_sections": found_sections,
        "missing_sections": missing_sections,
        "section_score": section_score,
        "total_sections": len(resume_data.get("sections", [])),
        "has_contact_info": bool(
            resume_data.get("email") or resume_data.get("phone")
        ),
    }


"""Content generation prompts for resumes."""

from __future__ import annotations


def get_bullet_points_prompt(
    role: str, company: str, skills: str, count: int, tone: str
) -> str:
    """Generate bullet points prompt."""
    tone_instructions = {
        "professional": "Use professional, corporate language with strong action verbs",
        "technical": "Use technical terminology and methodologies, focus on tools and processes",
        "formal": "Use formal, executive-level language with strategic focus",
        "casual": "Use conversational but workplace-appropriate language",
    }

    tone_instruction = tone_instructions.get(tone, tone_instructions["professional"])

    return f"""Generate {count} resume bullet points:

Role: {role}
Company: {company}
Skills: {skills}

Requirements:
- Include metrics/numbers
- Use strong action verbs
- Focus on achievements
- 1-2 lines each
- {tone_instruction}
- ATS-friendly

Return ONLY bullet points, one per line."""


def get_summary_prompt(
    role: str, years_experience: int, skills: str, achievements: str | None = None
) -> str:
    """Generate professional summary prompt."""
    achievements_text = (
        f"Key achievements: {achievements}" if achievements else ""
    )

    return f"""
Role: {role}
Experience: {years_experience} years
Skills: {skills}
{achievements_text}

Requirements:
- Concise and impactful (50-80 words)
- Highlight key strengths and value proposition
- Include relevant technical skills and experience
- ATS-optimized with industry keywords
- Professional tone
- Focus on achievements and impact

Return ONLY the summary text, no explanations or labels."""


def get_bullet_from_keywords_prompt(
    company_title: str | None,
    job_title: str | None,
    jd_excerpt: str | None,
    keywords_str: str,
    resume_excerpt: str | None,
    count: int,
    missing_keywords: list[str] | None = None,
) -> str:
    """Generate bullet points from keywords prompt."""
    # Only use the selected keywords - do not add missing keywords
    # The keywords_str parameter contains the user-selected keywords that should be used

    # Count keywords for distribution guidance
    keyword_count = len([kw.strip() for kw in keywords_str.split(',') if kw.strip()])

    return f"""You are crafting high-impact resume bullet points.

Company: {company_title or 'Not specified'}
Role: {job_title or 'Not specified'}
Job Description Context:
{jd_excerpt if jd_excerpt else 'Not provided'}

SELECTED KEYWORDS (MUST use these - user selected these specific keywords):
{keywords_str}

Resume context (useful achievements or tools):
{resume_excerpt if resume_excerpt else 'Limited additional context provided'}

CRITICAL REQUIREMENTS:
- Generate {count} distinct professional resume bullet points
- MUST use ONLY the selected keywords listed above - do not add keywords that were not selected by the user
- ALL selected keywords MUST be used across the bullets - ensure every selected keyword appears in at least one bullet
- Distribute keywords evenly: you have {count} bullets and {keyword_count} keywords - distribute them so all {keyword_count} keywords are used
- Each bullet must incorporate at least one of the selected keywords naturally
- If you have more keywords than bullets, some bullets will need to contain multiple keywords naturally
- Do NOT add any keywords that are not in the selected keywords list above
- Include metrics or quantified outcomes when possible
- Use strong action verbs, professional tone, and ATS-friendly formatting
- Each bullet: 1-2 lines (max 35 words)
- Make bullets cover different achievements or angles

IMPORTANT: Before returning, verify that ALL {keyword_count} selected keywords have been used in at least one bullet. If any keyword is missing, regenerate bullets to include it.

Return ONLY a valid JSON array of plain strings, e.g. ["Bullet 1", "Bullet 2"]."""


def get_bullets_from_keywords_prompt(
    current_bullet: str,
    keywords_str: str,
    company_title: str | None,
    job_title: str | None,
    jd_excerpt: str | None,
    missing_keywords: list[str] | None = None,
) -> str:
    """Improve bullet point with keywords prompt."""
    missing_kw_note = ""
    if missing_keywords and len(missing_keywords) > 0:
        # Check which missing keywords are in the provided keywords_str
        missing_in_provided = [kw for kw in missing_keywords if kw.lower() in keywords_str.lower()]
        if missing_in_provided:
            missing_kw_note = f"""
HIGH PRIORITY - Missing Keywords (MUST include these naturally):
{', '.join(missing_in_provided[:5])}

These keywords are currently MISSING from your resume and are HIGH PRIORITY for ATS score improvement.
Ensure the improved bullet includes these missing keywords naturally.
"""

    return f"""Improve this resume bullet to maximize impact and include the specified keywords naturally.

Current bullet: "{current_bullet}"

Keywords to integrate: {keywords_str}
{missing_kw_note}
Company: {company_title or 'Not specified'}
Role: {job_title or 'Not specified'}
Job Description Context:
{jd_excerpt if jd_excerpt else 'Not provided'}

Requirements:
- Enhance the bullet with the keywords naturally woven in
- PRIORITY: If any missing keywords are provided above, they MUST appear in the improved bullet
- Add quantifiable metrics or outcomes if possible
- Maintain professional tone and ATS-friendly format
- Keep it concise (1-2 lines, max 35 words)
- Make it achievement-focused

Return ONLY the improved bullet point text, no explanations."""


def get_summary_from_experience_prompt(
    title: str | None,
    work_experience_text: str | None,
    skills_text: str | None,
    keyword_guidance: str,
    job_description_excerpt: str | None,
    existing_summary: str | None,
    missing_keywords: list[str] | None = None,
    company_name: str | None = None,
) -> str:
    """Generate professional summary from work experience prompt."""
    missing_kw_section = ""
    if missing_keywords and len(missing_keywords) > 0:
        # Limit to 5-8 missing keywords (use up to 8)
        limited_missing = missing_keywords[:8]
        missing_kw_section = f"""
CRITICAL - Missing Keywords from Job Description (HIGH PRIORITY - MUST include these naturally):
{', '.join(limited_missing)}

These keywords are currently MISSING from your resume and MUST be incorporated 
into the summary to improve ATS score. Use them naturally in context - they are 
the highest priority for inclusion.
"""

    company_warning = ""
    if company_name:
        company_warning = f"""
CRITICAL: NEVER mention or reference the company name "{company_name}" or any company name from the job description in the professional summary. 
The summary should be generic and applicable to any role, not specific to any particular company.
"""

    return f"""Analyze this professional's work experience and create a compelling ATS-optimized professional summary.

Professional Title: {title if title else 'Not specified'}

Work Experience:
{work_experience_text if work_experience_text else 'Limited information provided'}

Skills:
{skills_text if skills_text else 'To be extracted from experience'}

 Target Job Description Keywords (blend these naturally into the narrative):
{keyword_guidance}
{missing_kw_section}
{company_warning}
 Job Description Snapshot (for context):
{job_description_excerpt if job_description_excerpt else 'Not provided'}

 Existing Summary (for reference only – produce a new, improved summary):
{existing_summary if existing_summary else 'No existing summary provided'}

Requirements for the Professional Summary:
1. Length: 4-7 sentences (minimum 4 sentences, maximum 7 sentences, approximately 80-120 words)
2. ATS-Optimized: Include relevant keywords from their experience and industry
3. Structure:
   - Sentence 1: Opening statement with years of experience and core expertise
   - Sentences 2-4: Key achievements, skills, and value proposition with specific metrics when available
   - Sentences 5-6 (if needed): Technical competencies and areas of expertise
   - Final sentence: Career objective or unique value add
4. Include specific technologies, tools, and methodologies mentioned in experience
5. Use action-oriented language and quantifiable achievements
6. Professional, confident tone
7. Third-person perspective (avoid "I")
8. Focus on impact and results
9. Include industry-specific keywords for ATS systems
10. Prioritize incorporating the provided priority and missing JD keywords verbatim when it fits naturally
11. CRITICAL: The missing keywords listed above are HIGH PRIORITY - ensure they appear naturally in the summary
12. Avoid keyword stuffing—ensure the summary flows smoothly while covering the critical terms
13. NEVER include any company names from the job description in the summary

Return ONLY the professional summary paragraph, no labels, explanations, or formatting markers."""


def get_resume_content_prompt(
    content_type: str,
    requirements: str,
    existing_context: str,
    position: str = "end",
    current_bullet: str | None = None,
    section_title: str | None = None,
    company_name: str | None = None,
    job_title: str | None = None,
) -> str:
    """Generate resume content based on type."""
    if content_type == "job":
        return f"""
            Based on the following requirements, generate a complete work experience entry:
            
            Requirements: {requirements}
            Position: {position}
            {existing_context}
            
            Generate a REALISTIC work experience entry with:
            1. Company name (use a real tech company like Google, Microsoft, Amazon, etc.)
            2. Job title/role (specific to the requirements)
            3. Duration (realistic timeframe like "2022-2024" or "Jan 2023 - Present")
            4. 4-6 professional bullet points with:
               - Action verbs and quantifiable results
               - Technical skills mentioned in requirements
               - ATS-optimized language
               - Progressive responsibility
            
            IMPORTANT: 
            - Use REAL company names, not placeholders
            - Use REAL job titles, not generic ones
            - Use REAL timeframes, not placeholders
            - Make bullet points specific and detailed
            
            Return ONLY valid JSON with fields: company, role, duration, bullets (array of strings)
            
            Example format:
            {{
              "company": "Google",
              "role": "DevOps Engineer", 
              "duration": "2022-2024",
              "bullets": ["Deployed applications using Kubernetes", "Managed CI/CD pipelines"]
            }}
            """
    elif content_type == "project":
        return f"""
            Based on the following requirements, generate a project entry:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate a project entry with:
            1. Project name
            2. Brief description
            3. 3-5 bullet points with:
               - Technical implementation details
               - Technologies used
               - Results/impact
               - Challenges overcome
            
            Return as JSON with fields: name, description, bullets (array of strings)
            """
    elif content_type == "skill":
        return f"""
            Based on the following requirements, generate a skills section:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate a skills section with:
            1. Categorized skills (Technical, Tools, Languages, etc.)
            2. Relevant to the person's background
            3. Industry-standard terminology
            4. ATS-friendly format
            
            Return as JSON with fields: categories (object with category names as keys and skill arrays as values)
            """
    elif content_type == "education":
        return f"""
            Based on the following requirements, generate an education entry:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate an education entry with:
            1. Institution name
            2. Degree/qualification
            3. Relevant coursework (if applicable)
            4. Graduation year
            5. Any honors or achievements
            
            Return as JSON with fields: institution, degree, year, coursework (array), honors (array)
            """
    elif content_type == "bullet-improvement":
        return f"""
            Improve the following bullet point for a resume:
            
            Current bullet point: "{current_bullet}"
            Section: {section_title}
            Company: {company_name}
            Role: {job_title}
            
            Requirements: {requirements}
            
            Please improve this bullet point by:
            - Adding specific metrics and quantifiable results
            - Using strong action verbs
            - Making it more achievement-focused
            - Keeping it concise but impactful
            - Maintaining professional tone
            
            Return as JSON with field: improvedBullet (string)
            """
    else:
        raise ValueError(f"Invalid content type: {content_type}")


def get_work_experience_prompt(
    role: str,
    company: str,
    date_range: str,
    current_bullets: list[str],
    tone: str,
    skills: str | None = None,
    projects: str | None = None,
    job_description: str | None = None,
    missing_keywords: list[str] | None = None,
) -> str:
    """Generate work experience entry prompt."""
    tone_instructions = {
        "professional": "Use professional, corporate language with strong action verbs",
        "technical": "Use technical terminology and methodologies, focus on tools and processes",
        "formal": "Use formal, executive-level language with strategic focus",
        "casual": "Use conversational but workplace-appropriate language",
    }

    tone_instruction = tone_instructions.get(tone, tone_instructions["professional"])

    bullets_text = "\n".join([f"- {b}" for b in current_bullets]) if current_bullets else "None"
    skills_text = f"\nSkills/Experience Description: {skills}" if skills else ""
    projects_text = f"\nProjects Worked On: {projects}" if projects else ""

    jd_section = ""
    if job_description:
        jd_section = f"""
TARGET JOB DESCRIPTION (CRITICAL - Match keywords and requirements from this):
{job_description[:2000]}

IMPORTANT: Your generated bullet points MUST:
- Include keywords and technologies mentioned in the job description
- Match the requirements and responsibilities from the job description
- Use terminology that aligns with the job description
- Highlight experiences that directly relate to what the job is looking for
"""

    missing_kw_section = ""
    if missing_keywords and len(missing_keywords) > 0:
        missing_kw_section = f"""
MISSING KEYWORDS FROM JOB DESCRIPTION (HIGH PRIORITY - include these naturally):
{', '.join(missing_keywords[:10])}

These keywords are missing from your resume. Prioritize naturally incorporating 
them into the bullet points to maximize ATS score. Include them in at least 2-3 bullets.
"""

    return f"""Generate professional resume bullet points for this work experience entry:

Role: {role}
Company: {company}
Date Range: {date_range}
Current Bullets:
{bullets_text}
{skills_text}{projects_text}{jd_section}{missing_kw_section}

Requirements:
- Generate 4-6 professional bullet points
- Include specific metrics and quantifiable results where possible
- Use strong action verbs
- Focus on achievements and impact
- {tone_instruction}
- ATS-friendly format optimized for the target job description
- Each bullet should be 1-2 lines
- Make them diverse and cover different aspects of the role
- Prioritize matching keywords and requirements from the job description
- CRITICAL: Include the missing keywords listed above naturally in at least 2-3 bullet points

Return ONLY a JSON array of bullet point strings, e.g. ["Bullet 1", "Bullet 2"]."""


def get_llm_keyword_extraction_prompt(job_description: str) -> str:
    """Generate prompt for LLM-based keyword extraction from job description."""
    return f"""Extract ATS-relevant keywords from this job description. Focus on keywords that are important for Applicant Tracking Systems (ATS) to match resumes.

Job Description:
{job_description}

Extract keywords in these categories:
1. TECHNICAL_KEYWORDS: Programming languages, frameworks, tools, technologies (e.g., Python, React, AWS, Kubernetes)
2. SOFT_SKILLS: Interpersonal and professional skills (e.g., Leadership, Communication, Problem-solving)
3. EDUCATION: Degree requirements, certifications (e.g., Bachelor's in Computer Science, AWS Certified)
4. EXPERIENCE: Years of experience, experience types (e.g., 5+ years, Agile experience)
5. GENERAL_KEYWORDS: Important terms, methodologies, industry terms (e.g., Microservices, DevOps, Scrum)

CRITICAL REQUIREMENTS:
- Extract ONLY keywords that are ACTUALLY PRESENT in the job description text above
- DO NOT infer, assume, or add keywords that are not explicitly mentioned in the text
- DO NOT add related keywords that might be relevant but are not in the job description
- Extract ONLY meaningful, ATS-relevant keywords (40-80 total, not hundreds)
- Exclude generic words like "the", "and", "company", "team", "work", "experience" (unless part of a specific phrase)
- Include multi-word phrases when relevant (e.g., "machine learning", "cloud computing") ONLY if they appear in the text
- Prioritize keywords that appear in requirements/qualifications sections
- Return keywords in lowercase for consistency
- Focus on keywords that would actually be searched by ATS systems
- If a keyword is not found in the job description text, DO NOT include it

Return ONLY a valid JSON object with this exact structure:
{{
  "technical_keywords": ["python", "react", "aws", "kubernetes"],
  "soft_skills": ["leadership", "communication", "problem-solving"],
  "education": ["bachelor's in computer science", "aws certified"],
  "experience": ["5+ years", "agile experience"],
  "general_keywords": ["microservices", "devops", "scrum", "ci/cd"],
  "priority_keywords": ["python", "react", "aws", "kubernetes", "microservices"]
}}

The "priority_keywords" array should contain the top 15-20 most important keywords for ATS matching.
Return ONLY the JSON, no explanations or markdown formatting."""


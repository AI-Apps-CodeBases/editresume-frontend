"""Cover letter generation prompts."""

from __future__ import annotations


def get_cover_letter_prompt(
    company_name: str,
    position_title: str,
    job_description: str,
    resume_text: str,
    tone: str,
    custom_requirements: str | None = None,
    selected_sentences: list[str] | None = None,
) -> str:
    """Generate cover letter prompt."""
    tone_instructions = {
        "professional": "Use formal, corporate language with strong action verbs and industry terminology",
        "friendly": "Use warm, approachable language while maintaining professionalism",
        "concise": "Use direct, clear language with short sentences and bullet points where appropriate",
    }

    tone_instruction = tone_instructions.get(tone, tone_instructions["professional"])

    custom_context = (
        f"\nAdditional Requirements: {custom_requirements}" if custom_requirements else ""
    )

    # Use selected sentences if provided
    jd_text = job_description
    if selected_sentences and len(selected_sentences) > 0:
        jd_text = "\n".join(selected_sentences)
        jd_context = "Selected Key Points from Job Description:\n" + jd_text
    else:
        jd_context = f"Job Description:\n{job_description[:2000]}"
    
    return f"""Generate a professional cover letter for this job application.

Job Details:
- Company: {company_name}
- Position: {position_title}
{jd_context}

Candidate Information:
{resume_text[:2000]}

CRITICAL REQUIREMENTS:
- DO NOT use any variables, placeholders, or template syntax in the cover letter
- Write the complete cover letter with actual text, not references to variables
- DO NOT use phrases like "{{name}}", "{{company}}", "{{position}}" or any variable syntax
- Write everything in plain, complete sentences with actual names and details
- Use {tone} tone: {tone_instruction}
- Write a compelling cover letter that connects the candidate's experience to the job requirements
- Include specific examples from the candidate's background that match job requirements
- Address key requirements from the job description with concrete examples
- Reference specific details from the job description naturally in the text
- Keep it professional and engaging
- Length: 3-4 paragraphs (approximately 250-350 words)
- Start with a strong opening that shows enthusiasm and mentions the specific position at {company_name}
- Use action verbs and quantifiable achievements where possible
- End with a clear call to action
- Avoid generic phrases - be specific to this role and company
{custom_context}

Structure the response as JSON with these fields:
- opening: Opening paragraph (1-2 sentences) - mention the specific position "{position_title}" at "{company_name}" (use actual names, not variables)
- body: Main body paragraphs (2-3 paragraphs) - highlight relevant experience and achievements, reference specific job requirements
- closing: Closing paragraph (1-2 sentences) - express enthusiasm and next steps
- full_letter: Complete formatted letter with proper spacing, NO VARIABLES, use actual company name "{company_name}" and position "{position_title}"

Return ONLY valid JSON, no markdown formatting."""


"""Cover letter generation prompts."""

from __future__ import annotations


def get_cover_letter_prompt(
    company_name: str,
    position_title: str,
    job_description: str,
    resume_text: str,
    tone: str,
    custom_requirements: str | None = None,
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

    return f"""Generate a professional cover letter for this job application.

Job Details:
- Company: {company_name}
- Position: {position_title}
- Job Description: {job_description[:2000]}

Candidate Information:
{resume_text[:2000]}

Requirements:
- Write a compelling cover letter that connects the candidate's experience to the job requirements
- Use {tone} tone: {tone_instruction}
- Include specific examples from the candidate's background that match job requirements
- Address key requirements from the job description with concrete examples
- Keep it professional and engaging
- Length: 3-4 paragraphs (approximately 250-350 words)
- Start with a strong opening that shows enthusiasm and mentions the specific position
- Use action verbs and quantifiable achievements where possible
- End with a clear call to action
- Avoid generic phrases - be specific to this role and company
{custom_context}

Structure the response as JSON with these fields:
- opening: Opening paragraph (1-2 sentences) - mention the specific position and company
- body: Main body paragraphs (2-3 paragraphs) - highlight relevant experience and achievements
- closing: Closing paragraph (1-2 sentences) - express enthusiasm and next steps
- full_letter: Complete formatted letter with proper spacing

Return ONLY valid JSON, no markdown formatting."""


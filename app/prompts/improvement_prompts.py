"""Content improvement prompts."""

from __future__ import annotations
import random


def get_improve_bullet_prompt(
    bullet: str, context: str | None, tone: str
) -> str:
    """Improve a bullet point prompt."""
    tone_instructions = {
        "professional": "Use professional, corporate language with strong action verbs",
        "technical": "Use technical terminology and methodologies, focus on tools and processes",
        "formal": "Use formal, executive-level language with strategic focus",
        "casual": "Use conversational but workplace-appropriate language",
    }

    tone_instruction = tone_instructions.get(tone, tone_instructions["professional"])

    context_text = f"Context: {context}" if context else ""

    # Generate diverse improvement prompts to avoid repetitive language
    improvement_templates = [
        f"""Transform this resume bullet point into a powerful, achievement-focused statement that will impress recruiters and pass ATS systems.

Current bullet: "{bullet}"

{context_text}

Requirements:
- Add specific metrics and quantifiable results
- Use strong action verbs
- Make it achievement-focused
- Keep it concise but impactful
- {tone_instruction}
- ATS-friendly format

Return ONLY the improved bullet point, no explanations.""",
        f"""Elevate this resume bullet point to showcase your professional impact and expertise.

Current bullet: "{bullet}"

{context_text}

Requirements:
- Enhance with quantifiable achievements
- Use powerful action verbs
- Focus on results and impact
- Professional tone: {tone_instruction}
- Optimize for ATS systems

Return ONLY the improved bullet point, no explanations.""",
        f"""Refine this resume bullet point to maximize its impact on hiring managers and applicant tracking systems.

Current bullet: "{bullet}"

{context_text}

Requirements:
- Include metrics and measurable outcomes
- Use dynamic action verbs
- Highlight achievements and value
- {tone_instruction}
- Ensure ATS compatibility

Return ONLY the improved bullet point, no explanations.""",
    ]

    return random.choice(improvement_templates)


def get_ats_improvement_prompt(
    improvement_title: str,
    improvement_description: str,
    specific_suggestion: str,
    improved_resume: str,
    job_description: str | None,
) -> str:
    """Apply specific ATS improvement to resume prompt."""
    return f"""Apply this specific ATS improvement to the resume:

Improvement: {improvement_title}
Description: {improvement_description}
Suggestion: {specific_suggestion}

Current Resume Data:
{improved_resume[:2000]}

Job Description Context:
{job_description[:500] if job_description else 'Not provided'}

Requirements:
- Apply the improvement naturally and professionally
- Maintain resume structure and formatting
- Ensure ATS compatibility
- Return the complete updated resume as JSON

Return ONLY the updated resume JSON, no explanations."""


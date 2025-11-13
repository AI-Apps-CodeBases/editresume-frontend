"""Job matching prompts."""

from __future__ import annotations


def get_job_match_improvement_prompt(
    job_description: str,
    resume_text: str,
    matched_keywords: list[str],
    missing_keywords: list[str],
) -> str:
    """Generate improvement suggestions based on job-resume match."""
    return f"""As an expert resume strategist, analyze this job-resume match and provide specific, actionable improvements.

Job Description:
{job_description[:1500]}

Resume Content:
{resume_text[:1500]}

Analysis:
- Matched Keywords: {', '.join(matched_keywords[:20])}
- Missing Keywords: {', '.join(missing_keywords[:20])}

Requirements:
- Provide 3-5 specific, actionable improvement suggestions
- Focus on incorporating missing keywords naturally
- Suggest ways to highlight matched keywords more prominently
- Recommend structural improvements if needed
- Ensure suggestions are practical and ATS-friendly
- Prioritize improvements that will have the most impact on match score

Return as JSON with fields:
- suggestions: Array of improvement objects, each with:
  - title: Short title of the improvement
  - description: Detailed description
  - priority: "high", "medium", or "low"
  - category: Category of improvement (e.g., "keywords", "structure", "content")
  - specific_suggestion: Specific action to take

Return ONLY valid JSON, no markdown formatting."""


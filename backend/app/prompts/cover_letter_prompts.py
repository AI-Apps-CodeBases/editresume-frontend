"""Cover letter generation prompts."""

from __future__ import annotations
from datetime import datetime


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
    
    current_date = datetime.now().strftime("%B %d, %Y")
    
    return f"""Generate a professional, well-formatted cover letter for this job application.

Job Details:
- Company: {company_name}
- Position: {position_title}
{jd_context}

Candidate Information (extract contact details from this):
{resume_text[:2000]}

CRITICAL REQUIREMENTS:
- DO NOT use ANY placeholders in brackets like [Company Address], [Hiring Manager], [Date], [Your Name], etc.
- DO NOT use any variables, placeholders, or template syntax in the cover letter
- Write the complete cover letter with actual text, not references to variables
- DO NOT use phrases like "{{name}}", "{{company}}", "{{position}}" or any variable syntax
- Write everything in plain, complete sentences with actual names and details
- Use ONLY the actual company name "{company_name}" and position title "{position_title}" - no placeholders
- Use {tone} tone: {tone_instruction}
- Current date: {current_date}

CONTENT QUALITY REQUIREMENTS:
- Use STAR method (Situation, Task, Action, Result) when describing achievements
- Reference specific job requirements by name/description from the job description
- Include quantifiable achievements with numbers, percentages, or metrics
- Avoid generic phrases like "I am writing to apply" - use more compelling openings
- Create an opening that shows knowledge of the company/role or enthusiasm for specific aspects
- Connect candidate's specific experience to job requirements with concrete examples
- Use active voice and strong action verbs (e.g., "Led", "Designed", "Implemented", "Achieved")
- Be specific - mention tools, technologies, methodologies relevant to the role
- Length: 3-4 body paragraphs (approximately 250-350 words total)

STRUCTURE REQUIREMENTS:
- Format as a professional business letter with proper sections
- Date at the top (use current date: {current_date})
- Extract sender contact info from candidate information - REQUIRED: name and email (phone number is NOT needed, skip it)
- Sender contact should include: candidate's name and email address only
- Recipient/company info: Use company name "{company_name}" (you may add "Hiring Manager" or "Hiring Team" if specific name not available)
- Professional salutation: "Dear Hiring Manager," or "Dear {company_name} Hiring Team,"
- Opening paragraph (1-2 sentences): Strong hook showing enthusiasm and mentioning the specific position
- Body paragraphs (2-3 paragraphs): 
  * Paragraph 1: Highlight most relevant experience/achievements matching job requirements
  * Paragraph 2: Provide specific examples using STAR method, reference job requirements
  * Paragraph 3 (optional): Additional relevant skills or achievements
- Closing paragraph (1-2 sentences): Express enthusiasm and next steps with clear call to action
- Professional closing: "Sincerely," followed by signature line with candidate's name
- Use double line breaks (\\n\\n) between paragraphs, single line breaks (\\n) within structured sections

STRONG OPENING EXAMPLES (adapt to this role):
- "I am excited to apply for the {position_title} position at {company_name}, particularly drawn to [specific aspect from job description]."
- "With [X] years of experience in [relevant field], I am thrilled to submit my application for the {position_title} role at {company_name}."
- "Your posting for {position_title} at {company_name} immediately caught my attention, as it aligns perfectly with my expertise in [specific skill/area]."

{custom_context}

Structure the response as JSON with these EXACT fields:
- date: "{current_date}" (current date)
- sender_contact: Object with name and email extracted from candidate information (REQUIRED - always include name and email if available in candidate info, do NOT include phone number, location is optional)
- recipient_info: "{company_name} Hiring Manager" or "{company_name} Hiring Team"
- salutation: "Dear Hiring Manager," or "Dear {company_name} Hiring Team,"
- opening_paragraph: Strong opening paragraph (1-2 sentences) mentioning position and showing enthusiasm
- body_paragraphs: Array of 2-3 body paragraphs, each as a separate string, with specific examples and achievements
- closing_paragraph: Closing paragraph (1-2 sentences) with call to action
- closing: "Sincerely," (professional closing)
- signature_line: Candidate's name extracted from resume text
- full_letter: Complete formatted letter starting with date, then sender contact (if available), recipient info, salutation, opening, body paragraphs (double line breaks between), closing paragraph, closing, and signature. Title at the top should be "{position_title} at {company_name}" NOT "Cover Letter for...". Format with proper line breaks: date\\n\\nsender info\\n\\nrecipient\\n\\nsalutation\\n\\nparagraphs\\n\\nclosing\\n\\nsignature

Return ONLY valid JSON, no markdown formatting."""


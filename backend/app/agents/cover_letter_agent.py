"""Cover letter generation agent."""

from __future__ import annotations

import json
import logging
import re
from typing import List

from fastapi import HTTPException

from app.core.openai_client import OPENAI_MAX_TOKENS, openai_client
from app.prompts.cover_letter_prompts import get_cover_letter_prompt

logger = logging.getLogger(__name__)


class CoverLetterAgent:
    """Agent for generating cover letters."""

    def __init__(self):
        """Initialize the cover letter agent."""
        self.openai_client = openai_client

    def _sanitize_cover_letter(
        self, content: str, company_name: str, position_title: str
    ) -> str:
        """Remove placeholders and ensure proper formatting."""
        if not content:
            return content

        result = content

        placeholders_to_remove = [
            r"\[Company Address\]",
            r"\[Company address\]",
            r"\[COMPANY ADDRESS\]",
            r"\[Hiring Manager\]",
            r"\[Hiring manager\]",
            r"\[HIRING MANAGER\]",
            r"\[Date\]",
            r"\[date\]",
            r"\[DATE\]",
            r"\[Your Name\]",
            r"\[Your name\]",
            r"\[your name\]",
            r"\[YOUR NAME\]",
            r"\[Your Email\]",
            r"\[Your email\]",
            r"\[your email\]",
            r"\[YOUR EMAIL\]",
            r"\[Your Phone\]",
            r"\[Your phone\]",
            r"\[your phone\]",
            r"\[YOUR PHONE\]",
            r"\[Your Address\]",
            r"\[Your address\]",
            r"\[your address\]",
            r"\[YOUR ADDRESS\]",
        ]

        for placeholder in placeholders_to_remove:
            result = re.sub(placeholder, "", result, flags=re.IGNORECASE)

        result = re.sub(r" +", " ", result)
        result = re.sub(r"\n{3,}", "\n\n", result)
        result = result.strip()

        return result

    def _ensure_title_and_formatting(
        self, full_letter: str, company_name: str, position_title: str
    ) -> str:
        """Ensure the cover letter has proper title and formatting."""
        if not full_letter:
            return full_letter

        title = f"Cover Letter for {company_name} for {position_title}"

        cleaned_letter = self._sanitize_cover_letter(full_letter, company_name, position_title)

        if not cleaned_letter.startswith(title):
            cleaned_letter = f"{title}\n\n{cleaned_letter}"

        cleaned_letter = re.sub(r"\n{3,}", "\n\n", cleaned_letter)
        cleaned_letter = cleaned_letter.strip()

        return cleaned_letter

    def generate_cover_letter(
        self,
        company_name: str,
        position_title: str,
        job_description: str,
        resume_text: str,
        tone: str = "professional",
        custom_requirements: str | None = None,
        selected_sentences: List[str] | None = None,
    ) -> dict:
        """Generate a cover letter."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            # Convert resume data to text for context
            prompt = get_cover_letter_prompt(
                company_name=company_name,
                position_title=position_title,
                job_description=job_description,
                resume_text=resume_text,
                tone=tone,
                custom_requirements=custom_requirements,
                selected_sentences=selected_sentences,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.7,
            }

            response = self.openai_client["requests"].post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=60,
            )

            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code}")

            result = response.json()
            cover_letter_content = result["choices"][0]["message"]["content"].strip()

            # Try to parse as JSON
            try:
                parsed_content = json.loads(cover_letter_content)
            except json.JSONDecodeError:
                # If not JSON, create structured response
                parsed_content = {
                    "opening": f"I am writing to express my strong interest in the {position_title} position at {company_name}.",
                    "body": cover_letter_content,
                    "closing": "I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for your consideration.",
                    "full_letter": cover_letter_content,
                }

            # Sanitize all fields to remove placeholders
            if "opening" in parsed_content:
                parsed_content["opening"] = self._sanitize_cover_letter(
                    parsed_content["opening"], company_name, position_title
                )
            if "body" in parsed_content:
                parsed_content["body"] = self._sanitize_cover_letter(
                    parsed_content["body"], company_name, position_title
                )
            if "closing" in parsed_content:
                parsed_content["closing"] = self._sanitize_cover_letter(
                    parsed_content["closing"], company_name, position_title
                )
            if "full_letter" in parsed_content:
                parsed_content["full_letter"] = self._ensure_title_and_formatting(
                    parsed_content["full_letter"], company_name, position_title
                )
            else:
                # Rebuild full_letter if missing
                opening = parsed_content.get("opening", "")
                body = parsed_content.get("body", "")
                closing = parsed_content.get("closing", "")
                full_letter = f"{opening}\n\n{body}\n\n{closing}".strip()
                parsed_content["full_letter"] = self._ensure_title_and_formatting(
                    full_letter, company_name, position_title
                )

            return {
                "success": True,
                "cover_letter": parsed_content,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
                "company": company_name,
                "position": position_title,
                "tone": tone,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Cover letter generation error: {str(e)}")
            error_message = "Failed to generate cover letter: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)


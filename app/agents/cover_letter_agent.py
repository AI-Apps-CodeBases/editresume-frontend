"""Cover letter generation agent."""

from __future__ import annotations

import json
import logging

from fastapi import HTTPException

from app.core.openai_client import OPENAI_MAX_TOKENS, openai_client
from app.prompts.cover_letter_prompts import get_cover_letter_prompt

logger = logging.getLogger(__name__)


class CoverLetterAgent:
    """Agent for generating cover letters."""

    def __init__(self):
        """Initialize the cover letter agent."""
        self.openai_client = openai_client

    def generate_cover_letter(
        self,
        company_name: str,
        position_title: str,
        job_description: str,
        resume_text: str,
        tone: str = "professional",
        custom_requirements: str | None = None,
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


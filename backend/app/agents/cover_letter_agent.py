"""Cover letter generation agent."""

from __future__ import annotations

import json
import logging
import re

from fastapi import HTTPException

from app.core.openai_client import openai_client
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

    def _build_full_letter_from_structure(
        self, parsed_content: dict, company_name: str, position_title: str
    ) -> str:
        """Build full letter from structured JSON response."""
        parts = []

        # Title
        title = f"{position_title} at {company_name}"
        parts.append(title)
        parts.append("")

        # Date
        date = parsed_content.get("date", "")
        if date:
            parts.append(date)
            parts.append("")

        # Sender contact info (name and email only, no phone)
        sender_contact = parsed_content.get("sender_contact", {})
        if isinstance(sender_contact, dict):
            sender_parts = []
            if sender_contact.get("name"):
                sender_parts.append(sender_contact["name"])
            if sender_contact.get("email"):
                sender_parts.append(sender_contact["email"])
            # Skip phone number - not needed
            if sender_contact.get("location"):
                sender_parts.append(sender_contact["location"])
            if sender_parts:
                parts.append("\n".join(sender_parts))
                parts.append("")
        elif isinstance(sender_contact, str) and sender_contact.strip():
            # Filter out phone numbers from string format
            contact_lines = sender_contact.strip().split("\n")
            filtered_lines = [
                line for line in contact_lines
                if not (line.strip() and any(char.isdigit() and len(line.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")) >= 10 for char in line) and "@" not in line)
            ]
            if filtered_lines:
                parts.append("\n".join(filtered_lines))
                parts.append("")

        # Recipient info
        recipient_info = parsed_content.get("recipient_info", "")
        if recipient_info:
            parts.append(recipient_info)
            parts.append("")

        # Salutation
        salutation = parsed_content.get("salutation", "Dear Hiring Manager,")
        parts.append(salutation)
        parts.append("")

        # Opening paragraph
        opening = parsed_content.get("opening_paragraph") or parsed_content.get("opening", "")
        if opening:
            parts.append(opening.strip())
            parts.append("")

        # Body paragraphs
        body_paragraphs = parsed_content.get("body_paragraphs", [])
        if isinstance(body_paragraphs, list) and len(body_paragraphs) > 0:
            for para in body_paragraphs:
                if para and para.strip():
                    parts.append(para.strip())
                    parts.append("")
        else:
            # Fallback to old body field
            body = parsed_content.get("body", "")
            if body:
                parts.append(body.strip())
                parts.append("")

        # Closing paragraph
        closing_para = parsed_content.get("closing_paragraph") or parsed_content.get("closing", "")
        if closing_para:
            parts.append(closing_para.strip())
            parts.append("")

        # Closing
        closing = parsed_content.get("closing", "Sincerely,")
        parts.append(closing)
        parts.append("")

        # Signature
        signature = parsed_content.get("signature_line", "")
        if signature:
            parts.append(signature)

        full_letter = "\n".join(parts)
        full_letter = re.sub(r"\n{3,}", "\n\n", full_letter)
        return full_letter.strip()

    def _ensure_title_and_formatting(
        self, full_letter: str, company_name: str, position_title: str
    ) -> str:
        """Ensure the cover letter has proper title and formatting."""
        if not full_letter:
            return full_letter

        title = f"{position_title} at {company_name}"

        cleaned_letter = self._sanitize_cover_letter(full_letter, company_name, position_title)

        # Check if letter already has a title, if not add it
        if not cleaned_letter.startswith(title) and not cleaned_letter.startswith("Cover Letter"):
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
        selected_sentences: list[str] | None = None,
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
                "max_tokens": 2000,
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

            # Check if we have the new structured format
            has_new_structure = any(
                key in parsed_content
                for key in [
                    "date",
                    "sender_contact",
                    "recipient_info",
                    "salutation",
                    "opening_paragraph",
                    "body_paragraphs",
                    "closing_paragraph",
                    "signature_line",
                ]
            )

            if has_new_structure:
                # Build full_letter from new structure
                parsed_content["full_letter"] = self._build_full_letter_from_structure(
                    parsed_content, company_name, position_title
                )

                # Also populate old fields for backward compatibility
                if "opening_paragraph" in parsed_content:
                    parsed_content["opening"] = parsed_content["opening_paragraph"]
                if "body_paragraphs" in parsed_content:
                    body_paragraphs = parsed_content["body_paragraphs"]
                    if isinstance(body_paragraphs, list):
                        parsed_content["body"] = "\n\n".join(body_paragraphs)
                    else:
                        parsed_content["body"] = str(body_paragraphs)
                if "closing_paragraph" in parsed_content:
                    parsed_content["closing"] = parsed_content["closing_paragraph"]
            else:
                # Handle old format - sanitize fields
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

                # Build or sanitize full_letter
                if "full_letter" in parsed_content:
                    parsed_content["full_letter"] = self._ensure_title_and_formatting(
                        parsed_content["full_letter"], company_name, position_title
                    )
                else:
                    # Rebuild full_letter from old structure
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


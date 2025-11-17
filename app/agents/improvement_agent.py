"""Content improvement agent."""

from __future__ import annotations

import asyncio
import functools
import json
import logging

from fastapi import HTTPException

from app.core.openai_client import OPENAI_MAX_TOKENS, openai_client
from app.prompts.improvement_prompts import (
    get_ats_improvement_prompt,
    get_improve_bullet_prompt,
)

logger = logging.getLogger(__name__)


class ImprovementAgent:
    """Agent for improving resume content."""

    def __init__(self):
        """Initialize the improvement agent."""
        self.openai_client = openai_client

    async def improve_bullet(
        self, bullet: str, context: str | None = None, tone: str = "professional"
    ) -> dict:
        """Improve a bullet point."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_improve_bullet_prompt(
                bullet=bullet, context=context, tone=tone
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 0.7,
            }

            # Use async httpx client for better performance
            httpx_client = self.openai_client.get("httpx_client")
            if httpx_client:
                response = await httpx_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30.0,
                )
            else:
                # Fallback to thread pool if httpx not available
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                response = await loop.run_in_executor(
                    None,
                    functools.partial(
                        self.openai_client["requests"].post,
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json=data,
                        timeout=30,
                    )
                )

            if response.status_code != 200:
                # Both httpx and requests have .text attribute
                error_text = response.text if hasattr(response, 'text') else str(response.content) if hasattr(response, 'content') else str(response)
                logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
                raise HTTPException(status_code=500, detail=f"OpenAI API error: {response.status_code}")

            # Both httpx and requests have .json() method
            result = response.json()
            improved_bullet = result["choices"][0]["message"]["content"].strip()

            return {
                "success": True,
                "improved_bullet": improved_bullet,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Bullet improvement error: {str(e)}")
            error_message = "Failed to improve bullet: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def apply_ats_improvement(
        self,
        improvement_title: str,
        improvement_description: str,
        specific_suggestion: str,
        improved_resume: str,
        job_description: str | None = None,
    ) -> dict:
        """Apply specific ATS improvement to resume."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_ats_improvement_prompt(
                improvement_title=improvement_title,
                improvement_description=improvement_description,
                specific_suggestion=specific_suggestion,
                improved_resume=improved_resume,
                job_description=job_description,
            )

            # Use asyncio to run blocking request in thread pool
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
            response = await loop.run_in_executor(
                None,
                functools.partial(
                    self.openai_client["requests"].post,
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_client['api_key']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.openai_client["model"],
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert resume writer specializing in ATS optimization. Apply improvements while maintaining professional quality.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": 2000,
                        "temperature": 0.6,
                    },
                    timeout=30,  # Reduced timeout from default to 30 seconds
                )
            )

            if response.status_code == 200:
                # Both httpx and requests have .json() method
                result = response.json()
                improved_content = result["choices"][0]["message"]["content"].strip()

                # Try to parse the improved resume
                try:
                    updated_resume = json.loads(improved_content)
                    return {
                        "success": True,
                        "improved_resume": updated_resume,
                        "tokens_used": result.get("usage", {}).get("total_tokens", 0),
                    }
                except json.JSONDecodeError:
                    logger.warning(
                        f"Could not parse improved resume for: {improvement_title}"
                    )
                    return {
                        "success": False,
                        "error": "Could not parse improved resume",
                    }
            else:
                logger.warning(f"OpenAI API error for improvement: {improvement_title}")
                return {
                    "success": False,
                    "error": f"OpenAI API error: {response.status_code}",
                }

        except Exception as e:
            logger.error(f"Error applying improvement {improvement_title}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


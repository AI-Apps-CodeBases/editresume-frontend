"""Content generation agent for resumes."""

from __future__ import annotations

import asyncio
import functools
import json
import logging
import re

from fastapi import HTTPException

from app.core.openai_client import OPENAI_MAX_TOKENS, openai_client
from app.prompts.content_generation_prompts import (
    get_bullet_from_keywords_prompt,
    get_bullet_points_prompt,
    get_bullets_from_keywords_prompt,
    get_resume_content_prompt,
    get_summary_from_experience_prompt,
    get_summary_prompt,
    get_work_experience_prompt,
)

logger = logging.getLogger(__name__)


class ContentGenerationAgent:
    """Agent for generating resume content."""

    def __init__(self):
        """Initialize the content generation agent."""
        self.openai_client = openai_client

    async def generate_bullet_points(
        self, role: str, company: str, skills: str, count: int, tone: str
    ) -> dict:
        """Generate bullet points from scratch."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_bullet_points_prompt(
                role=role, company=company, skills=skills, count=count, tone=tone
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": OPENAI_MAX_TOKENS,
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
            content = result["choices"][0]["message"]["content"].strip()

            # Parse bullet points
            bullets = [
                line.strip()
                for line in content.split("\n")
                if line.strip() and not line.strip().startswith(("#", "-", "*"))
            ]

            return {
                "success": True,
                "bullets": bullets,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OpenAI generate bullet points error: {str(e)}")
            error_message = "Failed to generate bullet points: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_summary(
        self,
        role: str,
        years_experience: int,
        skills: str,
        achievements: str | None = None,
    ) -> dict:
        """Generate professional resume summary."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_summary_prompt(
                role=role,
                years_experience=years_experience,
                skills=skills,
                achievements=achievements,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": OPENAI_MAX_TOKENS,
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
            summary = result["choices"][0]["message"]["content"].strip()

            return {
                "success": True,
                "summary": summary,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OpenAI generate summary error: {str(e)}")
            error_message = "Failed to generate summary: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_bullet_from_keywords(
        self,
        keywords_str: str,
        company_title: str | None = None,
        job_title: str | None = None,
        jd_excerpt: str | None = None,
        resume_excerpt: str | None = None,
        count: int = 3,
    ) -> dict:
        """Generate bullet points from keywords."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_bullet_from_keywords_prompt(
                company_title=company_title,
                job_title=job_title,
                jd_excerpt=jd_excerpt,
                keywords_str=keywords_str,
                resume_excerpt=resume_excerpt,
                count=count,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            # Optimize max_tokens based on model - gpt-4o needs less tokens for bullets
            model = self.openai_client["model"]
            max_tokens = 400 if "gpt-4o" in model and "mini" not in model else 600
            
            # Use async httpx client for better performance
            httpx_client = self.openai_client.get("httpx_client")
            if httpx_client:
                response = await httpx_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a professional resume writer. Create compelling, keyword-optimized bullet points that highlight achievements.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.6,
                    },
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
                        json={
                            "model": model,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a professional resume writer. Create compelling, keyword-optimized bullet points that highlight achievements.",
                                },
                                {"role": "user", "content": prompt},
                            ],
                            "max_tokens": max_tokens,
                            "temperature": 0.6,
                        },
                        timeout=30,
                    )
                )

            if response.status_code != 200:
                error_text = response.text if hasattr(response, 'text') else str(response.content) if hasattr(response, 'content') else str(response)
                logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
                raise HTTPException(status_code=500, detail="AI service error")

            # Both httpx and requests have .json() method
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"].strip()

            # Try to parse as JSON
            try:
                bullets = json.loads(raw_content)
                if not isinstance(bullets, list):
                    bullets = [bullets]
            except json.JSONDecodeError:
                # Try to extract JSON from markdown
                json_match = re.search(
                    r"```json\s*(\[.*?\])\s*```", raw_content, re.DOTALL
                )
                if json_match:
                    bullets = json.loads(json_match.group(1))
                else:
                    # Fallback: split by lines
                    bullets = [
                        line.strip()
                        for line in raw_content.split("\n")
                        if line.strip() and not line.strip().startswith(("#", "-"))
                    ]

            return {
                "success": True,
                "bullets": bullets,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OpenAI generate bullets from keywords error: {str(e)}")
            error_message = "AI generation failed: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_bullets_from_keywords(
        self,
        current_bullet: str,
        keywords_str: str,
        company_title: str | None = None,
        job_title: str | None = None,
        jd_excerpt: str | None = None,
    ) -> dict:
        """Improve bullet point with keywords."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_bullets_from_keywords_prompt(
                current_bullet=current_bullet,
                keywords_str=keywords_str,
                company_title=company_title,
                job_title=job_title,
                jd_excerpt=jd_excerpt,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            # Optimize max_tokens based on model
            model = self.openai_client["model"]
            max_tokens = 150 if "gpt-4o" in model and "mini" not in model else 200
            
            # Use async httpx client for better performance
            httpx_client = self.openai_client.get("httpx_client")
            if httpx_client:
                response = await httpx_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a professional resume writer specializing in keyword optimization and impactful bullet points.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.6,
                    },
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
                        json={
                            "model": model,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a professional resume writer specializing in keyword optimization and impactful bullet points.",
                                },
                                {"role": "user", "content": prompt},
                            ],
                            "max_tokens": max_tokens,
                            "temperature": 0.6,
                        },
                        timeout=30,
                    )
                )

            if response.status_code != 200:
                error_text = response.text if hasattr(response, 'text') else str(response.content) if hasattr(response, 'content') else str(response)
                logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
                raise HTTPException(status_code=500, detail="AI service error")

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
            logger.error(
                f"OpenAI generate bullets from keywords error: {str(e)}"
            )
            error_message = "AI generation failed: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_summary_from_experience(
        self,
        title: str | None,
        work_experience_text: str | None,
        skills_text: str | None,
        keyword_guidance: str,
        job_description_excerpt: str | None = None,
        existing_summary: str | None = None,
    ) -> dict:
        """Generate professional summary from work experience."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_summary_from_experience_prompt(
                title=title,
                work_experience_text=work_experience_text,
                skills_text=skills_text,
                keyword_guidance=keyword_guidance,
                job_description_excerpt=job_description_excerpt,
                existing_summary=existing_summary,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
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
            summary_text = result["choices"][0]["message"]["content"].strip()
            tokens_used = result.get("usage", {}).get("total_tokens", 0)

            summary_text = summary_text.strip("\"'")

            return {
                "success": True,
                "summary": summary_text,
                "tokens_used": tokens_used,
                "word_count": len(summary_text.split()),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"OpenAI generate summary from experience error: {str(e)}"
            )
            error_message = "Failed to generate summary: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_resume_content(
        self,
        content_type: str,
        requirements: str,
        existing_context: str,
        position: str = "end",
        current_bullet: str | None = None,
        section_title: str | None = None,
        company_name: str | None = None,
        job_title: str | None = None,
    ) -> dict:
        """Generate resume content based on type."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_resume_content_prompt(
                content_type=content_type,
                requirements=requirements,
                existing_context=existing_context,
                position=position,
                current_bullet=current_bullet,
                section_title=section_title,
                company_name=company_name,
                job_title=job_title,
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
            content = result["choices"][0]["message"]["content"].strip()

            # Try to parse as JSON
            try:
                parsed_content = json.loads(content)
                return parsed_content
            except json.JSONDecodeError:
                # Try to extract JSON from markdown
                json_match = re.search(
                    r"```json\s*(\{.*?\})\s*```", content, re.DOTALL
                )
                if json_match:
                    parsed_content = json.loads(json_match.group(1))
                    return parsed_content

                # Fallback based on content type
                if content_type == "job":
                    return {
                        "company": "Generated Company",
                        "role": "Generated Role",
                        "duration": "2023-2024",
                        "bullets": [content],
                    }
                elif content_type == "bullet-improvement":
                    return {"improvedBullet": content}
                else:
                    return {"content": content}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            error_message = "Failed to generate content: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)

    async def generate_work_experience(
        self,
        role: str,
        company: str,
        date_range: str,
        current_bullets: list[str],
        tone: str,
        skills: str | None = None,
    ) -> dict:
        """Generate work experience entry."""
        if not self.openai_client:
            raise HTTPException(
                status_code=503, detail="OpenAI service not available"
            )

        try:
            prompt = get_work_experience_prompt(
                role=role,
                company=company,
                date_range=date_range,
                current_bullets=current_bullets,
                tone=tone,
                skills=skills,
            )

            headers = {
                "Authorization": f"Bearer {self.openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": self.openai_client["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 800,
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
            content = result["choices"][0]["message"]["content"].strip()

            # Try to parse as JSON
            try:
                bullets = json.loads(content)
                if not isinstance(bullets, list):
                    bullets = [bullets]
            except json.JSONDecodeError:
                # Fallback: split by lines
                bullets = [
                    line.strip()
                    for line in content.split("\n")
                    if line.strip() and not line.strip().startswith(("#", "-"))
                ]

            return {
                "success": True,
                "bullets": bullets,
                "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Work experience generation error: {str(e)}")
            error_message = "Failed to generate work experience: " + str(e)
            raise HTTPException(status_code=500, detail=error_message)


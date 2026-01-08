"""Job matching agent."""

from __future__ import annotations

import json
import logging

from app.core.openai_client import openai_client
from app.prompts.job_matching_prompts import get_job_match_improvement_prompt
from app.services.keyword_service import KeywordExtractor

logger = logging.getLogger(__name__)


class JobMatchingAgent:
    """Agent for matching resumes with job descriptions."""

    def __init__(self):
        """Initialize the job matching agent."""
        try:
            self.keyword_extractor = KeywordExtractor()
            self.openai_client = openai_client
            logger.debug(f"JobMatchingAgent initialized: keyword_extractor={self.keyword_extractor is not None}, openai_client={self.openai_client is not None}")
        except Exception as e:
            logger.error(f"Failed to initialize JobMatchingAgent dependencies: {e}", exc_info=True)
            raise

    def match_job_description(
        self, job_description: str, resume_text: str
    ) -> dict:
        """Match job description with resume."""
        # Calculate similarity using keyword extractor
        similarity_result = self.keyword_extractor.calculate_similarity(
            job_description, resume_text
        )

        # Get keyword suggestions for missing keywords
        suggestions = self.keyword_extractor.get_keyword_suggestions(
            similarity_result.get("missing_keywords", [])
        )

        # Generate AI-powered improvement suggestions
        improvement_suggestions = []
        if (
            self.openai_client
            and similarity_result.get("similarity_score", 0) < 70
        ):
            try:
                prompt = get_job_match_improvement_prompt(
                    job_description=job_description,
                    resume_text=resume_text,
                    matched_keywords=similarity_result.get("matching_keywords", [])[
                        :20
                    ],
                    missing_keywords=similarity_result.get("missing_keywords", [])[
                        :20
                    ],
                )

                headers = {
                    "Authorization": f"Bearer {self.openai_client['api_key']}",
                    "Content-Type": "application/json",
                }

                data = {
                    "model": self.openai_client["model"],
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 800,
                    "temperature": 0.6,
                    "top_p": 0.9,
                    "frequency_penalty": 0.2,
                    "presence_penalty": 0.1,
                }

                response = self.openai_client["requests"].post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=60,
                )

                if response.status_code == 200:
                    result = response.json()
                    suggestions_text = result["choices"][0]["message"]["content"].strip()

                    # Try to parse as JSON
                    try:
                        improvement_suggestions = json.loads(suggestions_text)
                    except json.JSONDecodeError:
                        # If not JSON, create structured suggestions
                        lines = [
                            line.strip()
                            for line in suggestions_text.split("\n")
                            if line.strip()
                        ]
                        improvement_suggestions = [
                            {"category": "General", "suggestion": line}
                            for line in lines[:5]
                        ]

            except Exception as e:
                logger.error(f"Error generating AI suggestions: {e}")

        return {
            "success": True,
            "match_analysis": {
                "similarity_score": similarity_result.get("similarity_score", 0),
                "technical_score": similarity_result.get("technical_score", 0),
                "matching_keywords": similarity_result.get("matching_keywords", []),
                "missing_keywords": similarity_result.get("missing_keywords", []),
                "technical_matches": similarity_result.get("technical_matches", []),
                "technical_missing": similarity_result.get("technical_missing", []),
                "total_job_keywords": similarity_result.get("total_job_keywords", 0),
                "match_count": similarity_result.get("match_count", 0),
                "missing_count": similarity_result.get("missing_count", 0),
            },
            "keyword_suggestions": suggestions,
            "improvement_suggestions": improvement_suggestions,
            "analysis_summary": {
                "overall_match": (
                    "Excellent"
                    if similarity_result.get("similarity_score", 0) >= 80
                    else (
                        "Good"
                        if similarity_result.get("similarity_score", 0) >= 60
                        else (
                            "Fair"
                            if similarity_result.get("similarity_score", 0) >= 40
                            else "Needs Improvement"
                        )
                    )
                ),
                "technical_match": (
                    "Strong"
                    if similarity_result.get("technical_score", 0) >= 70
                    else (
                        "Moderate"
                        if similarity_result.get("technical_score", 0) >= 40
                        else "Weak"
                    )
                ),
            },
        }


"""ATS Scoring Agent for semantic quality analysis."""

from __future__ import annotations

import asyncio
import functools
import json
import logging
from typing import Dict, List, Optional, Any

from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)


class ATSScoringAgent:
    """Agent for semantic ATS score analysis and quality adjustment."""

    def __init__(self):
        """Initialize the ATS scoring agent."""
        self.openai_client = openai_client

    async def analyze_semantic_quality(
        self,
        resume_data: Dict,
        job_description: str = None,
        extracted_keywords: Dict = None,
        keyword_matches: List[str] = None,
        missing_keywords: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze semantic quality of resume content and provide quality adjustment.
        
        Uses extension keyword importance to provide context-aware scoring:
        - High importance missing keywords: -2 points per keyword
        - Medium importance missing: -1 point per keyword
        - Priority keywords missing: -3 points per keyword
        - High importance matched: +1 point per keyword
        
        Args:
            resume_data: Resume data dictionary
            job_description: Job description text (optional)
            extracted_keywords: Keywords from extension with importance/frequency
            keyword_matches: List of matched keywords from resume
            missing_keywords: List of missing keywords from job description
            
        Returns:
            Dictionary with:
            - quality_score: Base quality score (0-100)
            - adjustment: Score adjustment (-15 to +10)
            - reasoning: Brief explanation of adjustment
            - missing_high_importance: Count of missing high-importance keywords
            - missing_priority: Count of missing priority keywords
        """
        if not self.openai_client:
            logger.warning("OpenAI client not available, skipping semantic analysis")
            return {
                "quality_score": 50,
                "adjustment": 0,
                "reasoning": "OpenAI service not available",
                "missing_high_importance": 0,
                "missing_priority": 0,
            }

        keyword_matches = keyword_matches or []
        missing_keywords = missing_keywords or []

        # Calculate adjustment based on keyword importance
        adjustment = 0
        missing_high_importance = 0
        missing_medium_importance = 0
        missing_priority = 0
        matched_high_importance = 0

        if extracted_keywords:
            # Check high_frequency_keywords for importance
            high_freq_keywords = extracted_keywords.get("high_frequency_keywords", [])
            missing_keywords_lower = [kw.lower() for kw in missing_keywords]
            matched_keywords_lower = [kw.lower() for kw in keyword_matches]

            for kw_item in high_freq_keywords:
                kw = kw_item.get("keyword") if isinstance(kw_item, dict) else kw_item
                if not kw:
                    continue

                importance = (
                    kw_item.get("importance", "medium")
                    if isinstance(kw_item, dict)
                    else "medium"
                )
                kw_lower = str(kw).lower()

                if kw_lower in missing_keywords_lower:
                    if importance == "high":
                        missing_high_importance += 1
                        adjustment -= 2  # -2 per high importance missing
                    elif importance == "medium":
                        missing_medium_importance += 1
                        adjustment -= 1  # -1 per medium importance missing

                if kw_lower in matched_keywords_lower and importance == "high":
                    matched_high_importance += 1
                    adjustment += 1  # +1 per high importance matched

            # Check priority_keywords
            priority_keywords = extracted_keywords.get("priority_keywords", [])
            for kw in priority_keywords:
                kw_str = str(kw).lower() if kw else ""
                if kw_str in missing_keywords_lower:
                    missing_priority += 1
                    adjustment -= 3  # -3 per priority keyword missing

        # Cap adjustment to prevent excessive changes
        adjustment = max(-15, min(10, adjustment))

        # Generate reasoning
        reasoning_parts = []
        if missing_priority > 0:
            reasoning_parts.append(f"{missing_priority} priority keyword(s) missing")
        if missing_high_importance > 0:
            reasoning_parts.append(f"{missing_high_importance} high-importance keyword(s) missing")
        if matched_high_importance > 0:
            reasoning_parts.append(f"{matched_high_importance} high-importance keyword(s) matched")
        if not reasoning_parts:
            reasoning_parts.append("Semantic quality within expected range")

        reasoning = "; ".join(reasoning_parts)

        # Calculate base quality score (50 is neutral)
        quality_score = 50 + adjustment

        return {
            "quality_score": max(0, min(100, quality_score)),
            "adjustment": adjustment,
            "reasoning": reasoning,
            "missing_high_importance": missing_high_importance,
            "missing_medium_importance": missing_medium_importance,
            "missing_priority": missing_priority,
            "matched_high_importance": matched_high_importance,
        }

    async def analyze_keyword_context(
        self,
        resume_text: str,
        keyword: str,
        job_description: str = None,
    ) -> Dict[str, Any]:
        """
        Analyze if a keyword is used in meaningful context.
        
        This is an optional enhancement that can be used for deeper analysis.
        Currently returns basic analysis, can be enhanced with LLM calls if needed.
        
        Args:
            resume_text: Resume text content
            keyword: Keyword to analyze
            job_description: Optional job description for context
            
        Returns:
            Dictionary with context_quality score and reasoning
        """
        # Basic implementation - can be enhanced with LLM analysis
        keyword_lower = keyword.lower()
        resume_lower = resume_text.lower()

        if keyword_lower not in resume_lower:
            return {
                "context_quality": 0,
                "reasoning": "Keyword not found in resume",
                "found": False,
            }

        # Check if keyword appears in action-oriented contexts
        action_contexts = [
            "developed",
            "implemented",
            "led",
            "managed",
            "created",
            "built",
            "improved",
            "optimized",
        ]

        # Simple heuristic: check if keyword appears near action verbs
        found_near_action = False
        for action in action_contexts:
            if action in resume_lower and keyword_lower in resume_lower:
                # Check proximity (within 50 chars)
                keyword_idx = resume_lower.find(keyword_lower)
                action_idx = resume_lower.find(action)
                if abs(keyword_idx - action_idx) < 50:
                    found_near_action = True
                    break

        if found_near_action:
            return {
                "context_quality": 80,
                "reasoning": "Keyword used in action-oriented context",
                "found": True,
            }
        else:
            return {
                "context_quality": 50,
                "reasoning": "Keyword found but context unclear",
                "found": True,
            }


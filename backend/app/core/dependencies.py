"""Shared dependencies and service initialization for API endpoints."""

from __future__ import annotations

import logging
import os
from typing import Optional

import requests

from app.core.config import settings
from app.core.openai_client import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_MAX_TOKENS, USE_AI_PARSER, openai_client
from app.services.ai_improvement_engine import AIResumeImprovementEngine
from app.services.ats_service import ATSChecker
from app.services.enhanced_ats_service import EnhancedATSChecker
from app.services.keyword_service import KeywordExtractor

logger = logging.getLogger(__name__)

# Import agents after OpenAI client is initialized
try:
    from app.agents.ats_scoring_agent import ATSScoringAgent
    from app.agents.content_generation_agent import ContentGenerationAgent
    from app.agents.cover_letter_agent import CoverLetterAgent
    from app.agents.improvement_agent import ImprovementAgent
    from app.agents.job_matching_agent import JobMatchingAgent
    logger.debug("All agent imports successful")
except ImportError as e:
    logger.error(f"Failed to import agents: {e}", exc_info=True)
    ATSScoringAgent = None
    ContentGenerationAgent = None
    CoverLetterAgent = None
    ImprovementAgent = None
    JobMatchingAgent = None
else:
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not found. AI features will be disabled.")
    elif OPENAI_API_KEY == "sk-your-openai-api-key-here":
        logger.warning(
            "OpenAI API key is still the placeholder value. Please set a real API key."
        )

# Initialize ATS checkers
ats_checker: Optional[ATSChecker] = None
try:
    ats_checker = ATSChecker()
    logger.info("ATS checker initialized successfully")
except Exception as e:
    logger.warning(f"ATS checker not available: {e}")
    ats_checker = None

enhanced_ats_checker: Optional[EnhancedATSChecker] = None
try:
    enhanced_ats_checker = EnhancedATSChecker()
    logger.info("Enhanced ATS checker initialized successfully")
except Exception as e:
    logger.warning(f"Enhanced ATS checker not available: {e}")
    enhanced_ats_checker = None

# Initialize AI improvement engine
ai_improvement_engine: Optional[AIResumeImprovementEngine] = None
try:
    ai_improvement_engine = AIResumeImprovementEngine()
    logger.info("AI Improvement Engine initialized successfully")
except Exception as e:
    logger.warning(f"AI Improvement Engine not available: {e}")
    ai_improvement_engine = None

# Initialize keyword extractor
keyword_extractor = KeywordExtractor()

# Initialize AI agents
ats_scoring_agent: Optional[ATSScoringAgent] = None
cover_letter_agent: Optional[CoverLetterAgent] = None
content_generation_agent: Optional[ContentGenerationAgent] = None
improvement_agent: Optional[ImprovementAgent] = None
job_matching_agent: Optional[JobMatchingAgent] = None

try:
    if ATSScoringAgent is not None:
        ats_scoring_agent = ATSScoringAgent()
        logger.info("ATS scoring agent initialized successfully")
except Exception as e:
    logger.warning(f"ATS scoring agent not available: {e}")
    ats_scoring_agent = None

try:
    cover_letter_agent = CoverLetterAgent()
    logger.info("Cover letter agent initialized successfully")
except Exception as e:
    logger.warning(f"Cover letter agent not available: {e}")
    cover_letter_agent = None

try:
    content_generation_agent = ContentGenerationAgent()
    logger.info("Content generation agent initialized successfully")
except Exception as e:
    logger.warning(f"Content generation agent not available: {e}")
    content_generation_agent = None

try:
    improvement_agent = ImprovementAgent()
    logger.info("Improvement agent initialized successfully")
except Exception as e:
    logger.warning(f"Improvement agent not available: {e}")
    improvement_agent = None

try:
    if JobMatchingAgent is None:
        logger.warning("JobMatchingAgent class not available (import failed)")
        job_matching_agent = None
    else:
        job_matching_agent = JobMatchingAgent()
        logger.info("Job matching agent initialized successfully")
except Exception as e:
    logger.error(f"Job matching agent initialization failed: {e}", exc_info=True)
    job_matching_agent = None


"""Service factory for dependency injection - replaces global singletons.

This factory creates service instances on demand, allowing:
- Testing with mock services
- Lazy initialization
- Better separation of concerns
- Easier refactoring

Usage:
    from app.core.service_factory import ServiceFactory
    
    # In API endpoint:
    ats_service = ServiceFactory.create_enhanced_ats_checker()
    
    # Or use dependency injection:
    from app.core.service_factory import get_enhanced_ats_service
    @router.post("/endpoint")
    async def endpoint(ats_service: EnhancedATSChecker = Depends(get_enhanced_ats_service)):
        result = ats_service.calculate_score(...)
"""
from __future__ import annotations

import logging

from app.services.ai_improvement_engine import AIResumeImprovementEngine
from app.services.ats_service import ATSChecker
from app.services.ats_rule_engine import ATSRuleEngine
from app.services.enhanced_ats_service import EnhancedATSChecker
from app.services.keyword_service import KeywordExtractor

logger = logging.getLogger(__name__)

# Import agents (optional - may fail if OpenAI not configured)
try:
    from app.agents.ats_scoring_agent import ATSScoringAgent
    from app.agents.content_generation_agent import ContentGenerationAgent
    from app.agents.cover_letter_agent import CoverLetterAgent
    from app.agents.improvement_agent import ImprovementAgent
    from app.agents.job_matching_agent import JobMatchingAgent
    AGENTS_AVAILABLE = True
except ImportError as e:
    logger.debug(f"Agents not available: {e}")
    AGENTS_AVAILABLE = False
    CoverLetterAgent = None
    ContentGenerationAgent = None
    ImprovementAgent = None
    JobMatchingAgent = None
    ATSScoringAgent = None


class ServiceFactory:
    """Creates service instances - allows testing with mocks."""

    @staticmethod
    def create_enhanced_ats_checker() -> EnhancedATSChecker:
        """Create EnhancedATSChecker instance."""
        try:
            return EnhancedATSChecker()
        except Exception as e:
            logger.error(f"Failed to create EnhancedATSChecker: {e}", exc_info=True)
            raise

    @staticmethod
    def create_ats_checker() -> ATSChecker | None:
        """Create ATSChecker instance."""
        try:
            return ATSChecker()
        except Exception as e:
            logger.warning(f"ATS checker not available: {e}")
            return None

    @staticmethod
    def create_keyword_extractor() -> KeywordExtractor:
        """Create KeywordExtractor instance."""
        try:
            return KeywordExtractor()
        except Exception as e:
            logger.error(f"Failed to create KeywordExtractor: {e}", exc_info=True)
            raise

    @staticmethod
    def create_ai_improvement_engine() -> AIResumeImprovementEngine | None:
        """Create AIResumeImprovementEngine instance."""
        try:
            return AIResumeImprovementEngine()
        except Exception as e:
            logger.warning(f"AI Improvement Engine not available: {e}")
            return None

    @staticmethod
    def create_cover_letter_agent() -> CoverLetterAgent | None:
        """Create CoverLetterAgent instance."""
        if not AGENTS_AVAILABLE or CoverLetterAgent is None:
            return None
        try:
            return CoverLetterAgent()
        except Exception as e:
            logger.warning(f"Cover letter agent not available: {e}")
            return None

    @staticmethod
    def create_content_generation_agent() -> ContentGenerationAgent | None:
        """Create ContentGenerationAgent instance."""
        if not AGENTS_AVAILABLE or ContentGenerationAgent is None:
            return None
        try:
            return ContentGenerationAgent()
        except Exception as e:
            logger.warning(f"Content generation agent not available: {e}")
            return None

    @staticmethod
    def create_improvement_agent() -> ImprovementAgent | None:
        """Create ImprovementAgent instance."""
        if not AGENTS_AVAILABLE or ImprovementAgent is None:
            return None
        try:
            return ImprovementAgent()
        except Exception as e:
            logger.warning(f"Improvement agent not available: {e}")
            return None

    @staticmethod
    def create_job_matching_agent() -> JobMatchingAgent | None:
        """Create JobMatchingAgent instance."""
        if not AGENTS_AVAILABLE or JobMatchingAgent is None:
            return None
        try:
            return JobMatchingAgent()
        except Exception as e:
            logger.warning(f"Job matching agent not available: {e}")
            return None

    @staticmethod
    def create_ats_scoring_agent() -> ATSScoringAgent | None:
        """Create ATSScoringAgent instance."""
        if not AGENTS_AVAILABLE or ATSScoringAgent is None:
            return None
        try:
            return ATSScoringAgent()
        except Exception as e:
            logger.warning(f"ATS scoring agent not available: {e}")
            return None

    @staticmethod
    def create_ats_rule_engine() -> ATSRuleEngine:
        """Create ATSRuleEngine instance."""
        try:
            return ATSRuleEngine()
        except Exception as e:
            logger.error(f"Failed to create ATSRuleEngine: {e}", exc_info=True)
            raise


# Dependency injection functions for FastAPI
def get_enhanced_ats_service() -> EnhancedATSChecker:
    """Dependency injection function for EnhancedATSChecker.
    
    Use in FastAPI endpoints:
        @router.post("/endpoint")
        async def endpoint(ats_service: EnhancedATSChecker = Depends(get_enhanced_ats_service)):
            ...
    """
    return ServiceFactory.create_enhanced_ats_checker()


def get_ats_service() -> ATSChecker | None:
    """Dependency injection function for ATSChecker."""
    return ServiceFactory.create_ats_checker()


def get_keyword_extractor_service() -> KeywordExtractor:
    """Dependency injection function for KeywordExtractor."""
    return ServiceFactory.create_keyword_extractor()


def get_ai_improvement_engine_service() -> AIResumeImprovementEngine | None:
    """Dependency injection function for AIResumeImprovementEngine."""
    return ServiceFactory.create_ai_improvement_engine()


def get_cover_letter_agent_service() -> CoverLetterAgent | None:
    """Dependency injection function for CoverLetterAgent."""
    return ServiceFactory.create_cover_letter_agent()


def get_content_generation_agent_service() -> ContentGenerationAgent | None:
    """Dependency injection function for ContentGenerationAgent."""
    return ServiceFactory.create_content_generation_agent()


def get_improvement_agent_service() -> ImprovementAgent | None:
    """Dependency injection function for ImprovementAgent."""
    return ServiceFactory.create_improvement_agent()


def get_job_matching_agent_service() -> JobMatchingAgent | None:
    """Dependency injection function for JobMatchingAgent."""
    return ServiceFactory.create_job_matching_agent()


def get_ats_scoring_agent_service() -> ATSScoringAgent | None:
    """Dependency injection function for ATSScoringAgent."""
    return ServiceFactory.create_ats_scoring_agent()


def get_ats_rule_engine_service() -> ATSRuleEngine:
    """Dependency injection function for ATSRuleEngine.
    
    Use in FastAPI endpoints:
        @router.post("/endpoint")
        async def endpoint(rule_engine: ATSRuleEngine = Depends(get_ats_rule_engine_service)):
            ...
    """
    return ServiceFactory.create_ats_rule_engine()


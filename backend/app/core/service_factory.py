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
from typing import Optional

from app.services.enhanced_ats_service import EnhancedATSChecker
from app.services.ats_service import ATSChecker
from app.services.keyword_service import KeywordExtractor
from app.services.ai_improvement_engine import AIResumeImprovementEngine

logger = logging.getLogger(__name__)


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
    def create_ats_checker() -> Optional[ATSChecker]:
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
    def create_ai_improvement_engine() -> Optional[AIResumeImprovementEngine]:
        """Create AIResumeImprovementEngine instance."""
        try:
            return AIResumeImprovementEngine()
        except Exception as e:
            logger.warning(f"AI Improvement Engine not available: {e}")
            return None


# Dependency injection functions for FastAPI
def get_enhanced_ats_service() -> EnhancedATSChecker:
    """Dependency injection function for EnhancedATSChecker.
    
    Use in FastAPI endpoints:
        @router.post("/endpoint")
        async def endpoint(ats_service: EnhancedATSChecker = Depends(get_enhanced_ats_service)):
            ...
    """
    return ServiceFactory.create_enhanced_ats_checker()


def get_ats_service() -> Optional[ATSChecker]:
    """Dependency injection function for ATSChecker."""
    return ServiceFactory.create_ats_checker()


def get_keyword_extractor_service() -> KeywordExtractor:
    """Dependency injection function for KeywordExtractor."""
    return ServiceFactory.create_keyword_extractor()


def get_ai_improvement_engine_service() -> Optional[AIResumeImprovementEngine]:
    """Dependency injection function for AIResumeImprovementEngine."""
    return ServiceFactory.create_ai_improvement_engine()


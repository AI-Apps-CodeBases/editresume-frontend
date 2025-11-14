"""OpenAI client configuration."""

from __future__ import annotations

import logging
import os
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# OpenAI Configuration
OPENAI_API_KEY = settings.openai_api_key
OPENAI_MODEL = settings.openai_model or "gpt-4o-mini"
OPENAI_MAX_TOKENS = settings.openai_max_tokens or 2000
USE_AI_PARSER = os.getenv("USE_AI_PARSER", "true").lower() == "true"

# Initialize OpenAI client
openai_client: Optional[dict] = None
if OPENAI_API_KEY and OPENAI_API_KEY != "sk-your-openai-api-key-here":
    try:
        openai_client = {
            "api_key": OPENAI_API_KEY,
            "model": OPENAI_MODEL,
            "requests": requests,
        }
        logger.info(
            f"OpenAI client initialized successfully with model: {OPENAI_MODEL}"
        )
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")
        logger.warning(
            "AI features will be disabled due to client initialization error"
        )
        openai_client = None
else:
    logger.warning(
        "OpenAI API key not configured. AI features will be disabled."
    )
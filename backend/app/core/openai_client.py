"""OpenAI client configuration."""

from __future__ import annotations

import logging
import os

import httpx
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# OpenAI Configuration
OPENAI_API_KEY = settings.openai_api_key
OPENAI_MODEL = settings.openai_model or "gpt-4o-mini"
OPENAI_MAX_TOKENS = settings.openai_max_tokens or 2000
USE_AI_PARSER = os.getenv("USE_AI_PARSER", "true").lower() == "true"

# Initialize async HTTP client with connection pooling for better performance
_httpx_client: httpx.AsyncClient | None = None

def get_httpx_client() -> httpx.AsyncClient | None:
    """Get or create async HTTP client with connection pooling."""
    global _httpx_client
    if _httpx_client is None:
        _httpx_client = httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=5.0),  # Reduced timeouts for faster failures
            limits=httpx.Limits(max_keepalive_connections=30, max_connections=150),  # Increased for better concurrency
        )
    return _httpx_client

# Initialize OpenAI client
openai_client: dict | None = None
if OPENAI_API_KEY and OPENAI_API_KEY != "sk-your-openai-api-key-here":
    try:
        openai_client = {
            "api_key": OPENAI_API_KEY,
            "model": OPENAI_MODEL,
            "requests": requests,  # Keep for backward compatibility
            "httpx_client": get_httpx_client(),  # Add async client
        }
        logger.info(
            f"OpenAI client initialized successfully with model: {OPENAI_MODEL}, max_tokens: {OPENAI_MAX_TOKENS}"
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

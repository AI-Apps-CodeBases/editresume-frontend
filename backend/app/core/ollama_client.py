"""Ollama client configuration and initialization."""

from __future__ import annotations

import logging
import os
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Ollama Configuration
OLLAMA_BASE_URL = settings.ollama_base_url
OLLAMA_MODEL = settings.ollama_model
USE_OLLAMA_FOR_PARSING = settings.use_ollama_for_parsing

# Initialize Ollama client
ollama_client: Optional[dict] = None
ollama_available: bool = False

def check_ollama_availability() -> bool:
    """Check if Ollama is running and accessible."""
    global ollama_available
    try:
        response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=5
        )
        if response.status_code == 200:
            ollama_available = True
            logger.info(f"Ollama is available at {OLLAMA_BASE_URL}")
            return True
        else:
            ollama_available = False
            logger.warning(f"Ollama API returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        ollama_available = False
        logger.warning(f"Ollama is not available: {e}")
        return False

def check_model_availability(model: str = None) -> bool:
    """Check if the specified model is available."""
    model_to_check = model or OLLAMA_MODEL
    try:
        response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=5
        )
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            # Check if model exists (with or without tag)
            model_available = any(
                model_to_check in name or name.startswith(model_to_check)
                for name in model_names
            )
            if model_available:
                logger.info(f"Model {model_to_check} is available")
            else:
                logger.warning(f"Model {model_to_check} is not available. Available models: {model_names}")
            return model_available
        return False
    except requests.exceptions.RequestException as e:
        logger.warning(f"Could not check model availability: {e}")
        return False

if USE_OLLAMA_FOR_PARSING:
    try:
        if check_ollama_availability():
            if check_model_availability():
                ollama_client = {
                    "base_url": OLLAMA_BASE_URL,
                    "model": OLLAMA_MODEL,
                    "available": True,
                }
                logger.info(
                    f"Ollama client initialized successfully with model: {OLLAMA_MODEL}"
                )
            else:
                logger.warning(
                    f"Ollama model {OLLAMA_MODEL} is not available. "
                    "Please pull it using: ollama pull {OLLAMA_MODEL}"
                )
                ollama_client = None
        else:
            logger.warning(
                f"Ollama is not running at {OLLAMA_BASE_URL}. "
                "Resume parsing will fallback to OpenAI or regex parser."
            )
            ollama_client = None
    except Exception as e:
        logger.error(f"Failed to initialize Ollama client: {e}")
        logger.warning(
            "Ollama features will be disabled due to client initialization error"
        )
        ollama_client = None
else:
    logger.info("Ollama parsing is disabled via USE_OLLAMA_FOR_PARSING flag")


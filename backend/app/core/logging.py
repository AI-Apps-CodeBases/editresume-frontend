"""Logging helpers for the FastAPI application."""

from __future__ import annotations

import logging
import sys

DEFAULT_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def setup_logging(level: int = logging.INFO, fmt: str | None = None) -> None:
    """Configure application-wide logging."""

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt or DEFAULT_LOG_FORMAT))

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicate logs in reload contexts
    for existing in root_logger.handlers[:]:
        root_logger.removeHandler(existing)

    root_logger.addHandler(handler)

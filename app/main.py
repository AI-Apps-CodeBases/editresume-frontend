"""Application entry point."""

from __future__ import annotations

from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import setup_logging
from app.legacy_app import app as legacy_application


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    setup_logging()

    legacy_application.title = settings.app_name
    legacy_application.version = settings.version

    return legacy_application


app = create_app()



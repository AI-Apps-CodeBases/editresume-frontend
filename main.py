"""Backward compatible entrypoint for ASGI servers."""

from app.main import app, create_app  # noqa: F401

__all__ = ["app", "create_app"]

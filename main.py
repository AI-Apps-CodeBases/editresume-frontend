"""Backward compatible entrypoint for ASGI servers."""

from app.main import app  # noqa: F401

__all__ = ["app"]

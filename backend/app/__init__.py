"""Application package initialization.

This package exposes the FastAPI application factory and consolidates
shared infrastructure such as configuration, database connections, and
router registration. The goal is to provide a clean, modular structure
that keeps framework glue separated from feature-specific logic while
remaining backwards compatible with existing entry points.
"""

from .main import app  # noqa: F401

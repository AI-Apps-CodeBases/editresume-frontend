"""API router registration helpers."""

from __future__ import annotations

from fastapi import FastAPI


def mount_legacy_app(app: FastAPI) -> None:
    """Mount the legacy FastAPI application until routes are fully modularised."""

    from app.legacy_app import (
        app as legacy_application,
    )  # Local import to avoid circular dependency

    app.mount("/", legacy_application)

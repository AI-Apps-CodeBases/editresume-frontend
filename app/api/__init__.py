"""API router registration helpers."""

from __future__ import annotations

from fastapi import FastAPI

from app.legacy_app import app as legacy_application


def mount_legacy_app(app: FastAPI) -> None:
    """Mount the legacy FastAPI application until routes are fully modularised."""

    app.mount("/", legacy_application)



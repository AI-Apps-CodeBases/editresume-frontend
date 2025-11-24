"""Legacy-facing wrapper for resume version domain service."""

from __future__ import annotations

from app.domain.resume.services import ResumeVersionService

__all__ = ["VersionControlService"]


class VersionControlService(ResumeVersionService):
    """Backward compatible alias for the resume version service."""

    pass

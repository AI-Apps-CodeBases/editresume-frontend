"""Domain-specific data structures for resume versioning."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ResumeVersionSnapshot(BaseModel):
    """Lightweight representation of a stored resume version."""

    id: int = Field(..., description="Database identifier")
    version_number: int = Field(..., ge=1)
    created_at: str = Field(..., description="ISO8601 timestamp")
    change_summary: str | None = Field(default=None)


class ResumeVersionDiff(BaseModel):
    """Structured diff returned when comparing two resume versions."""

    version1: ResumeVersionSnapshot
    version2: ResumeVersionSnapshot
    differences: dict[str, Any]

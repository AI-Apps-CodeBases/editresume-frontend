"""Pydantic models for the jobs domain."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class JobBase(BaseModel):
    title: str = Field(..., max_length=255)
    company: str | None = Field(default=None, max_length=255)
    description: str = Field(..., description="Full job description text")
    url: str | None = Field(default=None)
    skills: list[str] = Field(default_factory=list)


class JobCreate(JobBase):
    user_id: int = Field(..., ge=1)


class Job(JobBase):
    id: int = Field(..., ge=1)
    user_id: int = Field(..., ge=1)
    created_at: datetime

    class Config:
        orm_mode = True










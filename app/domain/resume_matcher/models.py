"""Pydantic models for resume-job matching."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class ResumeJobMatch(BaseModel):
    resume_id: int = Field(..., ge=1)
    job_id: int = Field(..., ge=1)
    score: float = Field(..., ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class ATSScore(BaseModel):
    overall_score: float = Field(..., ge=0, le=100)
    keyword_match: float = Field(..., ge=0, le=100)
    experience_relevance: float = Field(..., ge=0, le=100)
    skills_coverage: float = Field(..., ge=0, le=100)
    suggestions: List[str] = Field(default_factory=list)








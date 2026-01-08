"""Shared Pydantic models for API endpoints."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class BulletParam(BaseModel):
    id: str | None = None
    text: str
    params: dict[str, Any] | None = {}  # Changed from Dict[str, str] to accept boolean values (visible: true/false)


class Section(BaseModel):
    id: str | None = None
    title: str
    bullets: list[BulletParam] = []
    params: dict[str, Any] | None = None


class ResumePayload(BaseModel):
    name: str
    title: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    sections: list[Section] = []
    variant: str | None = None


class EnhancedATSPayload(BaseModel):
    resume_data: ResumePayload | None = None  # Make optional since we can use resume_text
    resume_text: str | None = None  # Text extracted from live preview - more accurate than resume_data
    job_description: str | None = None
    target_role: str | None = None
    industry: str | None = None
    extracted_keywords: dict[str, Any] | None = None  # Extension-extracted keywords from LLM
    previous_score: int | None = None  # Previous ATS score to prevent decreases


class AIImprovementPayload(BaseModel):
    resume_data: ResumePayload
    job_description: str | None = None
    target_role: str | None = None
    industry: str | None = None
    strategy: str | None = None  # Specific improvement strategy to focus on


class ExportPayload(BaseModel):
    name: str
    title: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    sections: list[Section] = []
    replacements: dict[str, str] | None = None
    template: str | None = "tech"
    templateConfig: dict[str, Any] | None = None  # Full template configuration
    design: dict[str, Any] | None = None  # Legacy design object
    fieldsVisible: dict[str, bool] | None = None  # CRITICAL: Controls visibility of fields (name, title, summary, etc.)
    two_column_left: list[str] | None = []
    two_column_right: list[str] | None = []
    two_column_left_width: int | None = 50
    cover_letter: str | None = None
    company_name: str | None = None  # Company name for cover letter title
    position_title: str | None = None  # Position title for cover letter title


class LoginPayload(BaseModel):
    email: str
    password: str


class SignupPayload(BaseModel):
    email: str
    password: str
    name: str


class ImproveBulletPayload(BaseModel):
    bullet: str
    context: str | None = None
    tone: str | None = "professional"


class GenerateBulletPointsPayload(BaseModel):
    role: str
    company: str
    skills: str
    count: int = 5
    tone: str | None = "professional"


class GenerateSummaryPayload(BaseModel):
    role: str
    years_experience: int
    skills: str
    achievements: str | None = None


class JobDescriptionMatchPayload(BaseModel):
    job_description: str
    resume_data: ResumePayload


class CoverLetterPayload(BaseModel):
    job_description: str
    resume_data: ResumePayload
    company_name: str
    position_title: str
    tone: str = "professional"
    custom_requirements: str | None = None
    selected_sentences: list[str] | None = None  # Selected JD sentences to use


class ExtractSentencesPayload(BaseModel):
    job_description: str


class WorkExperienceRequest(BaseModel):
    currentCompany: str | None = None
    currentJobTitle: str | None = None
    currentDateRange: str | None = None
    experienceDescription: str | None = None
    projects: str | None = None
    jobDescription: str | None = None
    role: str | None = None
    company: str | None = None
    duration: str | None = None
    skills: list[str] = []
    achievements: str | None = None
    tone: str | None = "professional"


class CreateVersionPayload(BaseModel):
    resume_id: int
    resume_data: dict[str, Any]
    change_summary: str | None = None
    is_auto_save: bool = False
    tokens_used: int | None = None  # Track OpenAI token usage


class RollbackVersionPayload(BaseModel):
    version_id: int


class CompareVersionsPayload(BaseModel):
    version1_id: int
    version2_id: int


class SaveResumePayload(BaseModel):
    name: str
    title: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    sections: list[Section] = []
    template: str | None = "tech"


class MatchCreate(BaseModel):
    resumeId: int | None = None
    jobDescriptionId: int
    user_email: str | None = None
    resume_name: str | None = None
    resume_title: str | None = None
    resume_snapshot: dict[str, Any] | None = None
    resume_version_id: int | None = None
    ats_score: int | None = None
    jd_metadata: dict[str, Any] | None = None
    matched_keywords: list[str] | None = None
    missing_keywords: list[str] | None = None
    keyword_coverage: float | None = None


class JobDescriptionUpdate(BaseModel):
    max_salary: int | None = None
    status: str | None = None
    follow_up_date: str | None = None
    importance: int | None = None  # 0-5 stars (0 = not set, 1-5 = star rating)
    notes: str | None = None


class JobCoverLetterCreate(BaseModel):
    title: str
    content: str


class JobCoverLetterUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class ExtractKeywordsPayload(BaseModel):
    job_description: str


class ScrapeJobUrlPayload(BaseModel):
    url: str


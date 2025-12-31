"""Shared Pydantic models for API endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class BulletParam(BaseModel):
    id: Optional[str] = None
    text: str
    params: Optional[Dict[str, str]] = {}


class Section(BaseModel):
    id: Optional[str] = None
    title: str
    bullets: List[BulletParam] = []
    params: Optional[Dict[str, Any]] = None


class ResumePayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    variant: Optional[str] = None


class EnhancedATSPayload(BaseModel):
    resume_data: Optional[ResumePayload] = None  # Make optional since we can use resume_text
    resume_text: Optional[str] = None  # Text extracted from live preview - more accurate than resume_data
    job_description: Optional[str] = None
    target_role: Optional[str] = None
    industry: Optional[str] = None
    extracted_keywords: Optional[Dict[str, Any]] = None  # Extension-extracted keywords from LLM
    previous_score: Optional[int] = None  # Previous ATS score to prevent decreases


class AIImprovementPayload(BaseModel):
    resume_data: ResumePayload
    job_description: Optional[str] = None
    target_role: Optional[str] = None
    industry: Optional[str] = None
    strategy: Optional[str] = None  # Specific improvement strategy to focus on


class ExportPayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    replacements: Optional[Dict[str, str]] = None
    template: Optional[str] = "tech"
    templateConfig: Optional[Dict[str, Any]] = None  # Full template configuration
    design: Optional[Dict[str, Any]] = None  # Legacy design object
    fieldsVisible: Optional[Dict[str, bool]] = None  # CRITICAL: Controls visibility of fields (name, title, summary, etc.)
    two_column_left: Optional[List[str]] = []
    two_column_right: Optional[List[str]] = []
    two_column_left_width: Optional[int] = 50
    cover_letter: Optional[str] = None
    company_name: Optional[str] = None  # Company name for cover letter title
    position_title: Optional[str] = None  # Position title for cover letter title


class LoginPayload(BaseModel):
    email: str
    password: str


class SignupPayload(BaseModel):
    email: str
    password: str
    name: str


class ImproveBulletPayload(BaseModel):
    bullet: str
    context: Optional[str] = None
    tone: Optional[str] = "professional"


class GenerateBulletPointsPayload(BaseModel):
    role: str
    company: str
    skills: str
    count: int = 5
    tone: Optional[str] = "professional"


class GenerateSummaryPayload(BaseModel):
    role: str
    years_experience: int
    skills: str
    achievements: Optional[str] = None


class JobDescriptionMatchPayload(BaseModel):
    job_description: str
    resume_data: ResumePayload


class CoverLetterPayload(BaseModel):
    job_description: str
    resume_data: ResumePayload
    company_name: str
    position_title: str
    tone: str = "professional"
    custom_requirements: Optional[str] = None
    selected_sentences: Optional[List[str]] = None  # Selected JD sentences to use


class ExtractSentencesPayload(BaseModel):
    job_description: str


class WorkExperienceRequest(BaseModel):
    currentCompany: Optional[str] = None
    currentJobTitle: Optional[str] = None
    currentDateRange: Optional[str] = None
    experienceDescription: Optional[str] = None
    projects: Optional[str] = None
    jobDescription: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    skills: List[str] = []
    achievements: Optional[str] = None
    tone: Optional[str] = "professional"


class CreateVersionPayload(BaseModel):
    resume_id: int
    resume_data: Dict[str, Any]
    change_summary: Optional[str] = None
    is_auto_save: bool = False
    tokens_used: Optional[int] = None  # Track OpenAI token usage


class RollbackVersionPayload(BaseModel):
    version_id: int


class CompareVersionsPayload(BaseModel):
    version1_id: int
    version2_id: int


class SaveResumePayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    template: Optional[str] = "tech"


class MatchCreate(BaseModel):
    resumeId: Optional[int] = None
    jobDescriptionId: int
    user_email: Optional[str] = None
    resume_name: Optional[str] = None
    resume_title: Optional[str] = None
    resume_snapshot: Optional[Dict[str, Any]] = None
    resume_version_id: Optional[int] = None
    ats_score: Optional[int] = None
    jd_metadata: Optional[Dict[str, Any]] = None
    matched_keywords: Optional[List[str]] = None
    missing_keywords: Optional[List[str]] = None
    keyword_coverage: Optional[float] = None


class JobDescriptionUpdate(BaseModel):
    max_salary: Optional[int] = None
    status: Optional[str] = None
    follow_up_date: Optional[str] = None
    importance: Optional[int] = None  # 0-5 stars (0 = not set, 1-5 = star rating)
    notes: Optional[str] = None


class JobCoverLetterCreate(BaseModel):
    title: str
    content: str


class JobCoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class ExtractKeywordsPayload(BaseModel):
    job_description: str


class ScrapeJobUrlPayload(BaseModel):
    url: str


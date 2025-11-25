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
    resume_data: ResumePayload
    job_description: Optional[str] = None
    target_role: Optional[str] = None
    industry: Optional[str] = None


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
    two_column_left: Optional[List[str]] = []
    two_column_right: Optional[List[str]] = []
    two_column_left_width: Optional[int] = 50
    cover_letter: Optional[str] = None
    company_name: Optional[str] = None  # Company name for cover letter title


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


class GrammarCheckPayload(BaseModel):
    text: str
    check_type: str = "all"  # "grammar", "style", "all"


class WorkExperienceRequest(BaseModel):
    role: str
    company: str
    duration: str
    skills: List[str] = []
    achievements: Optional[str] = None
    tone: Optional[str] = "professional"


class CreateVersionPayload(BaseModel):
    resume_id: int
    resume_data: Dict[str, Any]
    change_summary: Optional[str] = None
    is_auto_save: bool = False


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
    important_emoji: Optional[str] = None
    notes: Optional[str] = None


class JobCoverLetterCreate(BaseModel):
    title: str
    content: str


class JobCoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class ExtractKeywordsPayload(BaseModel):
    job_description: str


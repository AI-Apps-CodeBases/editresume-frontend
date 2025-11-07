"""Job description and matching models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    company = Column(String)
    source = Column(String)
    url = Column(String)
    easy_apply_url = Column(String)
    location = Column(String)
    work_type = Column(String)
    job_type = Column(String)
    content = Column(Text, nullable=False)
    extracted_keywords = Column(JSON)
    priority_keywords = Column(JSON)
    soft_skills = Column(JSON)
    high_frequency_keywords = Column(JSON)
    ats_insights = Column(JSON)
    max_salary = Column(Integer)
    status = Column(String, default="bookmarked")
    follow_up_date = Column(DateTime)
    important_emoji = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    match_sessions = relationship(
        "MatchSession",
        back_populates="job_description",
        cascade="all, delete-orphan",
    )
    resume_versions = relationship(
        "JobResumeVersion",
        back_populates="job_description",
        cascade="all, delete-orphan",
        order_by="JobResumeVersion.updated_at.desc()",
    )
    cover_letters = relationship(
        "JobCoverLetter",
        back_populates="job_description",
        cascade="all, delete-orphan",
        order_by="JobCoverLetter.created_at.desc()",
    )
    user = relationship("User")


class JobResumeVersion(Base):
    __tablename__ = "job_resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    job_description_id = Column(
        Integer,
        ForeignKey("job_descriptions.id"),
        nullable=False,
        index=True,
    )
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=True)
    resume_name = Column(String)
    resume_version_label = Column(String)
    ats_score = Column(Integer)
    keyword_coverage = Column(Float)
    matched_keywords = Column(JSON)
    missing_keywords = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_description = relationship("JobDescription", back_populates="resume_versions")
    resume = relationship("Resume")
    resume_version = relationship("ResumeVersion")


class JobCoverLetter(Base):
    __tablename__ = "job_cover_letters"

    id = Column(Integer, primary_key=True, index=True)
    job_description_id = Column(
        Integer,
        ForeignKey("job_descriptions.id"),
        nullable=False,
        index=True,
    )
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    version_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_description = relationship("JobDescription", back_populates="cover_letters")


class MatchSession(Base):
    __tablename__ = "match_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=False)
    score = Column(Integer, nullable=False)
    keyword_coverage = Column(Float)
    matched_keywords = Column(JSON)
    missing_keywords = Column(JSON)
    excess_keywords = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    resume = relationship("Resume", back_populates="match_sessions")
    job_description = relationship("JobDescription", back_populates="match_sessions")


__all__ = [
    "JobDescription",
    "JobResumeVersion",
    "JobCoverLetter",
    "MatchSession",
]



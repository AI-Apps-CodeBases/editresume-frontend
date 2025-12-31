"""User domain models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    premium_purchased_at = Column(DateTime, nullable=True, index=True)
    trial_started_at = Column(DateTime, nullable=True, index=True)
    linkedin_token = Column(Text, nullable=True)
    linkedin_profile_url = Column(String, nullable=True)
    linkedin_id = Column(String, nullable=True)

    resumes = relationship("Resume", back_populates="user")
    resume_versions = relationship("ResumeVersion", back_populates="user")
    export_analytics = relationship("ExportAnalytics", back_populates="user")
    job_matches = relationship("JobMatch", back_populates="user")
    shared_resumes = relationship("SharedResume", back_populates="user")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    resume_generations = relationship(
        "ResumeGeneration", back_populates="user", cascade="all, delete-orphan"
    )
    ai_usage = relationship("AIUsage", back_populates="user")
    trial_period = relationship("TrialPeriod", back_populates="user", uselist=False)


__all__ = ["User"]

"""Job match analytics models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=True)
    job_description = Column(Text, nullable=False)
    match_score = Column(Integer, nullable=False)
    keyword_matches = Column(JSON)
    missing_keywords = Column(JSON)
    improvement_suggestions = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="job_matches")


__all__ = ["JobMatch"]

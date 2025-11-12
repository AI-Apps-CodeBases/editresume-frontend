"""Models related to sharing resumes externally."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class SharedResume(Base):
    __tablename__ = "shared_resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share_token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    password_protected = Column(Boolean, default=False)
    password_hash = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="shared_resumes")
    user = relationship("User", back_populates="shared_resumes")
    views = relationship(
        "ResumeView",
        back_populates="shared_resume",
        cascade="all, delete-orphan",
    )


class ResumeView(Base):
    __tablename__ = "resume_views"

    id = Column(Integer, primary_key=True, index=True)
    shared_resume_id = Column(Integer, ForeignKey("shared_resumes.id"), nullable=False)
    viewer_ip = Column(String)
    viewer_user_agent = Column(String)
    referrer = Column(String)
    country = Column(String)
    city = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    shared_resume = relationship("SharedResume", back_populates="views")


class SharedResumeComment(Base):
    __tablename__ = "shared_resume_comments"

    id = Column(Integer, primary_key=True, index=True)
    shared_resume_id = Column(Integer, ForeignKey("shared_resumes.id"), nullable=False)
    commenter_name = Column(String, nullable=False)
    commenter_email = Column(String)
    text = Column(Text, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    shared_resume = relationship("SharedResume")


__all__ = ["SharedResume", "ResumeView", "SharedResumeComment"]

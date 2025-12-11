"""Usage tracking models for AI features and trial periods."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.db import Base


class AIUsage(Base):
    """Track AI API calls per user or guest session."""
    __tablename__ = "ai_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)  # For guest users
    feature_type = Column(String, nullable=False, index=True)  # improvement, grammar, ats, cover_letter, etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="ai_usage")

    def __repr__(self):
        return f"<AIUsage(id={self.id}, user_id={self.user_id}, feature_type={self.feature_type})>"


class TrialPeriod(Base):
    """Track 3-day free trial periods for users."""
    __tablename__ = "trial_periods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)

    user = relationship("User", back_populates="trial_period")

    def __init__(self, user_id: int, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.started_at = datetime.utcnow()
        self.expires_at = self.started_at + timedelta(days=3)
        self.is_active = True

    def is_expired(self) -> bool:
        """Check if trial period has expired."""
        return datetime.utcnow() > self.expires_at

    def __repr__(self):
        return f"<TrialPeriod(id={self.id}, user_id={self.user_id}, is_active={self.is_active})>"


__all__ = ["AIUsage", "TrialPeriod"]


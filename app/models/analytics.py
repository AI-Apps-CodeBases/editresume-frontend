"""Analytics-related ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.db import Base


class ExportAnalytics(Base):
    __tablename__ = "export_analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    export_format = Column(String, nullable=False)
    template_used = Column(String)
    file_size = Column(Integer)
    export_success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="export_analytics")
    resume = relationship("Resume", back_populates="exports")


__all__ = ["ExportAnalytics"]



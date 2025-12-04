"""Analytics and visitor tracking models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class ExportAnalytics(Base):
    """Analytics for PDF/DOCX exports."""
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


class VisitorAnalytics(Base):
    """Track visitor analytics including country, IP, and page views."""
    __tablename__ = "visitor_analytics"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    country = Column(String, nullable=True, index=True)
    country_code = Column(String, nullable=True, index=True)
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    referrer = Column(Text, nullable=True)
    path = Column(String, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # If logged in user
    session_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<VisitorAnalytics(id={self.id}, country={self.country}, path={self.path})>"


__all__ = ["ExportAnalytics", "VisitorAnalytics"]

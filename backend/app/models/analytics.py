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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)  # For guest users
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    export_format = Column(String, nullable=False)
    template_used = Column(String)
    file_size = Column(Integer)
    export_success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

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


class BillingEvent(Base):
    """Funnel tracking for billing and subscriptions."""
    __tablename__ = "billing_events"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, nullable=True, index=True)  # Firebase UID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    
    event_type = Column(String, nullable=False, index=True)  # checkout_created, checkout_success, checkout_cancel, etc.
    plan_type = Column(String, nullable=True)
    period = Column(String, nullable=True)
    
    # Stripe IDs for correlation
    stripe_checkout_session_id = Column(String, nullable=True, index=True)
    stripe_customer_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True, index=True)
    stripe_payment_intent_id = Column(String, nullable=True, index=True)
    
    # Failure details (the "Why")
    failure_code = Column(String, nullable=True)
    failure_message = Column(Text, nullable=True)
    
    # Metadata and tracking
    referrer = Column(Text, nullable=True)
    raw_data = Column(Text, nullable=True)  # JSON dump for debugging
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", backref="billing_events")


class PageEngagementEvent(Base):
    """Track per-page engagement such as time-on-page and scroll depth."""
    __tablename__ = "page_engagement_events"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, nullable=True, index=True)  # Firebase UID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    path = Column(String, nullable=True, index=True)
    referrer = Column(Text, nullable=True)
    event_type = Column(String, nullable=False, index=True)  # page_view, page_exit
    duration_ms = Column(Integer, nullable=True)
    scroll_depth = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", backref="page_engagement_events")


__all__ = ["ExportAnalytics", "VisitorAnalytics", "BillingEvent", "PageEngagementEvent"]

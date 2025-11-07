"""Compatibility module for legacy imports.

The backend now organises persistence logic under ``app.core`` and
``app.models``. This module re-exports the previous interface so that
scripts and modules importing ``database`` continue to work while code
is incrementally migrated to the new structure.
"""

from app.core.db import (  # noqa: F401
    Base,
    DATABASE_URL,
    SessionLocal,
    create_tables,
    engine,
    get_db,
    migrate_schema,
)
from app.models import (  # noqa: F401
    ExportAnalytics,
    JobCoverLetter,
    JobDescription,
    JobMatch,
    JobResumeVersion,
    MatchSession,
    Resume,
    ResumeVersion,
    ResumeView,
    SharedResume,
    SharedResumeComment,
    User,
)

__all__ = [
    "Base",
    "DATABASE_URL",
    "SessionLocal",
    "create_tables",
    "engine",
    "get_db",
    "migrate_schema",
    "User",
    "Resume",
    "ResumeVersion",
    "JobDescription",
    "JobResumeVersion",
    "JobCoverLetter",
    "ExportAnalytics",
    "SharedResume",
    "ResumeView",
    "SharedResumeComment",
    "JobMatch",
    "MatchSession",
]



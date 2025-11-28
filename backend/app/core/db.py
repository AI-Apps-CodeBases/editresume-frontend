"""Database configuration and helpers."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _parse_database_url(database_url: str | None) -> str:
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable is required. "
            "Please set it to your PostgreSQL connection string.",
        )

    if "ostgresql" in database_url and not database_url.startswith("postgresql"):
        database_url = database_url.replace("ostgresql", "postgresql")

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    if not database_url.startswith("postgresql"):
        raise ValueError(
            "Only PostgreSQL is supported. Invalid DATABASE_URL: "
            f"{database_url[:20]}...",
        )

    return database_url


DATABASE_URL = _parse_database_url(settings.database_url or os.getenv("DATABASE_URL"))


def _create_engine(database_url: str) -> Engine:
    try:
        engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=300)
        return engine
    except Exception as exc:  # pragma: no cover - startup safety net
        raise RuntimeError(f"Error creating database engine: {exc}") from exc


engine = _create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:  # pragma: no cover - keep behaviour identical to legacy
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    from app import models  # noqa: F401  # Ensure model metadata is registered

    Base.metadata.create_all(bind=engine)


def migrate_schema() -> None:
    """Lightweight, idempotent schema migrations."""

    backend_name = engine.url.get_backend_name()
    if backend_name != "postgresql":
        return

    from app.models.job import JobCoverLetter, JobResumeVersion  # noqa: WPS433

    # Ensure auxiliary tables exist
    JobResumeVersion.__table__.create(bind=engine, checkfirst=True)
    JobCoverLetter.__table__.create(bind=engine, checkfirst=True)

    with engine.connect() as conn:
        # Check and fix job_descriptions.user_id nullability
        result = conn.execute(
            text(
                """
                SELECT is_nullable FROM information_schema.columns
                WHERE table_name='job_descriptions' AND column_name='user_id'
                """
            )
        )
        row = result.fetchone()
        if row and row[0] == "NO":
            conn.execute(
                text(
                    "ALTER TABLE job_descriptions " "ALTER COLUMN user_id DROP NOT NULL"
                )
            )
            conn.commit()

        # Check if match_sessions.user_id exists, add it if not
        result = conn.execute(
            text(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name='match_sessions' AND column_name='user_id'
                """
            )
        )
        row = result.fetchone()
        if not row:
            conn.execute(
                text(
                    """
                    ALTER TABLE match_sessions 
                    ADD COLUMN user_id INTEGER REFERENCES users(id)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE match_sessions ms
                    SET user_id = r.user_id
                    FROM resumes r
                    WHERE ms.resume_id = r.id AND ms.user_id IS NULL
                    """
                )
            )
            conn.execute(
                text("ALTER TABLE match_sessions ALTER COLUMN user_id SET NOT NULL")
            )
            conn.commit()

        column_additions = {
            "job_descriptions": {
                "easy_apply_url": "TEXT",
                "location": "VARCHAR",
                "work_type": "VARCHAR",
                "job_type": "VARCHAR",
                "soft_skills": "JSON",
                "high_frequency_keywords": "JSON",
                "ats_insights": "JSON",
                "priority_keywords": "JSON",
                "max_salary": "INTEGER",
                "status": "VARCHAR",
                "follow_up_date": "TIMESTAMP",
                "important_emoji": "VARCHAR",
                "notes": "TEXT",
            },
            "users": {
                "linkedin_token": "TEXT",
                "linkedin_profile_url": "VARCHAR(255)",
                "linkedin_id": "VARCHAR(255)",
            },
        }

        for table_name, columns in column_additions.items():
            for column_name, column_type in columns.items():
                result = conn.execute(
                    text(
                        """
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name=:table_name AND column_name=:column_name
                        """
                    ),
                    {"table_name": table_name, "column_name": column_name},
                )
                row = result.fetchone()
                if not row:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table_name} "
                            f"ADD COLUMN {column_name} {column_type}"
                        )
                    )
                    conn.commit()

        # Create index on users.linkedin_id if it doesn't exist
        result = conn.execute(
            text(
                """
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'users' 
                AND indexname = 'idx_users_linkedin_id'
                """
            )
        )
        row = result.fetchone()
        if not row:
            conn.execute(
                text(
                    """
                    CREATE INDEX idx_users_linkedin_id 
                    ON users(linkedin_id) 
                    WHERE linkedin_id IS NOT NULL
                    """
                )
            )
            conn.commit()

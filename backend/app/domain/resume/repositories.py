"""Data access layer for resume versioning."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.resume import ResumeVersion


class ResumeVersionRepository:
    """Encapsulates persistence logic for resume versions."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def latest_for_resume(
        self, resume_id: int, user_id: int
    ) -> Optional[ResumeVersion]:
        return (
            self._session.query(ResumeVersion)
            .filter(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
            )
            .order_by(ResumeVersion.version_number.desc())
            .first()
        )

    def list_for_resume(self, resume_id: int, user_id: int) -> List[ResumeVersion]:
        return (
            self._session.query(ResumeVersion)
            .filter(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
            )
            .order_by(ResumeVersion.version_number.desc())
            .all()
        )

    def get(self, version_id: int, user_id: int) -> Optional[ResumeVersion]:
        return (
            self._session.query(ResumeVersion)
            .filter(
                ResumeVersion.id == version_id,
                ResumeVersion.user_id == user_id,
            )
            .first()
        )

    def count_for_resume(self, resume_id: int, user_id: int) -> int:
        return (
            self._session.query(ResumeVersion)
            .filter(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
            )
            .count()
        )

    def list_auto_saves(self, resume_id: int, user_id: int) -> List[ResumeVersion]:
        return (
            self._session.query(ResumeVersion)
            .filter(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
                ResumeVersion.is_auto_save.is_(True),
            )
            .order_by(ResumeVersion.created_at.desc())
            .all()
        )

    def save(self, version: ResumeVersion) -> ResumeVersion:
        self._session.add(version)
        self._session.commit()
        self._session.refresh(version)
        return version

    def delete(self, version: ResumeVersion) -> None:
        self._session.delete(version)
        self._session.commit()

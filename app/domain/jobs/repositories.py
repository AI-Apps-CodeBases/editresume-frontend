"""Data access layer for jobs."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.jobs.models import Job, JobCreate
from app.models.job import Job as JobRecord


class JobRepository:
    """Encapsulates persistence operations for jobs."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: JobCreate) -> Job:
        record = JobRecord(
            user_id=payload.user_id,
            title=payload.title,
            company=payload.company,
            description=payload.description,
            url=payload.url,
            skills=payload.skills,
        )
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
        return self._to_domain(record)

    def list_for_user(self, user_id: int) -> List[Job]:
        statement = (
            select(JobRecord)
            .where(JobRecord.user_id == user_id)
            .order_by(JobRecord.created_at.desc())
        )
        records = self._session.execute(statement).scalars().all()
        return [self._to_domain(record) for record in records]

    def get(self, job_id: int, user_id: int) -> Optional[Job]:
        statement = select(JobRecord).where(
            JobRecord.id == job_id,
            JobRecord.user_id == user_id,
        )
        record = self._session.execute(statement).scalar_one_or_none()
        return self._to_domain(record) if record else None

    def delete(self, job_id: int, user_id: int) -> bool:
        statement = select(JobRecord).where(
            JobRecord.id == job_id,
            JobRecord.user_id == user_id,
        )
        record = self._session.execute(statement).scalar_one_or_none()
        if record is None:
            return False

        self._session.delete(record)
        self._session.commit()
        return True

    @staticmethod
    def _to_domain(record: JobRecord) -> Job:
        return Job(
            id=record.id,
            user_id=record.user_id,
            title=record.title,
            company=record.company,
            description=record.description,
            url=record.url,
            skills=record.skills or [],
            created_at=record.created_at,
        )






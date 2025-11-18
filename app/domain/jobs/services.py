"""Application services for the jobs domain."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.jobs.models import Job, JobCreate
from app.domain.jobs.repositories import JobRepository


class JobService:
    """Coordinates job persistence and business rules."""

    def __init__(self, session: Session, repository: JobRepository | None = None) -> None:
        self._repository = repository or JobRepository(session)

    def create_job(self, payload: JobCreate) -> Job:
        return self._repository.create(payload)

    def list_jobs(self, user_id: int) -> List[Job]:
        return self._repository.list_for_user(user_id)

    def get_job(self, job_id: int, user_id: int) -> Optional[Job]:
        return self._repository.get(job_id=job_id, user_id=user_id)

    def delete_job(self, job_id: int, user_id: int) -> bool:
        return self._repository.delete(job_id=job_id, user_id=user_id)








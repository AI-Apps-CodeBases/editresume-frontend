"""Persistence helpers for resume-job matching."""

from __future__ import annotations

from typing import Optional, Sequence, Tuple, List

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job import Job, ResumeGeneration, JobDescription
from app.models.resume import Resume, ResumeVersion


class ResumeMatchRepository:
    """Provides access to resumes, jobs, and generation history."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def fetch_job(self, job_id: int, user_id: int) -> Optional[Job]:
        statement = select(Job).where(Job.id == job_id, Job.user_id == user_id)
        job = self._session.execute(statement).scalar_one_or_none()
        if job is not None:
            return job

        legacy_stmt = select(JobDescription).where(JobDescription.id == job_id)
        legacy = self._session.execute(legacy_stmt).scalar_one_or_none()
        if legacy is None:
            return None

        if legacy.user_id and legacy.user_id != user_id:
            return None

        skills = self._extract_skills_from_legacy(legacy)
        job = Job(
            id=legacy.id,
            user_id=user_id,
            title=legacy.title or "Untitled Role",
            company=legacy.company,
            description=legacy.content,
            url=legacy.url,
            skills=skills,
            created_at=legacy.created_at or datetime.utcnow(),
        )
        self._session.add(job)
        self._session.commit()
        self._session.refresh(job)
        return job

    def fetch_resume_with_latest_version(
        self, resume_id: int, user_id: int
    ) -> Tuple[Optional[Resume], Optional[ResumeVersion]]:
        resume_stmt = select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == user_id,
        )
        resume = self._session.execute(resume_stmt).scalar_one_or_none()
        if resume is None:
            return None, None

        version_stmt = (
            select(ResumeVersion)
            .where(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
            )
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        version = self._session.execute(version_stmt).scalar_one_or_none()
        return resume, version

    def list_resume_versions(
        self, resume_id: int, user_id: int
    ) -> Sequence[ResumeVersion]:
        statement = (
            select(ResumeVersion)
            .where(
                ResumeVersion.resume_id == resume_id,
                ResumeVersion.user_id == user_id,
            )
            .order_by(ResumeVersion.version_number.desc())
        )
        return self._session.execute(statement).scalars().all()

    def record_generation(
        self,
        *,
        user_id: int,
        job_id: int,
        source_resume_ids: Sequence[int],
        generated_resume_id: Optional[int],
        ats_score: float,
    ) -> ResumeGeneration:
        record = ResumeGeneration(
            user_id=user_id,
            job_id=job_id,
            source_resume_ids=list(source_resume_ids),
            generated_resume_id=generated_resume_id,
            ats_score=ats_score,
        )
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
        return record

    @staticmethod
    def _extract_skills_from_legacy(legacy: JobDescription) -> List[str]:
        buckets = []
        for attr in (
            "skills",
            "extracted_keywords",
            "priority_keywords",
            "high_frequency_keywords",
            "soft_skills",
        ):
            if hasattr(legacy, attr):
                value = getattr(legacy, attr)
                if value:
                    buckets.append(value)
        skills: List[str] = []
        for bucket in buckets:
            if not bucket:
                continue
            if isinstance(bucket, list):
                skills.extend(str(item).strip() for item in bucket if item)
        unique_skills = []
        seen = set()
        for skill in skills:
            lower = skill.lower()
            if lower in seen:
                continue
            seen.add(lower)
            unique_skills.append(skill)
        return unique_skills[:20]


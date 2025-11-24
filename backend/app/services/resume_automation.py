"""Automation service orchestrating resume generation from job data."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from sqlalchemy.orm import Session

from app.domain.resume_matcher.models import ATSScore, ResumeJobMatch
from app.domain.resume_matcher.repositories import ResumeMatchRepository
from app.domain.resume_matcher.services import (
    ATSOptimizationService,
    ResumeMatchingService,
)
from app.models.job import Job
from app.models.resume import Resume, ResumeVersion


class ResumeAutomationService:
    """Coordinates retrieval, analysis, and generation of tailored resumes."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._repository = ResumeMatchRepository(session)
        self._matching_service = ResumeMatchingService(
            session,
            repository=self._repository,
        )
        self._optimization_service = ATSOptimizationService()

    async def generate_resume_from_job(
        self,
        user_id: int,
        job_id: int,
        source_resume_ids: Sequence[int],
    ) -> Tuple[Dict[str, Any], ATSScore]:
        if not source_resume_ids:
            raise ValueError("At least one source resume id is required")

        job = self._repository.fetch_job(job_id, user_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found for user {user_id}")

        match_summaries: List[Tuple[ResumeJobMatch, ATSScore, Dict[str, Any]]] = []
        for resume_id in source_resume_ids:
            try:
                summary = self._matching_service.build_match_summary(
                    resume_id, job_id, user_id
                )
                match_summaries.append(summary)
            except ValueError:
                continue

        if not match_summaries:
            raise ValueError("No valid source resumes found for the provided ids")

        # Sort by score to select the strongest base resume
        match_summaries.sort(key=lambda item: item[0].score, reverse=True)
        best_match, best_score, best_resume_data = match_summaries[0]

        aggregated_sections = self._collect_sections(match_summaries)
        job_requirements = self._derive_job_requirements(job)

        optimised_content = self._optimization_service.generate_optimized_content(
            aggregated_sections,
            job_requirements,
        )

        summary_text = self._compose_summary(job, best_match, best_resume_data)
        skills_section = self._compose_skills(job, match_summaries, best_resume_data)
        experience_section = self._compose_experience_section(optimised_content)

        generated_resume_payload = self._build_resume_payload(
            job=job,
            base_resume=best_resume_data,
            summary_text=summary_text,
            sections=[experience_section, skills_section],
        )

        created_resume = self._persist_generated_resume(
            user_id=user_id,
            payload=generated_resume_payload,
            change_summary=f"Auto-generated from job {job.title}",
        )

        self._repository.record_generation(
            user_id=user_id,
            job_id=job.id,
            source_resume_ids=source_resume_ids,
            generated_resume_id=created_resume["resume"]["id"],
            ats_score=best_score.overall_score,
        )

        created_resume["insights"] = {
            "match": best_match.dict(),
            "job": {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "skills": job.skills or [],
            },
        }

        return created_resume, best_score

    def _persist_generated_resume(
        self,
        *,
        user_id: int,
        payload: Dict[str, Any],
        change_summary: str,
    ) -> Dict[str, Any]:
        resume = Resume(
            user_id=user_id,
            name=payload["name"] or f"Optimized Resume {datetime.utcnow():%Y%m%d%H%M}",
            title=payload["title"],
            email=payload.get("email"),
            phone=payload.get("phone"),
            location=payload.get("location"),
            summary=payload["summary"],
            template=payload.get("template", "tech"),
        )
        self._session.add(resume)
        self._session.commit()
        self._session.refresh(resume)

        version = ResumeVersion(
            resume_id=resume.id,
            user_id=user_id,
            version_number=1,
            resume_data=payload,
            change_summary=change_summary,
            is_auto_save=False,
        )
        self._session.add(version)
        self._session.commit()
        self._session.refresh(version)

        return {
            "resume": {
                "id": resume.id,
                "name": resume.name,
                "title": resume.title,
                "email": resume.email,
                "phone": resume.phone,
                "location": resume.location,
                "summary": resume.summary,
                "template": resume.template,
                "created_at": resume.created_at.isoformat() if resume.created_at else None,
                "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
            },
            "version": {
                "id": version.id,
                "resume_id": version.resume_id,
                "version_number": version.version_number,
                "resume_data": version.resume_data,
                "created_at": version.created_at.isoformat()
                if version.created_at
                else None,
                "change_summary": version.change_summary,
            },
        }

    @staticmethod
    def _collect_sections(
        match_summaries: Sequence[Tuple[ResumeJobMatch, ATSScore, Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        sections: List[Dict[str, Any]] = []
        for _, _, resume_data in match_summaries:
            for section in resume_data.get("sections", []) or []:
                if isinstance(section, dict):
                    sections.append(section)
        return sections

    @staticmethod
    def _derive_job_requirements(job: Job) -> List[str]:
        requirements = list(job.skills or [])
        description = job.description or ""
        words = [
            token.lower()
            for token in description.split()
            if len(token) > 4 and token.isalpha()
        ]
        common_keywords = [
            word for word, count in Counter(words).most_common(15) if count > 1
        ]
        requirements.extend(common_keywords)
        return requirements

    @staticmethod
    def _compose_summary(
        job: Job, match: ResumeJobMatch, resume_data: Dict[str, Any]
    ) -> str:
        name = resume_data.get("name") or "Experienced professional"
        role = job.title or resume_data.get("title") or "target role"
        company = job.company or "the organisation"
        highlight_skills = ", ".join(match.matched_skills[:3]) if match.matched_skills else ""
        highlight_clause = (
            f" with strengths in {highlight_skills}" if highlight_skills else ""
        )
        return (
            f"{name} targeting the {role} role at {company}{highlight_clause}. "
            "Focused on delivering measurable impact through tailored solutions."
        )

    @staticmethod
    def _compose_skills(
        job: Job,
        matches: Sequence[Tuple[ResumeJobMatch, ATSScore, Dict[str, Any]]],
        best_resume: Dict[str, Any],
    ) -> Dict[str, Any]:
        aggregated_skills = set(job.skills or [])
        for _, _, resume_data in matches:
            for section in resume_data.get("sections", []) or []:
                title = (section.get("title") or "").lower()
                if "skill" in title:
                    for bullet in section.get("bullets", []) or []:
                        if isinstance(bullet, dict):
                            text = bullet.get("text", "")
                        else:
                            text = str(bullet)
                        for skill in text.split(","):
                            if skill.strip():
                                aggregated_skills.add(skill.strip())

        if not aggregated_skills:
            aggregated_skills = set(best_resume.get("skills", []) or [])

        skill_bullets = [{"text": skill} for skill in sorted(aggregated_skills)]
        return {"title": "Skills", "bullets": skill_bullets}

    @staticmethod
    def _compose_experience_section(optimised_content: str) -> Dict[str, Any]:
        bullets = [
            {"text": line.replace("•", "").strip()}
            for line in optimised_content.splitlines()
            if line.strip()
        ]
        return {
            "title": "Experience Highlights",
            "bullets": bullets,
        }

    @staticmethod
    def _build_resume_payload(
        *,
        job: Job,
        base_resume: Dict[str, Any],
        summary_text: str,
        sections: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload = {
            "name": base_resume.get("name"),
            "title": job.title or base_resume.get("title"),
            "email": base_resume.get("email"),
            "phone": base_resume.get("phone"),
            "location": base_resume.get("location"),
            "summary": summary_text,
            "template": base_resume.get("template", "tech"),
            "sections": list(sections),
        }
        return payload


"""Resume matching and optimisation services."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

from sqlalchemy.orm import Session

from app.domain.resume_matcher.models import ATSScore, ResumeJobMatch
from app.domain.resume_matcher.repositories import ResumeMatchRepository
from app.models.job import Job
from app.models.resume import Resume
from app.services.enhanced_ats_service import EnhancedATSChecker

try:
    from app.services.ai_improvement_engine import AIResumeImprovementEngine
except ImportError:  # pragma: no cover - keep optional dependency behaviour
    AIResumeImprovementEngine = None  # type: ignore


class ResumeMatchingService:
    """Coordinates job-resume analysis and scoring."""

    def __init__(
        self,
        session: Session,
        repository: ResumeMatchRepository | None = None,
        ats_checker: EnhancedATSChecker | None = None,
    ) -> None:
        self._repository = repository or ResumeMatchRepository(session)
        self._ats_checker = ats_checker or EnhancedATSChecker()

    async def analyze_fit(self, resume_id: int, job_id: int, user_id: int) -> ATSScore:
        job, resume, resume_data = self._load_resume_job(resume_id, job_id, user_id)
        ats_result = await self._ats_checker.get_enhanced_ats_score(
            resume_data, job.description or ""
        )
        details: dict[str, dict] = ats_result.get("details", {})
        keyword_analysis = details.get("keyword_analysis", {}) or {}
        quality_analysis = details.get("quality_analysis", {}) or {}

        return ATSScore(
            overall_score=float(ats_result.get("score", 0) or 0),
            keyword_match=float(keyword_analysis.get("score", 0) or 0),
            experience_relevance=float(quality_analysis.get("score", 0) or 0),
            skills_coverage=float(keyword_analysis.get("job_match_score", 0) or 0),
            suggestions=list(ats_result.get("suggestions", []) or []),
        )

    async def build_match_summary(
        self, resume_id: int, job_id: int, user_id: int
    ) -> tuple[ResumeJobMatch, ATSScore, dict]:
        job, resume, resume_data = self._load_resume_job(resume_id, job_id, user_id)

        ats_score = await self.analyze_fit(resume.id, job.id, user_id)
        resume_text = self._ats_checker.extract_text_from_resume(resume_data).lower()
        resume_tokens = set(resume_text.split())

        job_skills = [skill for skill in (job.skills or []) if isinstance(skill, str)]
        matched_skills = sorted(
            {skill for skill in job_skills if skill.lower() in resume_tokens}
        )
        missing_skills = sorted(
            {skill for skill in job_skills if skill.lower() not in resume_tokens}
        )

        recommendations: list[str] = []
        if missing_skills:
            recommendations.append(
                f"Add examples demonstrating: {', '.join(missing_skills[:5])}"
            )
        recommendations.extend(ats_score.suggestions[:5])

        match_summary = ResumeJobMatch(
            resume_id=resume.id,
            job_id=job.id,
            score=ats_score.overall_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            recommendations=recommendations,
        )

        return match_summary, ats_score, resume_data

    def _load_resume_job(
        self, resume_id: int, job_id: int, user_id: int
    ) -> tuple[Job, Resume, dict]:
        job = self._repository.fetch_job(job_id, user_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found for user {user_id}")

        resume, version = self._repository.fetch_resume_with_latest_version(
            resume_id, user_id
        )
        if resume is None or version is None:
            raise ValueError(f"Resume {resume_id} not found for user {user_id}")

        resume_data = version.resume_data or {}
        return job, resume, resume_data


class ATSOptimizationService:
    """Produces optimised snippets based on job requirements."""

    def __init__(
        self,
        improvement_engine: AIResumeImprovementEngine | None = None,
    ) -> None:
        self._improvement_engine = improvement_engine or (
            AIResumeImprovementEngine() if AIResumeImprovementEngine else None
        )

    def generate_optimized_content(
        self,
        resume_sections: Sequence[dict],
        job_requirements: Iterable[str],
    ) -> str:
        keywords = [req.lower() for req in job_requirements if isinstance(req, str)]
        relevant_bullets: list[str] = []
        fallback_bullets: list[str] = []

        for section in resume_sections or []:
            bullets = section.get("bullets", []) if isinstance(section, dict) else []
            for bullet in bullets:
                if isinstance(bullet, dict):
                    text = bullet.get("text", "")
                else:
                    text = str(bullet)
                text = (text or "").strip()
                if not text:
                    continue
                bullet_lower = text.lower()
                if keywords and any(keyword in bullet_lower for keyword in keywords):
                    relevant_bullets.append(text)
                else:
                    fallback_bullets.append(text)

        selected = relevant_bullets or fallback_bullets
        selected = selected[:10]

        if not selected:
            selected = [
                "Highlight 2-3 accomplishments that mirror the job requirements.",
                "Quantify impact where possible (percentages, amounts, time saved).",
            ]

        optimised_lines = [f"• {line}" for line in selected]
        optimised_text = "\n".join(optimised_lines)

        if not self._improvement_engine:
            return optimised_text

        improvement_payload = {
            "summary": "",
            "sections": resume_sections,
        }
        suggestions = self._improvement_engine.get_improvement_suggestions(
            improvement_payload,
            job_description="\n".join(keywords),
        )

        high_priority = suggestions.get("high_priority", []) if suggestions else []
        if high_priority:
            tips = "\n".join(
                f"- {item['description']}"
                for item in high_priority[:3]
                if item.get("description")
            )
            if tips:
                optimised_text = f"{optimised_text}\n\nSuggestions:\n{tips}"

        return optimised_text


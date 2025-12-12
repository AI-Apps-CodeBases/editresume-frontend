"""Automation service orchestrating resume generation from job data."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from sqlalchemy.orm import Session

from app.agents.content_generation_agent import ContentGenerationAgent
from app.domain.resume_matcher.models import ATSScore, ResumeJobMatch
from app.domain.resume_matcher.repositories import ResumeMatchRepository
from app.domain.resume_matcher.services import (
    ATSOptimizationService,
    ResumeMatchingService,
)
from app.models.job import Job
from app.models.resume import Resume, ResumeVersion
from app.services.keyword_distributor import distribute_keywords_to_sections


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
        self._content_agent = ContentGenerationAgent()

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

        # Get missing keywords from match
        missing_keywords = best_match.missing_skills or []
        matched_keywords = best_match.matched_skills or []

        # Preserve ALL sections from best resume
        original_sections = best_resume_data.get("sections", []) or []
        tailored_sections = []

        # Distribute keywords across sections
        keyword_distribution = distribute_keywords_to_sections(
            missing_keywords, best_resume_data, job.description or ""
        )

        # Process each section, preserving structure
        for section in original_sections:
            if not isinstance(section, dict):
                tailored_sections.append(section)
                continue

            section_title = (section.get("title") or "").lower()
            section_bullets = section.get("bullets", []) or []

            # Handle work experience sections - enhance with keywords
            if any(
                term in section_title
                for term in ["experience", "work", "employment", "professional"]
            ):
                enhanced_section = self._enhance_experience_section(
                    section, keyword_distribution, job, matched_keywords
                )
                tailored_sections.append(enhanced_section)
            # Handle skills section - add missing technical keywords
            elif "skill" in section_title:
                enhanced_skills = self._enhance_skills_section(
                    section, keyword_distribution, job, match_summaries, best_resume_data
                )
                tailored_sections.append(enhanced_skills)
            # Preserve all other sections (education, certifications, etc.)
            else:
                tailored_sections.append(section)

        # Generate AI-powered summary with JD keywords
        summary_text = await self._generate_tailored_summary(
            job, best_match, best_resume_data, missing_keywords, matched_keywords
        )

        generated_resume_payload = self._build_resume_payload(
            job=job,
            base_resume=best_resume_data,
            summary_text=summary_text,
            sections=tailored_sections,
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

    async def _generate_tailored_summary(
        self,
        job: Job,
        match: ResumeJobMatch,
        resume_data: Dict[str, Any],
        missing_keywords: List[str],
        matched_keywords: List[str],
    ) -> str:
        """Generate AI-powered summary with JD keywords integrated."""
        try:
            # Extract work experience text
            work_experience_parts = []
            for section in resume_data.get("sections", []) or []:
                if not isinstance(section, dict):
                    continue
                title_lower = (section.get("title") or "").lower()
                if any(
                    term in title_lower
                    for term in ["experience", "work", "employment", "professional"]
                ):
                    bullets = section.get("bullets", []) or []
                    for bullet in bullets:
                        if isinstance(bullet, dict):
                            text = bullet.get("text", "")
                        else:
                            text = str(bullet)
                        if text.strip():
                            work_experience_parts.append(text.strip())

            work_experience_text = "\n".join(work_experience_parts[:20])

            # Extract skills text
            skills_parts = []
            for section in resume_data.get("sections", []) or []:
                if not isinstance(section, dict):
                    continue
                title_lower = (section.get("title") or "").lower()
                if "skill" in title_lower:
                    bullets = section.get("bullets", []) or []
                    for bullet in bullets:
                        if isinstance(bullet, dict):
                            text = bullet.get("text", "")
                        else:
                            text = str(bullet)
                        if text.strip():
                            skills_parts.append(text.strip())

            skills_text = ", ".join(skills_parts[:15])

            # Create keyword guidance
            keyword_guidance = f"Matched keywords: {', '.join(matched_keywords[:10])}"
            if missing_keywords:
                keyword_guidance += f". Missing high-priority keywords to integrate: {', '.join(missing_keywords[:15])}"

            # Generate summary using AI
            result = await self._content_agent.generate_summary_from_experience(
                title=resume_data.get("title") or job.title,
                work_experience_text=work_experience_text or None,
                skills_text=skills_text or None,
                keyword_guidance=keyword_guidance,
                job_description_excerpt=job.description[:500] if job.description else None,
                existing_summary=resume_data.get("summary"),
                missing_keywords=missing_keywords[:20] if missing_keywords else None,
            )

            if result.get("success") and result.get("summary"):
                return result["summary"].strip()
        except Exception as e:
            # Fallback to basic summary if AI generation fails
            pass

        # Fallback summary
        name = resume_data.get("name") or "Experienced professional"
        role = job.title or resume_data.get("title") or "target role"
        highlight_skills = ", ".join(matched_keywords[:3]) if matched_keywords else ""
        highlight_clause = (
            f" with expertise in {highlight_skills}" if highlight_skills else ""
        )
        return (
            f"{name} is a {role} professional{highlight_clause}. "
            "Demonstrated track record of delivering measurable results through strategic execution and technical excellence."
        )

    @staticmethod
    def _enhance_skills_section(
        section: Dict[str, Any],
        keyword_distribution: Dict[str, Any],
        job: Job,
        matches: Sequence[Tuple[ResumeJobMatch, ATSScore, Dict[str, Any]]],
        _best_resume: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Enhance skills section with missing technical keywords only."""
        existing_skills = set()
        for bullet in section.get("bullets", []) or []:
            if isinstance(bullet, dict):
                text = bullet.get("text", "")
            else:
                text = str(bullet)
            for skill in text.split(","):
                if skill.strip():
                    existing_skills.add(skill.strip())

        # Add only technical keywords from missing keywords
        skill_keywords = keyword_distribution.get("skill_keywords", [])
        for skill_kw in skill_keywords[:10]:
            existing_skills.add(skill_kw)

        # Add matched skills from job
        for job_skill in job.skills or []:
            if job_skill.strip():
                existing_skills.add(job_skill.strip())

        skill_bullets = [{"text": skill} for skill in sorted(existing_skills)]
        return {
            "title": section.get("title", "Skills"),
            "bullets": skill_bullets,
        }

    @staticmethod
    def _enhance_experience_section(
        section: Dict[str, Any],
        keyword_distribution: Dict[str, Any],
        job: Job,
        matched_keywords: List[str],
    ) -> Dict[str, Any]:
        """Enhance experience section by preserving all bullets and adding relevant keywords naturally."""
        original_bullets = section.get("bullets", []) or []
        enhanced_bullets = []

        # Preserve all original bullets
        for bullet in original_bullets:
            if isinstance(bullet, dict):
                enhanced_bullets.append(bullet)
            else:
                enhanced_bullets.append({"text": str(bullet)})

        # Get experience-related keywords for this section
        section_mapping = keyword_distribution.get("section_mapping", {})
        section_idx = len([s for s in enhanced_bullets if isinstance(s, dict)]) % len(
            section_mapping
        ) if section_mapping else 0

        experience_keywords = section_mapping.get(section_idx, [])

        # Add a few enhanced bullets with keywords if we have relevant ones
        if experience_keywords and len(enhanced_bullets) < 15:
            for kw in experience_keywords[:3]:
                # Only add if keyword isn't already in existing bullets
                kw_lower = kw.lower()
                already_present = any(
                    kw_lower in (b.get("text", "") if isinstance(b, dict) else str(b)).lower()
                    for b in enhanced_bullets
                )
                if not already_present and len(enhanced_bullets) < 15:
                    enhanced_bullets.append(
                        {
                            "text": f"Applied {kw} to deliver measurable business outcomes"
                        }
                    )

        return {
            "title": section.get("title", "Experience"),
            "bullets": enhanced_bullets,
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


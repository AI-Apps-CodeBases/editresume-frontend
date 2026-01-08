"""Application service layer for resume versioning."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.domain.resume.models import ResumeVersionDiff, ResumeVersionSnapshot
from app.domain.resume.repositories import ResumeVersionRepository
from app.models.resume import ResumeVersion


class ResumeVersionService:
    """Coordinates business rules around resume version control."""

    def __init__(
        self,
        session: Session,
        repository: ResumeVersionRepository | None = None,
    ) -> None:
        self._repository = repository or ResumeVersionRepository(session)

    def create_version(
        self,
        user_id: int,
        resume_id: int,
        resume_data: dict[str, Any],
        change_summary: str | None = None,
        is_auto_save: bool = False,
        tokens_used: int | None = None,
    ) -> ResumeVersion:
        latest_version = self._repository.latest_for_resume(resume_id, user_id)
        version_number = (
            1 if latest_version is None else latest_version.version_number + 1
        )

        version = ResumeVersion(
            resume_id=resume_id,
            user_id=user_id,
            version_number=version_number,
            resume_data=resume_data,
            change_summary=change_summary,
            is_auto_save=is_auto_save,
            tokens_used=tokens_used or 0,
        )

        return self._repository.save(version)

    def get_resume_versions(self, resume_id: int, user_id: int) -> list[ResumeVersion]:
        return self._repository.list_for_resume(resume_id, user_id)

    def get_version(self, version_id: int, user_id: int) -> ResumeVersion | None:
        return self._repository.get(version_id, user_id)

    def get_latest_version(
        self, resume_id: int, user_id: int
    ) -> ResumeVersion | None:
        return self._repository.latest_for_resume(resume_id, user_id)

    def rollback_to_version(
        self, version_id: int, user_id: int
    ) -> ResumeVersion | None:
        version = self.get_version(version_id, user_id)
        if version is None:
            return None

        return self.create_version(
            user_id=user_id,
            resume_id=version.resume_id,
            resume_data=version.resume_data,
            change_summary=f"Rollback to version {version.version_number}",
            is_auto_save=False,
        )

    def delete_version(self, version_id: int, user_id: int) -> bool:
        version = self.get_version(version_id, user_id)
        if version is None:
            return False

        version_count = self._repository.count_for_resume(version.resume_id, user_id)
        if version_count <= 1:
            return False

        self._repository.delete(version)
        return True

    def cleanup_old_auto_saves(
        self, resume_id: int, user_id: int, keep_count: int = 10
    ) -> None:
        auto_saves = self._repository.list_auto_saves(resume_id, user_id)
        for version in auto_saves[keep_count:]:
            self._repository.delete(version)

    def compare_versions(
        self,
        version1_id: int,
        version2_id: int,
        user_id: int,
    ) -> ResumeVersionDiff | None:
        version1 = self.get_version(version1_id, user_id)
        version2 = self.get_version(version2_id, user_id)

        if version1 is None or version2 is None:
            return None

        if version1.resume_id != version2.resume_id:
            return None

        differences = self._find_differences(version1.resume_data, version2.resume_data)

        return ResumeVersionDiff(
            version1=self._snapshot(version1),
            version2=self._snapshot(version2),
            differences=differences,
        )

    @staticmethod
    def _snapshot(version: ResumeVersion) -> ResumeVersionSnapshot:
        return ResumeVersionSnapshot(
            id=version.id,
            version_number=version.version_number,
            created_at=version.created_at.isoformat(),
            change_summary=version.change_summary,
        )

    @staticmethod
    def _find_differences(
        data1: dict[str, Any], data2: dict[str, Any]
    ) -> dict[str, Any]:
        differences: dict[str, Any] = {
            "personal_info": {},
            "sections": {},
            "summary": None,
        }

        personal_info1 = data1.get("personalInfo", {})
        personal_info2 = data2.get("personalInfo", {})

        for key in personal_info1:
            if personal_info1.get(key) != personal_info2.get(key):
                differences["personal_info"][key] = {
                    "old": personal_info1.get(key),
                    "new": personal_info2.get(key),
                }

        if data1.get("summary") != data2.get("summary"):
            differences["summary"] = {
                "old": data1.get("summary"),
                "new": data2.get("summary"),
            }

        sections1 = data1.get("sections", [])
        sections2 = data2.get("sections", [])

        if len(sections1) != len(sections2):
            differences["sections"]["count"] = {
                "old": len(sections1),
                "new": len(sections2),
            }

        return differences

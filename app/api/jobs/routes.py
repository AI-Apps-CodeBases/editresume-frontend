"""HTTP routes for managing saved jobs."""

from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.firebase_auth import require_firebase_user
from app.core.db import get_db
from app.domain.jobs.models import Job, JobBase, JobCreate
from app.domain.jobs.services import JobService
from app.models.user import User

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreateRequest(JobBase):
    """Payload for creating a job entry."""

    pass


def _resolve_user_id(session: Session, firebase_user: Dict[str, str]) -> int:
    email = (firebase_user or {}).get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated user email is required",
        )

    user = session.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return user.id


@router.post(
    "",
    response_model=Job,
    status_code=status.HTTP_201_CREATED,
    summary="Save a job description",
)
def create_job(
    payload: JobCreateRequest,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Job:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    job = service.create_job(
        JobCreate(
            user_id=user_id,
            title=payload.title,
            company=payload.company,
            description=payload.description,
            url=payload.url,
            skills=payload.skills,
        )
    )
    return job


@router.get(
    "",
    response_model=List[Job],
    summary="List jobs saved by the authenticated user",
)
def list_jobs(
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> List[Job]:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    return service.list_jobs(user_id)


@router.get(
    "/{job_id}",
    response_model=Job,
    summary="Retrieve a saved job by id",
)
def get_job(
    job_id: int,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Job:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    job = service.get_job(job_id, user_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved job",
)
def delete_job(
    job_id: int,
    database: Session = Depends(get_db),
    firebase_user: Dict[str, str] = Depends(require_firebase_user),
) -> Response:
    user_id = _resolve_user_id(database, firebase_user)
    service = JobService(database)
    removed = service.delete_job(job_id, user_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)





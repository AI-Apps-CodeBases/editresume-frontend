"""Resume automation endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.firebase_auth import require_firebase_user
from app.core.db import get_db

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


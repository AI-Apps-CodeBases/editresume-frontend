from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.firebase_auth import require_firebase_user
from app.core.firebase_admin import get_user_profile, mark_make_first_session_sent
from app.services.make_events import send_make_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events"])


class FirstSessionPayload(BaseModel):
    source: str | None = None
    utm_source: str | None = None
    utm_campaign: str | None = None
    referrer: str | None = None
    landing_path: str | None = None


@router.post("/first-session")
async def track_first_session(
    payload: FirstSessionPayload,
    user: dict[str, Any] = Depends(require_firebase_user),
) -> dict[str, Any]:
    uid = user.get("uid")
    if not uid:
        return {"ok": False, "error": "missing_uid"}

    profile = get_user_profile(uid) or {}
    if profile.get("makeFirstSessionSentAt"):
        return {"ok": True, "skipped": True}

    event_id = f"first_session:{uid}"
    sent = await send_make_event(
        event="user.first_session",
        event_id=event_id,
        user={
            "uid": uid,
            "email": user.get("email"),
            "name": user.get("name"),
            "isPremium": user.get("isPremium", False),
            "signInProvider": user.get("signInProvider"),
        },
        context=payload.model_dump(exclude_none=True),
    )

    if sent:
        mark_make_first_session_sent(uid)
        return {"ok": True, "sent": True}

    return {"ok": False, "error": "make_failed"}

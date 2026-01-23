from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _make_event_payload(
    event: str,
    event_id: str,
    user: dict[str, Any] | None = None,
    context: dict[str, Any] | None = None,
    billing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "event": event,
        "event_id": event_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user or {},
        "context": context or {},
        "billing": billing or {},
        "app": {
            "product": "editresume.io",
            "environment": settings.environment,
        },
    }


async def send_make_event(
    event: str,
    event_id: str,
    user: dict[str, Any] | None = None,
    context: dict[str, Any] | None = None,
    billing: dict[str, Any] | None = None,
) -> bool:
    if not settings.make_webhook_url:
        return False

    payload = _make_event_payload(event, event_id, user=user, context=context, billing=billing)
    headers = {}
    if settings.make_webhook_secret:
        headers["X-Make-Secret"] = settings.make_webhook_secret

    timeout = httpx.Timeout(5.0, connect=3.0)
    max_attempts = 2

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(settings.make_webhook_url, json=payload, headers=headers)
                response.raise_for_status()
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Make webhook failed (attempt %s/%s) for event %s: %s",
                attempt,
                max_attempts,
                event,
                exc,
            )
            await asyncio.sleep(0.4 * attempt)

    return False

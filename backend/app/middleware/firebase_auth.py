from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.core.firebase_admin import (
    sanitized_user_from_token,
    sync_user_profile,
    verify_id_token,
)

logger = logging.getLogger(__name__)


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        protected_paths: Iterable[str] | None = None,
    ):
        super().__init__(app)
        self.protected_paths = tuple(protected_paths or ())

    def _requires_auth(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.protected_paths)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request.state.firebase_user = None
        request.state.firebase_token = None
        request.state.firebase_auth_error = None

        token = self._extract_bearer_token(request)
        decoded_token = None
        if token:
            try:
                decoded_token = verify_id_token(token)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Error verifying Firebase token (network issue?): %s",
                    exc,
                )
                request.state.firebase_auth_error = "verification_failed"

        if decoded_token:
            sanitized = sanitized_user_from_token(decoded_token)
            request.state.firebase_token = decoded_token
            request.state.firebase_user = sanitized

            if sanitized.get("uid"):
                try:
                    await asyncio.to_thread(
                        sync_user_profile, sanitized["uid"], sanitized
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed syncing Firestore profile for %s: %s",
                        sanitized["uid"],
                        exc,
                    )
        elif token:
            if not request.state.firebase_auth_error:
                request.state.firebase_auth_error = "invalid_token"

        if (
            self._requires_auth(request.url.path)
            and request.state.firebase_user is None
        ):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)

    @staticmethod
    def _extract_bearer_token(request: Request) -> str | None:
        header = request.headers.get("authorization")
        if not header:
            return None
        parts = header.split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        return parts[1].strip() or None

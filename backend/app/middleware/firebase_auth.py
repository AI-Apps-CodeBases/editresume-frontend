from __future__ import annotations

import asyncio
import logging
from typing import Iterable, Optional

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
        protected_paths: Optional[Iterable[str]] = None,
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
        
        # Only try to verify token if we have one - use asyncio timeout to prevent blocking
        if token:
            try:
                # Use asyncio timeout to prevent blocking the entire request
                decoded_token = await asyncio.wait_for(
                    asyncio.to_thread(verify_id_token, token),
                    timeout=2.5  # 2.5 second timeout - fail fast
                )
            except asyncio.TimeoutError:
                logger.debug("Token verification timed out after 2.5 seconds - continuing without auth")
                decoded_token = None
            except Exception as exc:
                logger.debug(f"Token verification failed: {type(exc).__name__}")
                decoded_token = None

        if decoded_token:
            sanitized = sanitized_user_from_token(decoded_token)
            request.state.firebase_token = decoded_token
            request.state.firebase_user = sanitized

            # Sync user profile in background - don't block request
            if sanitized.get("uid"):
                try:
                    # Use short timeout for profile sync - don't block request
                    await asyncio.wait_for(
                        asyncio.to_thread(sync_user_profile, sanitized["uid"], sanitized),
                        timeout=1.5  # 1.5 second timeout - fail silently
                    )
                except asyncio.TimeoutError:
                    logger.debug("User profile sync timed out - continuing without sync")
                except Exception as exc:  # noqa: BLE001
                    logger.debug(
                        "Failed syncing Firestore profile for %s: %s",
                        sanitized["uid"],
                        type(exc).__name__,
                    )
        elif token:
            request.state.firebase_auth_error = "invalid_token"

        if (
            self._requires_auth(request.url.path)
            and request.state.firebase_user is None
        ):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)

    @staticmethod
    def _extract_bearer_token(request: Request) -> Optional[str]:
        header = request.headers.get("authorization")
        if not header:
            return None
        parts = header.split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        return parts[1].strip() or None

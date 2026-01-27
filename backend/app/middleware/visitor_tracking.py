"""Middleware to track visitor analytics including country information."""

from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.db import SessionLocal
from app.models.analytics import VisitorAnalytics
from app.services.geolocation import GeolocationService

logger = logging.getLogger(__name__)


class VisitorTrackingMiddleware(BaseHTTPMiddleware):
    """Track visitor analytics including IP, country, and page views."""

    # Paths to exclude from tracking (for performance)
    EXCLUDED_PATHS = {
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico",
        "/static",
        "/_next",
        "/api/health",
        "/api/dashboard",  # Exclude dashboard API calls from tracking for performance
    }

    async def dispatch(self, request: Request, call_next):
        """Track visitor and continue request."""

        # Skip tracking for excluded paths
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.EXCLUDED_PATHS):
            return await call_next(request)

        # Extract IP address
        ip_address = GeolocationService.extract_ip_from_request(request)

        # Get or create session ID
        session_id = request.cookies.get("session_id")
        if not session_id:
            session_id = str(uuid.uuid4())
        request.state.session_id = session_id

        # Get geolocation info (async, don't block request)
        geolocation_data = None
        try:
            geolocation_data = await GeolocationService.get_country_from_ip(ip_address)
        except Exception as e:
            logger.warning(f"Failed to get geolocation: {e}")

        # Process request first (don't block)
        response = await call_next(request)

        # Get user ID if authenticated (Firebase auth middleware runs after this middleware)
        user_id = None
        if hasattr(request.state, "firebase_user") and request.state.firebase_user:
            firebase_uid = request.state.firebase_user.get("uid")
            # Convert to integer if it's numeric, otherwise use None (visitor_analytics stores int)
            try:
                user_id = int(firebase_uid) if firebase_uid and str(firebase_uid).isdigit() else None
            except (ValueError, TypeError):
                user_id = None

        # Track visitor in background (don't block response)
        asyncio.create_task(self._track_visitor(
            ip_address=ip_address,
            user_agent=request.headers.get("user-agent"),
            country=geolocation_data.get("country") if geolocation_data else None,
            country_code=geolocation_data.get("country_code") if geolocation_data else None,
            city=geolocation_data.get("city") if geolocation_data else None,
            region=geolocation_data.get("region") if geolocation_data else None,
            referrer=request.headers.get("referer"),
            path=path,
            user_id=user_id,
            session_id=session_id,
        ))

        # Set session cookie if not exists
        if not request.cookies.get("session_id"):
            response.set_cookie(
                key="session_id",
                value=session_id,
                max_age=86400 * 30,  # 30 days
                httponly=True,
                samesite="lax"
            )

        return response

    async def _track_visitor(
        self,
        ip_address: str,
        user_agent: str | None,
        country: str | None,
        country_code: str | None,
        city: str | None,
        region: str | None,
        referrer: str | None,
        path: str,
        user_id: int | None,
        session_id: str,
    ):
        """Save visitor analytics to database."""
        try:
            db = SessionLocal()
            try:
                visitor = VisitorAnalytics(
                    ip_address=ip_address,
                    user_agent=user_agent,
                    country=country,
                    country_code=country_code,
                    city=city,
                    region=region,
                    referrer=referrer,
                    path=path,
                    user_id=user_id,
                    session_id=session_id,
                )
                db.add(visitor)
                db.commit()
            except Exception as e:
                logger.error(f"Error saving visitor analytics: {e}")
                db.rollback()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in visitor tracking: {e}")

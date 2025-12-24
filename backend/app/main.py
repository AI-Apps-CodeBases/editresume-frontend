"""Application entry point - modular FastAPI application."""

from __future__ import annotations

import logging
import os
from time import perf_counter

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import (
    ai,
    analytics,
    auth,
    collaboration,
    dashboard,
    feedback,
    firebase_auth,
    job,
    jobs,
    linkedin,
    resume,
    stripe,
    usage,
    user,
)
from app.api.job import create_match, get_match
from app.core.db import get_db
from app.core.config import settings
from app.core.db import create_tables, migrate_schema
from app.core.dependencies import (
    OPENAI_API_KEY,
    openai_client,
)
from app.core.logging import setup_logging
from app.middleware.firebase_auth import FirebaseAuthMiddleware
from app.middleware.visitor_tracking import VisitorTrackingMiddleware

# Initialize logging
setup_logging()

# Initialize database
create_tables()
migrate_schema()

# Create FastAPI app
app = FastAPI(title=settings.app_name, version=settings.version)

# Add Visitor Tracking Middleware (track before auth)
app.add_middleware(VisitorTrackingMiddleware)

# Add Firebase Auth Middleware
app.add_middleware(
    FirebaseAuthMiddleware,
    protected_paths=(
        "/api/auth/session",
        "/api/billing/create-checkout-session",
        "/api/billing/subscription",
        "/api/billing/create-portal-session",
    ),
)

# CORS Configuration
BASE_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://staging.editresume.io",
    "https://editresume.io",
    "https://www.editresume.io",
    "https://editresume-staging.onrender.com",
    "https://editresume-staging-d4ang4wye-hasans-projects-d7f2163d.vercel.app",
    "https://editresume-staging-git-fixuploadissue-hasans-projects-d7f2163d.vercel.app",
    "https://editresume-frontend-c943dt9jp-hasans-projects-d7f2163d.vercel.app",
]

ADDITIONAL_ORIGINS = os.getenv("ADDITIONAL_CORS_ORIGINS", "").split(",")
ADDITIONAL_ORIGINS = [origin.strip() for origin in ADDITIONAL_ORIGINS if origin.strip()]
ALLOWED_ORIGINS = BASE_ALLOWED_ORIGINS + ADDITIONAL_ORIGINS

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "staging":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )


# Include all routers
app.include_router(firebase_auth.router)
app.include_router(auth.router)
app.include_router(stripe.router)
app.include_router(ai.router)
app.include_router(user.router)
app.include_router(resume.router)
app.include_router(job.router)
app.include_router(jobs.router)
app.include_router(collaboration.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(linkedin.router)
app.include_router(feedback.router)
app.include_router(usage.router)

# Additional routes that need different prefixes
# These are registered here because they don't fit the standard router prefix pattern
from app.api.collaboration import websocket_collab
from app.api.resume import list_user_resumes, delete_resume

app.get("/api/resumes")(list_user_resumes)
app.delete("/api/resumes/{resume_id}")(delete_resume)
app.websocket("/ws/collab/{room_id}")(websocket_collab)

# OpenAI status endpoint (legacy route compatibility)
@app.get("/api/openai/status")
async def get_openai_status_legacy():
    """Legacy OpenAI status endpoint"""
    from app.api.ai import get_openai_status
    return await get_openai_status()


# OpenAI improve-bullet endpoint (legacy route compatibility)
@app.post("/api/openai/improve-bullet")
async def improve_bullet_legacy(payload: dict):
    """Legacy OpenAI improve-bullet endpoint - redirects to /api/ai/openai/improve-bullet"""
    from app.api.ai import improve_bullet
    from app.api.models import ImproveBulletPayload
    return await improve_bullet(ImproveBulletPayload(**payload))


# Match endpoints - registered directly due to non-standard prefix
@app.post("/api/matches")
async def create_match_endpoint(payload: dict, db=Depends(get_db)):
    """Create a match session between resume and job description"""
    from app.api.models import MatchCreate
    return create_match(MatchCreate(**payload), db)


@app.get("/api/matches/{match_id}")
async def get_match_endpoint(match_id: int, db=Depends(get_db)):
    """Get a match session by ID"""
    try:
        result = get_match(match_id, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Legacy match route (redirects to /api/matches/{match_id})
@app.get("/matches/{match_id}")
async def get_match_legacy(match_id: int, db=Depends(get_db)):
    """Legacy match route - redirects to /api/matches/{match_id}"""
    try:
        result = get_match(match_id, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# URL normalization middleware - removes double slashes
class URLNormalizeMiddleware(BaseHTTPMiddleware):
    """Middleware to normalize URLs by removing double slashes"""
    
    async def dispatch(self, request: Request, call_next):
        import re
        # Normalize the path by removing double slashes (but keep the leading slash)
        original_path = request.url.path
        normalized_path = re.sub(r'/+', '/', original_path)
        
        if normalized_path != original_path:
            logger = logging.getLogger(__name__)
            logger.info(f"Normalizing URL: {original_path} -> {normalized_path}")
            # Update the request scope to use the normalized path
            request.scope["path"] = normalized_path
            # Reconstruct raw_path from normalized path
            request.scope["raw_path"] = normalized_path.encode("utf-8")
            # Update the path_info as well
            if "path_info" in request.scope:
                request.scope["path_info"] = normalized_path
        
        return await call_next(request)

# Add URL normalization middleware (should run first, so add it last)
app.add_middleware(URLNormalizeMiddleware)


# Timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start_time = perf_counter()
    logger = logging.getLogger(__name__)
    try:
        response = await call_next(request)
        duration = perf_counter() - start_time
        if response:
            response.headers["X-Process-Time"] = f"{duration:.3f}s"
        if duration > 1.0 or request.url.path in {
            "/api/resume/upload",
            "/api/ai/match_job_description",
            "/api/openai/improve-bullet",
            "/api/ai/generate_bullet_points",
            "/api/ai/generate_bullet_from_keywords",
        }:
            logger.info(
                "Request %s %s completed in %.3fs",
                request.method,
                request.url.path,
                duration,
            )
        return response
    except Exception as e:
        duration = perf_counter() - start_time
        logger.error(
            f"Error in request {request.method} {request.url.path} after {duration:.3f}s: {e}",
            exc_info=True
        )
        raise


# CORS preflight handler
@app.options("/{path:path}")
async def options_handler(path: str, request: Request):
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
    }

    def is_origin_allowed(origin: str) -> bool:
        if not origin:
            return False
        if origin in ALLOWED_ORIGINS:
            return True
        if ENVIRONMENT == "staging":
            if (
                "vercel.app" in origin
                and "hasans-projects-d7f2163d" in origin
                and ("editresume-staging" in origin or "editresume-staging-git" in origin)
            ):
                return True
        elif ENVIRONMENT == "production":
            # Allow production Vercel deployments
            if (
                "vercel.app" in origin
                and "hasans-projects-d7f2163d" in origin
                and ("editresume-frontend" in origin or "editresume" in origin)
            ):
                return True
        return False

    if origin and origin.startswith("chrome-extension://"):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif ENVIRONMENT == "staging":
        headers["Access-Control-Allow-Origin"] = "*"
        headers["Access-Control-Allow-Credentials"] = "false"
    elif origin and is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    else:
        headers["Access-Control-Allow-Origin"] = "*"
        headers["Access-Control-Allow-Credentials"] = "false"

    return Response(status_code=200, headers=headers)


# Health check endpoint
@app.get("/health")
async def health():
    from app.core.db import DATABASE_URL
    from app.core.config import settings

    openai_status = {
        "configured": OPENAI_API_KEY is not None,
        "model": settings.openai_model if OPENAI_API_KEY else None,
        "client_ready": openai_client is not None,
    }
    return {
        "status": "ok",
        "db": DATABASE_URL,
        "premium_mode": settings.premium_mode,
        "openai": openai_status,
    }


@app.get("/api/test/db")
async def test_db():
    """Test database connection"""
    from app.core.db import get_db
    from app.models import User
    from sqlalchemy.orm import Session

    db: Session = next(get_db())
    try:
        user_count = db.query(User).count()

        test_user = User(
            email="test-db@example.com",
            name="Test DB User",
            password="test123",
            is_premium=False,
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        db.delete(test_user)
        db.commit()

        return {
            "status": "success",
            "message": "Database connection working",
            "user_count": user_count,
            "test_user_created": True,
        }
    except Exception as e:
        return {"status": "error", "message": f"Database error: {str(e)}"}
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    """Warm up database connection pool on startup"""
    from app.core.db import engine
    logger = logging.getLogger(__name__)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection pool warmed up")
    except Exception as e:
        logger.warning(f"Failed to warm up database connection: {e}")

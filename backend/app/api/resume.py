"""Resume management API endpoints - migrated from legacy_app.py"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta
from io import BytesIO
from typing import Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.models import ExportPayload, ResumePayload, SaveResumePayload
from app.core.db import get_db
from app.models import (
    ExportAnalytics,
    JobMatch,
    JobResumeVersion,
    MatchSession,
    Resume,
    ResumeGeneration,
    ResumeVersion,
    SharedResume,
    SharedResumeComment,
    User,
)
from app.utils.resume_templates import TEMPLATES

# Import helper functions from utility modules
from app.utils.resume_formatting import (
    apply_replacements,
    format_bold_text,
    format_regular_bullets,
    format_work_experience_bullets,
)
from app.utils.resume_parsing import (
    clean_extracted_text,
    extract_doc_text,
    extract_docx_text,
    extract_pdf_text,
    parse_resume_with_regex,
)
from app.services.version_control_service import VersionControlService

# Import job helpers from utility module
from app.utils.job_helpers import safe_get_job_description

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.get("/templates")
async def get_templates():
    """Get available resume templates"""
    return {
        "templates": [
            {
                "id": tid, 
                "name": t["name"], 
                "industry": t.get("industry", "General"),
                "preview": f"/templates/previews/{tid}.png"
            }
            for tid, t in TEMPLATES.items()
        ]
    }


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """Industry-standard resume parsing with multiple extraction methods"""
    try:
        logger.info(f"Parsing file: {file.filename}, size: {file.size}")

        # File validation
        if not file.filename:
            return {"success": False, "error": "No filename provided"}

        if file.size > 10 * 1024 * 1024:  # 10MB limit
            return {"success": False, "error": "File too large. Maximum size is 10MB"}

        file_extension = file.filename.split(".")[-1].lower()
        if file_extension not in ["pdf", "docx", "doc", "txt"]:
            return {
                "success": False,
                "error": "Unsupported file type. Please upload PDF, DOCX, DOC, or TXT",
            }

        # Read file content
        file_content = await file.read()

        # Extract text using multiple methods for reliability
        text = ""
        extraction_methods = []

        if file_extension == "pdf":
            text, methods = extract_pdf_text(file_content)
            extraction_methods.extend(methods)
        elif file_extension == "docx":
            text, methods = extract_docx_text(file_content)
            extraction_methods.extend(methods)
        elif file_extension == "doc":
            text, methods = extract_doc_text(file_content)
            extraction_methods.extend(methods)
        elif file_extension == "txt":
            try:
                text = file_content.decode("utf-8")
                extraction_methods.append("UTF-8 decode")
            except:
                try:
                    text = file_content.decode("latin-1")
                    extraction_methods.append("Latin-1 decode")
                except:
                    return {"success": False, "error": "Could not decode text file"}

        # Clean and validate extracted text
        text = clean_extracted_text(text)

        if not text.strip():
            return {
                "success": False,
                "error": "No readable text found. The file might be:\n• Scanned image (try OCR)\n• Password protected\n• Corrupted\n• Empty",
            }

        if len(text.strip()) < 50:
            return {
                "success": False,
                "error": "Text too short. Please ensure the file contains a complete resume.",
            }

        # Use regex parsing
        logger.info(
            f"Parsing {len(text)} characters with regex parser using methods: {', '.join(extraction_methods)}"
        )
        parsed_data = parse_resume_with_regex(text)

        return {
            "success": True,
            "data": parsed_data,
            "raw_text": text[:500],  # First 500 chars for debugging
            "extraction_methods": extraction_methods,
            "message": f"Resume parsed successfully using {len(extraction_methods)} method(s) - {len(parsed_data.get('sections', []))} sections extracted",
        }

    except Exception as e:
        logger.error(f"File parsing error: {str(e)}")
        return {"success": False, "error": f"Upload failed: {str(e)}"}


@router.post("/parse-text")
async def parse_text(payload: dict):
    """Parse resume from text input"""
    try:
        text = payload.get("text", "")

        if not text.strip():
            return {"success": False, "error": "No text provided"}

        logger.info(f"Parsing text: {len(text)} characters with regex parser")
        parsed_data = parse_resume_with_regex(text)

        return {
            "success": True,
            "data": parsed_data,
            "message": "Resume parsed with AI - sections automatically organized!",
        }
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/preview")
async def preview_resume(payload: ResumePayload):
    """Preview resume as text"""
    assembled = f"{payload.name} — {payload.title}\n\n"
    if payload.summary:
        assembled += payload.summary + "\n\n"
    for s in payload.sections:
        assembled += s.title + "\n"
        for b in s.bullets:
            assembled += f"• {b.text}\n"
        assembled += "\n"
    return {"variant": payload.variant or "default", "preview_text": assembled}


@router.post("/export/pdf")
async def export_pdf(
    payload: ExportPayload,
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export resume as PDF"""
    from app.services.resume_export import export_pdf as export_pdf_service

    return await export_pdf_service(payload, user_email, db)


@router.post("/export/docx")
async def export_docx(
    payload: ExportPayload,
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export resume as DOCX"""
    from app.services.resume_export import export_docx as export_docx_service

    return await export_docx_service(payload, user_email, db)


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume file"""
    from app.services.resume_upload import upload_and_parse_resume

    contents = await file.read()
    return await upload_and_parse_resume(
        contents, file.filename or "unknown", file.content_type
    )


@router.post("/export/html-to-pdf")
async def export_html_to_pdf(payload: dict):
    """Export HTML content to PDF"""
    try:
        from weasyprint import HTML

        html_content = payload.get("html", "")
        filename = payload.get("filename", "resume.pdf")

        if not html_content:
            raise HTTPException(status_code=400, detail="HTML content is required")

        logger.info(f"Converting HTML to PDF: {len(html_content)} characters")

        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
            
            if not pdf_bytes or len(pdf_bytes) == 0:
                logger.error("PDF generation returned empty bytes")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Empty PDF file was generated."
                )
            
            if not isinstance(pdf_bytes, bytes):
                logger.error(f"PDF generation returned invalid type: {type(pdf_bytes)}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Invalid PDF data type."
                )
            
            if not pdf_bytes.startswith(b"%PDF-"):
                logger.error(f"PDF validation failed: Invalid PDF header. First 20 bytes: {pdf_bytes[:20]}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Generated file is not a valid PDF."
                )
            
            logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes, header: {pdf_bytes[:8]}")
        except AttributeError as e:
            if "'super' object has no attribute" in str(e) or "transform" in str(e):
                logger.error(f"WeasyPrint compatibility error: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed due to a compatibility issue. Please upgrade WeasyPrint or contact support."
                )
            raise
        except Exception as pdf_error:
            error_msg = str(pdf_error)
            logger.error(f"WeasyPrint PDF generation error: {error_msg}")
            
            if "transform" in error_msg.lower() or "super" in error_msg.lower():
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed due to a compatibility issue. Please upgrade WeasyPrint or contact support."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF generation failed: {error_msg}"
                )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HTML to PDF export error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Version Control Endpoints
@router.post("/version/create")
async def create_version(
    payload: dict,  # TODO: Use CreateVersionPayload from models
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Create a new version of a resume"""
    try:
        from app.api.models import CreateVersionPayload

        # Convert dict to CreateVersionPayload if needed
        if isinstance(payload, dict):
            payload = CreateVersionPayload(**payload)

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify resume belongs to user
        resume = (
            db.query(Resume)
            .filter(Resume.id == payload.resume_id, Resume.user_id == user.id)
            .first()
        )
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        version_service = VersionControlService(db)
        version = version_service.create_version(
            user_id=user.id,
            resume_id=payload.resume_id,
            resume_data=payload.resume_data,
            change_summary=payload.change_summary,
            is_auto_save=payload.is_auto_save,
            tokens_used=payload.tokens_used,
        )

        return {
            "success": True,
            "version_id": version.id,
            "version_number": version.version_number,
            "message": "Version created successfully",
        }

    except Exception as e:
        logger.error(f"Error creating version: {e}")
        raise HTTPException(status_code=500, detail="Failed to create version")


@router.get("/{resume_id}/versions")
async def get_resume_versions(
    resume_id: int,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Get all versions for a resume"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify resume belongs to user
        resume = (
            db.query(Resume)
            .filter(Resume.id == resume_id, Resume.user_id == user.id)
            .first()
        )
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        version_service = VersionControlService(db)
        versions = version_service.get_resume_versions(resume_id, user.id)

        return {
            "success": True,
            "versions": [
                {
                    "id": v.id,
                    "version_number": v.version_number,
                    "change_summary": v.change_summary,
                    "is_auto_save": v.is_auto_save,
                    "created_at": v.created_at.isoformat(),
                }
                for v in versions
            ],
        }

    except Exception as e:
        logger.error(f"Error getting versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get versions")


@router.post("/version/rollback")
async def rollback_version(
    payload: dict,  # TODO: Use RollbackVersionPayload from models
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Rollback to a specific version"""
    try:
        from app.api.models import RollbackVersionPayload

        if isinstance(payload, dict):
            payload = RollbackVersionPayload(**payload)

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        version_service = VersionControlService(db)
        new_version = version_service.rollback_to_version(payload.version_id, user.id)

        if not new_version:
            raise HTTPException(status_code=404, detail="Version not found")

        return {
            "success": True,
            "new_version_id": new_version.id,
            "version_number": new_version.version_number,
            "message": "Rollback successful",
        }

    except Exception as e:
        logger.error(f"Error rolling back version: {e}")
        raise HTTPException(status_code=500, detail="Failed to rollback version")


@router.get("/version/{version_id}")
async def get_version(
    version_id: int,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Get a specific version data"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        version_service = VersionControlService(db)
        version = version_service.get_version(version_id, user.id)

        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        return {
            "success": True,
            "version": {
                "id": version.id,
                "version_number": version.version_number,
                "resume_data": version.resume_data,
                "change_summary": version.change_summary,
                "is_auto_save": version.is_auto_save,
                "created_at": version.created_at.isoformat(),
            },
        }

    except Exception as e:
        logger.error(f"Error getting version: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version")


@router.post("/version/compare")
async def compare_versions(
    payload: dict,  # TODO: Use CompareVersionsPayload from models
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Compare two versions"""
    try:
        from app.api.models import CompareVersionsPayload

        if isinstance(payload, dict):
            payload = CompareVersionsPayload(**payload)

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        version_service = VersionControlService(db)
        comparison = version_service.compare_versions(
            payload.version1_id, payload.version2_id, user.id
        )

        if not comparison:
            raise HTTPException(
                status_code=404, detail="Versions not found or incompatible"
            )

        return {"success": True, "comparison": comparison}

    except Exception as e:
        logger.error(f"Error comparing versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare versions")


@router.delete("/version/{version_id}")
async def delete_version(
    version_id: int,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Delete a specific version"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        version_service = VersionControlService(db)
        success = version_service.delete_version(version_id, user.id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete version (only version or not found)",
            )

        return {"success": True, "message": "Version deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting version: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete version")


# Shared Resume Endpoints
@router.post("/share")
async def create_shared_resume(
    resume_id: int,
    user_email: str = Query(..., description="User email for authentication"),
    password: Optional[str] = None,
    expires_days: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Create a shareable link for a resume"""
    try:
        import secrets

        logger.info(
            f"Creating shared resume for resume_id={resume_id}, user_email={user_email}"
        )

        # Try case-insensitive lookup
        user = db.query(User).filter(User.email.ilike(user_email)).first()
        if not user:
            logger.error(f"User not found for email: {user_email}")
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(f"Found user: {user.id}")

        # Verify resume belongs to user
        resume = (
            db.query(Resume)
            .filter(Resume.id == resume_id, Resume.user_id == user.id)
            .first()
        )
        if not resume:
            logger.error(
                f"Resume not found for resume_id={resume_id}, user_id={user.id}"
            )
            raise HTTPException(status_code=404, detail="Resume not found")

        logger.info(f"Found resume: {resume.id}")

        # Generate unique share token
        share_token = secrets.token_urlsafe(32)

        # Calculate expiration date
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)

        # Create shared resume record
        shared_resume = SharedResume(
            resume_id=resume_id,
            user_id=user.id,
            share_token=share_token,
            password_protected=bool(password),
            password_hash=password,  # In production, hash this password
            expires_at=expires_at,
        )

        db.add(shared_resume)
        db.commit()
        db.refresh(shared_resume)

        # Generate shareable URL
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        share_url = f"{base_url}/shared/{share_token}"

        return {
            "success": True,
            "share_token": share_token,
            "share_url": share_url,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "password_protected": bool(password),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating shared resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to create shared resume")


@router.get("/shared/{share_token}")
async def get_shared_resume(
    share_token: str,
    password: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get a shared resume by token"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        # Check if expired
        if shared_resume.expires_at and shared_resume.expires_at < datetime.utcnow():
            raise HTTPException(status_code=410, detail="Shared resume has expired")

        # Check password if required
        if shared_resume.password_protected:
            if not password or password != shared_resume.password_hash:
                raise HTTPException(status_code=401, detail="Password required")

        # Get resume data
        resume = shared_resume.resume
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        # Get latest version
        version_service = VersionControlService(db)
        latest_version = version_service.get_latest_version(resume.id, resume.user_id)

        resume_data = (
            latest_version.resume_data
            if latest_version
            else {
                "personalInfo": {
                    "name": resume.name,
                    "email": resume.email,
                    "phone": resume.phone,
                    "location": resume.location,
                },
                "summary": resume.summary,
                "sections": [],
            }
        )

        return {
            "success": True,
            "resume": {
                "id": resume.id,
                "name": resume.name,
                "title": resume.title,
                "template": resume.template,
                "created_at": resume.created_at.isoformat(),
                "updated_at": resume.updated_at.isoformat(),
            },
            "resume_data": resume_data,
            "shared_info": {
                "created_at": shared_resume.created_at.isoformat(),
                "expires_at": (
                    shared_resume.expires_at.isoformat()
                    if shared_resume.expires_at
                    else None
                ),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shared resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to get shared resume")


@router.post("/shared/{share_token}/view")
async def track_resume_view(
    share_token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Track a view of a shared resume"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        # Get client info
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        referrer = request.headers.get("referer", "")

        # Create view record
        view = ResumeView(
            shared_resume_id=shared_resume.id,
            viewer_ip=client_ip,
            viewer_user_agent=user_agent,
            referrer=referrer,
        )

        db.add(view)
        db.commit()

        return {"success": True, "view_id": view.id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking view: {e}")
        raise HTTPException(status_code=500, detail="Failed to track view")


@router.get("/shared/{share_token}/analytics")
async def get_shared_resume_analytics(
    share_token: str,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Get analytics for a shared resume"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token,
                SharedResume.user_id == user.id,
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        # Get views
        views = (
            db.query(ResumeView)
            .filter(ResumeView.shared_resume_id == shared_resume.id)
            .order_by(ResumeView.viewed_at.desc())
            .all()
        )

        return {
            "success": True,
            "analytics": {
                "total_views": len(views),
                "views": [
                    {
                        "id": v.id,
                        "viewed_at": v.viewed_at.isoformat(),
                        "viewer_ip": v.viewer_ip,
                        "referrer": v.referrer,
                    }
                    for v in views
                ],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")


@router.delete("/shared/{share_token}")
async def delete_shared_resume(
    share_token: str,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Delete a shared resume"""
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token,
                SharedResume.user_id == user.id,
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        shared_resume.is_active = False
        db.commit()

        return {"success": True, "message": "Shared resume deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shared resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete shared resume")


# Shared Resume Comments Endpoints
@router.get("/shared/{share_token}/comments")
async def get_shared_resume_comments(
    share_token: str, db: Session = Depends(get_db)
):
    """Get comments for a shared resume"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        comments = (
            db.query(SharedResumeComment)
            .filter(SharedResumeComment.shared_resume_id == shared_resume.id)
            .order_by(SharedResumeComment.created_at.desc())
            .all()
        )

        return {
            "success": True,
            "comments": [
                {
                    "id": comment.id,
                    "commenter_name": comment.commenter_name,
                    "commenter_email": comment.commenter_email,
                    "text": comment.text,
                    "target_type": comment.target_type,
                    "target_id": comment.target_id,
                    "resolved": comment.resolved,
                    "created_at": comment.created_at.isoformat(),
                }
                for comment in comments
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shared resume comments: {e}")
        raise HTTPException(status_code=500, detail="Failed to get comments")


@router.post("/shared/{share_token}/comments")
async def add_shared_resume_comment(
    share_token: str, payload: dict, db: Session = Depends(get_db)
):
    """Add a comment to a shared resume"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        comment = SharedResumeComment(
            shared_resume_id=shared_resume.id,
            commenter_name=payload.get("commenter_name", ""),
            commenter_email=payload.get("commenter_email", ""),
            text=payload.get("text", ""),
            target_type=payload.get("target_type", ""),
            target_id=payload.get("target_id", ""),
        )

        db.add(comment)
        db.commit()
        db.refresh(comment)

        logger.info(f"Added comment to shared resume {share_token}: {comment.id}")

        return {
            "success": True,
            "comment": {
                "id": comment.id,
                "commenter_name": comment.commenter_name,
                "commenter_email": comment.commenter_email,
                "text": comment.text,
                "target_type": comment.target_type,
                "target_id": comment.target_id,
                "resolved": comment.resolved,
                "created_at": comment.created_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding shared resume comment: {e}")
        raise HTTPException(status_code=500, detail="Failed to add comment")


@router.post("/shared/{share_token}/comments/{comment_id}/resolve")
async def resolve_shared_resume_comment(
    share_token: str, comment_id: int, db: Session = Depends(get_db)
):
    """Resolve a comment on a shared resume"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        comment = (
            db.query(SharedResumeComment)
            .filter(
                SharedResumeComment.id == comment_id,
                SharedResumeComment.shared_resume_id == shared_resume.id,
            )
            .first()
        )

        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        comment.resolved = True
        db.commit()

        logger.info(f"Resolved comment {comment_id} on shared resume {share_token}")

        return {"success": True, "message": "Comment resolved"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving shared resume comment: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve comment")


@router.delete("/shared/{share_token}/comments/{comment_id}")
async def delete_shared_resume_comment(
    share_token: str, comment_id: int, db: Session = Depends(get_db)
):
    """Delete a comment from a shared resume"""
    try:
        shared_resume = (
            db.query(SharedResume)
            .filter(
                SharedResume.share_token == share_token, SharedResume.is_active == True
            )
            .first()
        )

        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found")

        comment = (
            db.query(SharedResumeComment)
            .filter(
                SharedResumeComment.id == comment_id,
                SharedResumeComment.shared_resume_id == shared_resume.id,
            )
            .first()
        )

        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        db.delete(comment)
        db.commit()

        logger.info(f"Deleted comment {comment_id} from shared resume {share_token}")

        return {"success": True, "message": "Comment deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shared resume comment: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete comment")


# Note: This endpoint is at /api/resumes (not /api/resume/resumes)
# It's included here for organization but registered separately in main.py
async def list_user_resumes(
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Get all resumes for a user"""
    try:
        logger.info(f"list_user_resumes: Request received for user {user_email}")

        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            logger.error(f"list_user_resumes: User not found for email {user_email}")
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(f"list_user_resumes: User found with id {user.id}")

        resumes = (
            db.query(Resume)
            .filter(Resume.user_id == user.id)
            .order_by(Resume.updated_at.desc())
            .all()
        )
        logger.info(
            f"list_user_resumes: Found {len(resumes)} resumes for user {user.id}"
        )

        result = []
        for resume in resumes:
            # Get latest version info
            latest_version = (
                db.query(ResumeVersion)
                .filter(ResumeVersion.resume_id == resume.id)
                .order_by(ResumeVersion.version_number.desc())
                .first()
            )

            result.append(
                {
                    "id": resume.id,
                    "name": resume.name,
                    "title": resume.title,
                    "template": resume.template,
                    "created_at": (
                        resume.created_at.isoformat() if resume.created_at else None
                    ),
                    "updated_at": (
                        resume.updated_at.isoformat() if resume.updated_at else None
                    ),
                    "latest_version_id": latest_version.id if latest_version else None,
                    "latest_version_number": (
                        latest_version.version_number if latest_version else None
                    ),
                    "version_count": db.query(ResumeVersion)
                    .filter(ResumeVersion.resume_id == resume.id)
                    .count(),
                }
            )

        logger.info(f"list_user_resumes: Returning {len(result)} resumes")
        return {"success": True, "resumes": result, "count": len(result)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing resumes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list resumes")


async def delete_resume(
    resume_id: int,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Delete a resume and all its associated data"""
    try:
        logger.info(
            f"delete_resume: Attempting to delete resume {resume_id} for user {user_email}"
        )

        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            logger.error(f"delete_resume: User not found for email {user_email}")
            raise HTTPException(status_code=404, detail="User not found")

        # First check if resume exists
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.warning(f"delete_resume: Resume {resume_id} not found")
            raise HTTPException(status_code=404, detail="Resume not found")

        # Verify ownership (allow if user_id is None or matches)
        if resume.user_id is not None and resume.user_id != user.id:
            logger.warning(
                f"delete_resume: Resume {resume_id} belongs to user {resume.user_id}, not {user.id}"
            )
            raise HTTPException(
                status_code=403, detail="You do not have permission to delete this resume"
            )

        # Delete all associated data explicitly
        # Delete shared resume comments first (foreign key constraint)
        shared_resumes = db.query(SharedResume).filter(
            SharedResume.resume_id == resume_id
        ).all()
        for sr in shared_resumes:
            db.query(SharedResumeComment).filter(
                SharedResumeComment.shared_resume_id == sr.id
            ).delete()
        logger.info(f"delete_resume: Deleted comments for {len(shared_resumes)} shared resumes")

        # Delete shared resumes
        deleted_shared = db.query(SharedResume).filter(
            SharedResume.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_shared} shared resume records")

        # Delete match sessions
        deleted_matches = db.query(MatchSession).filter(
            MatchSession.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_matches} match sessions")

        # Delete job matches
        deleted_job_matches = db.query(JobMatch).filter(
            JobMatch.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_job_matches} job matches")

        # Delete job resume versions
        deleted_job_resume_versions = db.query(JobResumeVersion).filter(
            JobResumeVersion.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_job_resume_versions} job resume versions")

        # Delete export analytics
        deleted_exports = db.query(ExportAnalytics).filter(
            ExportAnalytics.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_exports} export analytics records")

        # ResumeView is deleted automatically via cascade when SharedResume is deleted
        
        # Delete resume generations
        deleted_generations = db.query(ResumeGeneration).filter(
            ResumeGeneration.generated_resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_generations} resume generations")

        # Delete resume versions
        deleted_versions = db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == resume_id
        ).delete()
        logger.info(f"delete_resume: Deleted {deleted_versions} resume versions")

        # Finally, delete the resume itself
        db.delete(resume)
        db.commit()

        logger.info(f"delete_resume: Successfully deleted resume {resume_id}")
        return {"success": True, "message": "Resume deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting resume: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete resume: {str(e)}")


@router.post("/save")
async def save_resume(
    payload: SaveResumePayload,
    user_email: str = Query(..., description="User email for authentication"),
    db: Session = Depends(get_db),
):
    """Save or update a resume with version control"""
    try:
        if not user_email:
            logger.error("save_resume: user_email is required")
            raise HTTPException(status_code=400, detail="user_email is required")

        logger.info(
            f"save_resume: Attempting to save resume for user {user_email}, resume name: {payload.name}"
        )

        # Get user from database
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            logger.error(f"save_resume: User not found for email {user_email}")
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(f"save_resume: User found with id {user.id}")

        # Validate payload
        if not payload.name or not payload.name.strip():
            logger.error(f"save_resume: Resume name is required")
            raise HTTPException(status_code=400, detail="Resume name is required")

        # Check if resume exists
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user.id, Resume.name == payload.name)
            .first()
        )

        try:
            if resume:
                # Update existing resume
                logger.info(f"save_resume: Updating existing resume id {resume.id}")
                resume.title = payload.title
                resume.email = payload.email
                resume.phone = payload.phone
                resume.location = payload.location
                resume.summary = payload.summary
                resume.template = payload.template or "tech"
                resume.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(resume)
            else:
                # Create new resume
                logger.info(f"save_resume: Creating new resume")
                resume = Resume(
                    user_id=user.id,
                    name=payload.name,
                    title=payload.title or "",
                    email=payload.email or "",
                    phone=payload.phone or "",
                    location=payload.location or "",
                    summary=payload.summary or "",
                    template=payload.template or "tech",
                )
                db.add(resume)
                db.commit()
                db.refresh(resume)
                logger.info(f"save_resume: Created resume with id {resume.id}")

            # Create version with safe section processing
            version_service = VersionControlService(db)

            # Safely process sections
            sections_data = []
            for s in payload.sections or []:
                try:
                    section_id = getattr(s, "id", str(datetime.utcnow().timestamp()))
                    section_title = getattr(s, "title", "Untitled Section")
                    bullets_data = []

                    for b in getattr(s, "bullets", []):
                        try:
                            bullet_id = getattr(
                                b, "id", str(datetime.utcnow().timestamp())
                            )
                            bullet_text = getattr(b, "text", "")
                            bullet_params = getattr(b, "params", {})
                            if not isinstance(bullet_params, dict):
                                bullet_params = {}
                            bullets_data.append(
                                {
                                    "id": str(bullet_id),
                                    "text": str(bullet_text),
                                    "params": bullet_params,
                                }
                            )
                        except Exception as bullet_error:
                            logger.warning(
                                f"save_resume: Error processing bullet: {bullet_error}"
                            )
                            continue

                    sections_data.append(
                        {
                            "id": str(section_id),
                            "title": str(section_title),
                            "bullets": bullets_data,
                        }
                    )
                except Exception as section_error:
                    logger.warning(
                        f"save_resume: Error processing section: {section_error}"
                    )
                    continue

            resume_data = {
                "personalInfo": {
                    "name": payload.name or "",
                    "email": payload.email or "",
                    "phone": payload.phone or "",
                    "location": payload.location or "",
                },
                "summary": payload.summary or "",
                "sections": sections_data,
            }

            logger.info(
                f"save_resume: Creating version with {len(sections_data)} sections"
            )
            version = version_service.create_version(
                user_id=user.id,
                resume_id=resume.id,
                resume_data=resume_data,
                change_summary="Manual save",
                is_auto_save=False,
            )

            logger.info(
                f"save_resume: Successfully saved resume id {resume.id}, version id {version.id}"
            )

            return {
                "success": True,
                "resume_id": resume.id,
                "version_id": version.id,
                "message": "Resume saved successfully",
            }

        except Exception as db_error:
            db.rollback()
            logger.error(f"save_resume: Database error: {str(db_error)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(db_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"save_resume: Unexpected error saving resume for {user_email}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to save resume: {str(e)}")

"""AI-related API endpoints including ATS scoring, improvements, and content generation."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.models import (
    AIImprovementPayload,
    CoverLetterPayload,
    EnhancedATSPayload,
    ExtractKeywordsPayload,
    ExtractSentencesPayload,
    GenerateBulletPointsPayload,
    GenerateSummaryPayload,
    GrammarCheckPayload,
    ImproveBulletPayload,
    JobDescriptionMatchPayload,
    ResumePayload,
    WorkExperienceRequest,
)
from app.core.dependencies import (
    OPENAI_MAX_TOKENS,
    OPENAI_MODEL,
    ai_improvement_engine,
    ats_checker,
    ats_scoring_agent,
    content_generation_agent,
    cover_letter_agent,
    enhanced_ats_checker,
    grammar_agent,
    improvement_agent,
    job_matching_agent,
    keyword_extractor,
    openai_client,
)
from app.core.db import get_db
from app.models import JobMatch, Resume, User
from app.services.ai_improvement_engine import ImprovementStrategy
from app.services.usage_service import (
    check_usage_limit,
    get_plan_tier,
    record_ai_usage,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def get_user_from_request(request: Request, db: Session):
    """Get user from Firebase auth or return None for guests."""
    firebase_user = getattr(request.state, "firebase_user", None)
    if not firebase_user:
        return None
    
    email = firebase_user.get("email")
    if not email:
        return None
    
    user = db.query(User).filter(User.email == email).first()
    return user


async def check_and_record_ai_usage(
    request: Request,
    db: Session,
    feature_type: str,
    session_id: Optional[str] = None,
) -> tuple[bool, dict]:
    """
    Check if user can use AI feature and record usage if allowed.
    Returns (allowed, info_dict)
    """
    user = get_user_from_request(request, db)
    user_id = user.id if user else None
    
    from app.services.usage_service import get_plan_tier
    plan_tier = get_plan_tier(user, db)
    
    allowed, info = check_usage_limit(user_id, feature_type, plan_tier, session_id, db)
    
    if allowed:
        # Record usage
        try:
            record_ai_usage(user_id, feature_type, session_id, db)
        except Exception as e:
            logger.warning(f"Failed to record AI usage: {e}")
    
    return allowed, info


@router.get("/health")
async def health_check():
    """Check health status of AI services"""
    return {
        "job_matching_agent": job_matching_agent is not None,
        "ats_checker": ats_checker is not None,
        "enhanced_ats_checker": enhanced_ats_checker is not None,
        "ai_improvement_engine": ai_improvement_engine is not None,
        "ats_scoring_agent": ats_scoring_agent is not None,
        "content_generation_agent": content_generation_agent is not None,
        "cover_letter_agent": cover_letter_agent is not None,
        "improvement_agent": improvement_agent is not None,
        "grammar_agent": grammar_agent is not None,
    }


# ATS Scoring Endpoints
@router.post("/ats_score")
async def get_ats_score(payload: ResumePayload):
    """Get ATS compatibility score and suggestions for resume"""
    try:
        logger.info("Processing ATS score request")

        # Check if ATS checker is available
        if not ats_checker:
            return {
                "success": False,
                "score": 0,
                "suggestions": [
                    "ATS analysis is not available. Please install required dependencies."
                ],
                "details": {},
                "error": "ATS checker not available",
            }

        # Convert ResumePayload to dict for ATSChecker
        resume_data = {
            "name": payload.name,
            "title": payload.title,
            "email": payload.email,
            "phone": payload.phone,
            "location": payload.location,
            "summary": payload.summary,
            "sections": payload.sections,
        }

        # Get ATS score and analysis
        result = ats_checker.get_ats_score(resume_data)

        logger.info(f"ATS analysis completed. Score: {result.get('score', 0)}")

        return {
            "success": True,
            "score": result.get("score", 0),
            "suggestions": result.get("suggestions", []),
            "details": result.get("details", {}),
            "message": f"ATS compatibility score: {result.get('score', 0)}/100",
        }

    except Exception as e:
        logger.error(f"ATS score calculation error: {str(e)}")
        return {
            "success": False,
            "score": 0,
            "suggestions": ["Unable to analyze resume. Please check your content."],
            "details": {},
            "error": str(e),
        }


@router.options("/enhanced_ats_score")
async def options_enhanced_ats_score(request: Request):
    """Handle OPTIONS preflight for enhanced_ats_score endpoint"""
    import os
    from app.core.config import settings
    
    origin = request.headers.get("origin")
    
    headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    # Get allowed origins from settings
    allowed_origins = settings.allowed_origins
    env = os.getenv("ENVIRONMENT", "development")
    
    # Check if origin is allowed
    if origin:
        if env == "staging":
            headers["Access-Control-Allow-Origin"] = "*"
            headers["Access-Control-Allow-Credentials"] = "false"
        elif origin in allowed_origins or origin.startswith("chrome-extension://"):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        else:
            # Still allow for OPTIONS (preflight), actual request will be validated
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "false"
    
    return Response(status_code=200, headers=headers)


@router.post("/enhanced_ats_score")
async def get_enhanced_ats_score(
    payload: EnhancedATSPayload,
    request: Request,
    db: Session = Depends(get_db),
    session_id: Optional[str] = None,
):
    """Get enhanced ATS compatibility score with AI improvements using TF-IDF when job description provided"""
    try:
        logger.info("Processing enhanced ATS score request")

        # Check usage limit
        allowed, usage_info = await check_and_record_ai_usage(
            request, db, "ats_enhanced", session_id
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Usage limit exceeded",
                    "message": "You've reached your limit for enhanced ATS scoring. Upgrade to premium for unlimited access.",
                    "usage_info": usage_info,
                },
            )

        # Check if enhanced ATS checker is available
        if not enhanced_ats_checker:
            return {
                "success": False,
                "score": 0,
                "suggestions": [
                    "Enhanced ATS analysis is not available. Please install required dependencies."
                ],
                "details": {},
                "ai_improvements": [],
                "error": "Enhanced ATS checker not available",
            }

        # Convert ResumePayload to dict for EnhancedATSChecker
        resume_data = {
            "name": payload.resume_data.name,
            "title": payload.resume_data.title,
            "email": payload.resume_data.email,
            "phone": payload.resume_data.phone,
            "location": payload.resume_data.location,
            "summary": payload.resume_data.summary,
            "sections": [
                {
                    "id": section.id,
                    "title": section.title,
                    "bullets": [
                        {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                        for bullet in section.bullets
                    ],
                }
                for section in payload.resume_data.sections
            ],
        }

        # Get enhanced ATS score and analysis
        # Automatically use industry-standard TF-IDF when job description or extracted_keywords is provided
        use_tfidf = bool(
            (payload.job_description and payload.job_description.strip()) or 
            (payload.extracted_keywords and payload.extracted_keywords.get("total_keywords", 0) > 0)
        )
        result = enhanced_ats_checker.get_enhanced_ats_score(
            resume_data, 
            payload.job_description, 
            use_industry_standard=use_tfidf,
            extracted_keywords=payload.extracted_keywords,
            previous_score=payload.previous_score
        )

        logger.info(f"Enhanced ATS analysis completed. Score: {result.get('score', 0)}")

        return {
            "success": True,
            "score": result.get("score", 0),
            "suggestions": result.get("suggestions", []),
            "details": result.get("details", {}),
            "ai_improvements": result.get("ai_improvements", []),
            "method": result.get("method", "comprehensive"),
            "message": f"Enhanced ATS compatibility score: {result.get('score', 0)}/100",
        }

    except Exception as e:
        logger.error(f"Enhanced ATS score calculation error: {str(e)}")
        return {
            "success": False,
            "score": 0,
            "suggestions": ["Unable to analyze resume. Please check your content."],
            "details": {},
            "ai_improvements": [],
            "error": str(e),
        }


@router.get("/openai/status", include_in_schema=False)
async def get_openai_status():
    """Check OpenAI connection status - accessible at /api/openai/status"""
    from app.core.dependencies import OPENAI_API_KEY, OPENAI_MODEL, openai_client

    if not OPENAI_API_KEY:
        return {
            "status": "disabled",
            "message": "OpenAI API key not configured",
            "configured": False,
        }

    if not openai_client:
        return {
            "status": "error",
            "message": "OpenAI client not initialized",
            "configured": False,
        }

    try:
        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json",
        }

        data = {
            "model": openai_client["model"],
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 5,
        }

        response = openai_client["requests"].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60,
        )

        if response.status_code == 200:
            result = response.json()
            tokens_used = result.get("usage", {}).get("total_tokens", 0)
            return {
                "status": "connected",
                "message": "OpenAI client is working",
                "configured": True,
                "model": OPENAI_MODEL,
                "tokens_used": tokens_used,
            }
        else:
            return {
                "status": "error",
                "message": f"OpenAI API error: {response.status_code}",
                "configured": False,
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"OpenAI connection failed: {str(e)}",
            "configured": False,
        }


@router.post("/improvement_suggestions")
async def get_ai_improvement_suggestions(
    payload: AIImprovementPayload,
    request: Request,
    db: Session = Depends(get_db),
    session_id: Optional[str] = None,
):
    """Get AI-powered improvement suggestions based on 10 strategies"""
    try:
        logger.info("Processing AI improvement suggestions request")

        # Check usage limit
        allowed, usage_info = await check_and_record_ai_usage(
            request, db, "improvement", session_id
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Usage limit exceeded",
                    "message": "You've reached your limit for AI improvements. Upgrade to premium for unlimited access.",
                    "usage_info": usage_info,
                },
            )

        # Check if AI improvement engine is available
        if not ai_improvement_engine:
            return {
                "success": False,
                "suggestions": [
                    "AI improvement engine is not available. Please install required dependencies."
                ],
                "error": "AI improvement engine not available",
            }

        # Convert ResumePayload to dict
        resume_data = {
            "name": payload.resume_data.name,
            "title": payload.resume_data.title,
            "email": payload.resume_data.email,
            "phone": payload.resume_data.phone,
            "location": payload.resume_data.location,
            "summary": payload.resume_data.summary,
            "sections": [
                {
                    "id": section.id,
                    "title": section.title,
                    "bullets": [
                        {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                        for bullet in section.bullets
                    ],
                }
                for section in payload.resume_data.sections
            ],
        }

        # Get AI improvement suggestions
        result = ai_improvement_engine.get_improvement_suggestions(
            resume_data, payload.job_description, payload.target_role, payload.industry
        )

        logger.info(
            f"AI improvement suggestions generated. Total: {result.get('total_improvements', 0)}"
        )

        return result

    except Exception as e:
        logger.error(f"AI improvement suggestions error: {str(e)}")
        return {
            "success": False,
            "suggestions": [
                "Unable to generate improvement suggestions. Please check your content."
            ],
            "error": str(e),
        }


# Cover Letter Generation
@router.post("/extract_jd_sentences")
async def extract_jd_sentences(payload: ExtractSentencesPayload):
    """Extract important sentences from job description"""
    try:
        import re
        from typing import List
        
        if not payload.job_description:
            return {"sentences": []}
        
        # Split by sentences (period, exclamation, question mark followed by space or newline)
        sentences = re.split(r'(?<=[.!?])\s+', payload.job_description)
        
        # Clean sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            # Filter out very short sentences (< 10 chars) and empty ones
            if len(sentence) > 10 and not sentence.startswith(('http://', 'https://', 'www.')):
                cleaned_sentences.append(sentence)
        
        # If we have many sentences, use AI to identify most important ones
        if len(cleaned_sentences) > 15 and openai_client:
            try:
                sentences_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(cleaned_sentences[:50])])
                prompt = f"""Extract the most important sentences from this job description. These should be key requirements, qualifications, responsibilities, or company values that would be valuable to reference in a cover letter.

Return a JSON array of the sentence numbers (as integers) that are most important, prioritized by relevance. Return 10-15 most important sentences.

Job Description Sentences:
{sentences_text}

Return ONLY a JSON array of numbers like [1, 3, 5, 7, ...], no other text."""

                headers = {
                    "Authorization": f"Bearer {openai_client['api_key']}",
                    "Content-Type": "application/json",
                }
                
                data = {
                    "model": openai_client["model"],
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 200,
                    "temperature": 0.3,
                }
                
                response = openai_client["requests"].post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"].strip()
                    # Parse JSON array
                    import json
                    try:
                        # Remove markdown code blocks if present
                        content = content.replace("```json", "").replace("```", "").strip()
                        selected_indices = json.loads(content)
                        # Convert to 0-based indices and filter valid ones
                        selected_indices = [i-1 for i in selected_indices if 1 <= i <= len(cleaned_sentences)]
                        important_sentences = [cleaned_sentences[i] for i in selected_indices if 0 <= i < len(cleaned_sentences)]
                        if important_sentences:
                            return {"sentences": important_sentences}
                    except:
                        pass
            except Exception as e:
                logger.warning(f"Failed to use AI for sentence extraction: {e}")
        
        # Fallback: return first 20 sentences or all if less
        return {"sentences": cleaned_sentences[:20]}
        
    except Exception as e:
        logger.error(f"Sentence extraction error: {str(e)}")
        # Fallback: simple sentence split
        import re
        sentences = re.split(r'(?<=[.!?])\s+', payload.job_description)
        return {"sentences": [s.strip() for s in sentences if len(s.strip()) > 10][:20]}


@router.post("/cover_letter")
async def generate_cover_letter(
    payload: CoverLetterPayload,
    request: Request,
    db: Session = Depends(get_db),
    session_id: Optional[str] = None,
):
    """Generate a tailored cover letter using AI"""
    try:
        # Check usage limit
        allowed, usage_info = await check_and_record_ai_usage(
            request, db, "cover_letter", session_id
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Usage limit exceeded",
                    "message": "You've reached your limit for cover letter generation. Upgrade to premium for unlimited access.",
                    "usage_info": usage_info,
                },
            )

        # Convert resume data to text for context
        resume_text = f"{payload.resume_data.name} — {payload.resume_data.title}\n\n"
        if payload.resume_data.summary:
            resume_text += payload.resume_data.summary + "\n\n"

        for section in payload.resume_data.sections:
            resume_text += f"{section.title}\n"
            for bullet in section.bullets:
                resume_text += f"• {bullet.text}\n"
            resume_text += "\n"

        # Use selected sentences if provided, otherwise use full JD
        job_description_text = payload.job_description
        if payload.selected_sentences and len(payload.selected_sentences) > 0:
            job_description_text = "\n".join(payload.selected_sentences)
        
        # Use cover letter agent
        result = cover_letter_agent.generate_cover_letter(
            company_name=payload.company_name,
            position_title=payload.position_title,
            job_description=job_description_text,
            resume_text=resume_text,
            tone=payload.tone,
            custom_requirements=payload.custom_requirements,
            selected_sentences=payload.selected_sentences,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cover letter generation error: {str(e)}")
        error_message = "Failed to generate cover letter: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


# Grammar and Style Checking
@router.post("/grammar_check")
async def check_grammar_style(
    payload: GrammarCheckPayload,
    request: Request,
    db: Session = Depends(get_db),
    session_id: Optional[str] = None,
):
    """Check grammar and style of text"""
    try:
        text = payload.text.strip()
        if not text:
            return {"success": False, "error": "No text provided for checking"}

        # Check usage limit
        allowed, usage_info = await check_and_record_ai_usage(
            request, db, "grammar", session_id
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Usage limit exceeded",
                    "message": "You've reached your limit for grammar checks. Upgrade to premium for unlimited access.",
                    "usage_info": usage_info,
                },
            )

        logger.info(f"Grammar/style check requested for {len(text)} characters")

        # Use grammar agent for basic checks
        basic_result = grammar_agent.check_grammar_style(text, payload.check_type)

        # Format grammar issues (grammar_checker returns objects)
        from app.core.dependencies import grammar_checker

        formatted_grammar_issues = []
        if payload.check_type in ["grammar", "all"]:
            grammar_issues = grammar_checker.check_grammar(text)
            for issue in grammar_issues:
                formatted_grammar_issues.append(
                    {
                        "message": issue.message,
                        "replacements": issue.replacements,
                        "offset": issue.offset,
                        "length": issue.length,
                        "rule_id": issue.rule_id,
                        "category": issue.category,
                        "severity": issue.severity,
                    }
                )

        # Format style issues
        formatted_style_issues = []
        if payload.check_type in ["style", "all"]:
            passive_issues = grammar_checker.check_passive_voice(text)
            weak_verb_issues = grammar_checker.check_weak_verbs(text)
            readability_score, readability_issues = grammar_checker.check_readability(
                text
            )
            strength_score, strength_issues = grammar_checker.check_action_verbs(text)
            improvement_suggestions = grammar_checker.get_improvement_suggestions(text)
            style_score = grammar_checker.calculate_style_score(text)

            all_style_issues = (
                passive_issues + weak_verb_issues + readability_issues + strength_issues
            )
            for issue in all_style_issues:
                formatted_style_issues.append(
                    {
                        "type": issue.type,
                        "message": issue.message,
                        "suggestion": issue.suggestion,
                        "severity": issue.severity,
                        "score_impact": issue.score_impact,
                    }
                )
        else:
            improvement_suggestions = []
            style_score = None

        response = {
            "success": True,
            "text_length": len(text),
            "grammar_issues": formatted_grammar_issues,
            "style_issues": formatted_style_issues,
            "improvement_suggestions": improvement_suggestions,
        }

        if style_score:
            response.update(
                {
                    "style_score": {
                        "overall_score": style_score.overall_score,
                        "grammar_score": style_score.grammar_score,
                        "readability_score": style_score.readability_score,
                        "strength_score": style_score.strength_score,
                        "issues_count": style_score.issues_count,
                        "suggestions": style_score.suggestions,
                    }
                }
            )

        return response

    except Exception as e:
        logger.error(f"Grammar/style check error: {str(e)}")
        error_message = "Failed to check grammar and style: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


# Job Description Matching
@router.post("/match_job_description")
async def match_job_description(
    payload: JobDescriptionMatchPayload,
    user_email: str = None,
    db: Session = Depends(get_db),
):
    """Match job description with resume and calculate similarity score"""
    try:
        # Convert resume data to text for analysis
        resume_text = f"{payload.resume_data.name} — {payload.resume_data.title}\n\n"
        if payload.resume_data.summary:
            resume_text += payload.resume_data.summary + "\n\n"

        for section in payload.resume_data.sections:
            resume_text += f"{section.title}\n"
            for bullet in section.bullets:
                resume_text += f"• {bullet.text}\n"
            resume_text += "\n"

        # Check if job matching agent is available
        if job_matching_agent is None:
            raise HTTPException(
                status_code=503,
                detail="Job matching service is not available. Please check server configuration."
            )

        # Use job matching agent
        try:
            match_result = job_matching_agent.match_job_description(
                job_description=payload.job_description, resume_text=resume_text
            )
        except Exception as e:
            logger.error(f"Error in job matching agent: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to analyze job match: {str(e)}"
            )

        # Track job match analytics
        if user_email and db:
            try:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    # Find or create resume record
                    resume = (
                        db.query(Resume)
                        .filter(
                            Resume.user_id == user.id,
                            Resume.name == payload.resume_data.name,
                        )
                        .first()
                    )

                    if not resume:
                        resume = Resume(
                            user_id=user.id,
                            name=payload.resume_data.name,
                            title=payload.resume_data.title,
                            email=payload.resume_data.email,
                            phone=payload.resume_data.phone,
                            location=payload.resume_data.location,
                            summary=payload.resume_data.summary,
                            template="tech",
                        )
                        db.add(resume)
                        db.commit()
                        db.refresh(resume)

                    # Create job match record
                    job_match = JobMatch(
                        user_id=user.id,
                        resume_id=resume.id,
                        job_description=payload.job_description,
                        match_score=match_result["match_analysis"]["similarity_score"],
                        keyword_matches=match_result["match_analysis"][
                            "matching_keywords"
                        ],
                        missing_keywords=match_result["match_analysis"][
                            "missing_keywords"
                        ],
                        improvement_suggestions=match_result[
                            "improvement_suggestions"
                        ],
                    )

                    db.add(job_match)
                    db.commit()

                    logger.info(
                        f"Job match analytics tracked for user {user_email}: score {match_result['match_analysis']['similarity_score']}"
                    )
            except Exception as e:
                logger.error(f"Failed to track job match analytics: {e}")

        return match_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job description matching error: {str(e)}")
        error_message = "Failed to analyze job match: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/extract_job_keywords")
async def extract_job_keywords(payload: ExtractKeywordsPayload):
    """Extract high-intensity keywords from job description"""
    try:
        if not payload.job_description or not payload.job_description.strip():
            raise HTTPException(
                status_code=400,
                detail="Job description cannot be empty"
            )

        job_keywords = keyword_extractor.extract_keywords(payload.job_description)
        
        technical_keywords = job_keywords.get("technical_keywords", [])
        general_keywords = job_keywords.get("general_keywords", [])
        soft_skills = job_keywords.get("soft_skills", [])
        ats_focused = job_keywords.get("ats_focused_keywords", [])
        high_frequency_keywords = job_keywords.get("high_frequency_keywords", [])

        high_intensity_keywords = [
            item for item in high_frequency_keywords 
            if item.get("importance") == "high"
        ]
        high_intensity_keywords.sort(key=lambda x: x.get("frequency", 0), reverse=True)
        
        all_high_priority = set()
        all_high_priority.update([kw.lower() for kw in technical_keywords])
        all_high_priority.update([
            item["keyword"].lower() 
            for item in high_intensity_keywords[:20]
            if isinstance(item, dict) and item.get("keyword")
        ])
        all_high_priority.update([kw.lower() for kw in ats_focused[:10]])

        return {
            "success": True,
            "technical_keywords": technical_keywords,
            "high_intensity_keywords": high_intensity_keywords[:30],
            "high_priority_keywords": list(all_high_priority)[:40],
            "general_keywords": general_keywords[:30],
            "soft_skills": soft_skills[:20],
            "ats_focused_keywords": ats_focused[:20],
            "total_keywords": len(technical_keywords) + len(general_keywords) + len(soft_skills),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Keyword extraction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract keywords: {str(e)}"
        )


@router.post("/extract_keywords_llm")
async def extract_keywords_llm(payload: ExtractKeywordsPayload):
    """Extract keywords from job description using LLM (pure AI approach)"""
    try:
        if not payload.job_description or not payload.job_description.strip():
            raise HTTPException(
                status_code=400,
                detail="Job description cannot be empty"
            )

        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="OpenAI service not available"
            )

        from app.prompts.content_generation_prompts import get_llm_keyword_extraction_prompt
        
        prompt = get_llm_keyword_extraction_prompt(payload.job_description)
        
        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json",
        }

        data = {
            "model": openai_client["model"],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 800,  # Enough for 50-100 keywords
            "temperature": 0.3,  # Lower for more consistent extraction
            "response_format": {"type": "json_object"},  # Force JSON response
        }

        # Use async httpx client
        httpx_client = openai_client.get("httpx_client")
        if not httpx_client:
            raise HTTPException(
                status_code=503,
                detail="HTTP client not available"
            )

        try:
            response = await httpx_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=20.0,
            )

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"OpenAI API error: {response.status_code}"
                )

            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            
            # Parse JSON response
            import json
            keywords_data = json.loads(content)
            
            # Validate keywords against job description content
            jd_lower = payload.job_description.lower()
            
            def keyword_in_text(keyword: str) -> bool:
                """Check if keyword appears in job description text"""
                if not keyword:
                    return False
                kw_lower = keyword.lower().strip()
                # Check exact match or as part of a word/phrase
                return kw_lower in jd_lower
            
            # Filter keywords to only those present in JD
            technical_keywords = [
                kw for kw in keywords_data.get("technical_keywords", [])
                if keyword_in_text(kw)
            ]
            soft_skills = [
                kw for kw in keywords_data.get("soft_skills", [])
                if keyword_in_text(kw)
            ]
            general_keywords = [
                kw for kw in keywords_data.get("general_keywords", [])
                if keyword_in_text(kw)
            ]
            priority_keywords = [
                kw for kw in keywords_data.get("priority_keywords", [])
                if keyword_in_text(kw)
            ]
            education_keywords = [
                kw for kw in keywords_data.get("education", [])
                if keyword_in_text(kw)
            ]
            experience_keywords = [
                kw for kw in keywords_data.get("experience", [])
                if keyword_in_text(kw)
            ]
            
            # Create high_frequency_keywords format
            high_frequency_keywords = [
                {
                    "keyword": kw,
                    "frequency": len(priority_keywords) - idx,  # Higher frequency for earlier keywords
                    "importance": "high" if idx < 5 else "medium" if idx < 10 else "low"
                }
                for idx, kw in enumerate(priority_keywords[:20])
            ]
            
            # Combine all keywords for total count
            all_keywords = (
                technical_keywords + 
                general_keywords + 
                soft_skills + 
                education_keywords + 
                experience_keywords
            )
            
            return {
                "success": True,
                "method": "llm",
                "technical_keywords": technical_keywords,
                "soft_skills": soft_skills,
                "general_keywords": general_keywords,
                "priority_keywords": priority_keywords,
                "high_frequency_keywords": high_frequency_keywords,
                "education_keywords": education_keywords,
                "experience_keywords": experience_keywords,
                "total_keywords": len(set(all_keywords)),  # Unique count
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse LLM response"
            )
        except asyncio.TimeoutError:
            logger.error("OpenAI API timeout")
            raise HTTPException(
                status_code=504,
                detail="OpenAI API timeout"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM keyword extraction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract keywords: {str(e)}"
        )


# Content Generation Endpoints
@router.post("/generate_bullet_points")
async def generate_bullet_points(payload: GenerateBulletPointsPayload):
    """Generate bullet points from scratch using AI"""
    try:
        result = await content_generation_agent.generate_bullet_points(
            role=payload.role,
            company=payload.company,
            skills=payload.skills,
            count=payload.count,
            tone=payload.tone,
        )

        return {
            "success": True,
            "bullet_points": result["bullets"],
            "count": len(result["bullets"]),
            "tokens_used": result["tokens_used"],
            "role": payload.role,
            "company": payload.company,
            "tone": payload.tone,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI generate bullet points error: {str(e)}")
        error_message = "Failed to generate bullet points: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/generate_summary")
async def generate_summary(payload: GenerateSummaryPayload):
    """Generate professional resume summary using AI"""
    try:
        result = await content_generation_agent.generate_summary(
            role=payload.role,
            years_experience=payload.years_experience,
            skills=payload.skills,
            achievements=payload.achievements,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI generate summary error: {str(e)}")
        error_message = "Failed to generate summary: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


# Legacy OpenAI endpoint (redirected from /api/openai/improve-bullet)
@router.post("/openai/improve-bullet")
async def improve_bullet(payload: ImproveBulletPayload):
    """Improve a bullet point using AI"""
    try:
        result = await improvement_agent.improve_bullet(
            bullet=payload.bullet,
            context=payload.context,
            tone=payload.tone,
        )

        return {
            "success": True,
            "original": payload.bullet,
            "improved": result["improved_bullet"],
            "tokens_used": result["tokens_used"],
            "tone": payload.tone,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI improve bullet error: {str(e)}")
        error_message = "Failed to improve bullet: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/generate-work-experience")
async def generate_work_experience(payload: WorkExperienceRequest):
    """Generate work experience content from user description"""
    try:
        logger.info("Processing work experience generation request")

        # Check if OpenAI is available
        if not openai_client:
            return {
                "success": False,
                "error": "OpenAI API not available",
                "companyName": payload.currentCompany or "Tech Company",
                "jobTitle": payload.currentJobTitle or "Software Engineer",
                "dateRange": payload.currentDateRange or "2020-2023",
                "bullets": [
                    "Developed and maintained web applications using modern technologies",
                    "Collaborated with cross-functional teams to deliver high-quality software solutions",
                    "Implemented automated testing and CI/CD pipelines",
                    "Mentored junior developers and conducted code reviews",
                ],
            }

        missing_keywords = getattr(payload, 'missing_keywords', None) or []
        
        # Use content generation agent
        result = await content_generation_agent.generate_work_experience(
            role=payload.currentJobTitle or payload.role or "Software Engineer",
            company=payload.currentCompany or payload.company or "Tech Company",
            date_range=payload.currentDateRange or payload.duration or "2020-2023",
            current_bullets=[],
            tone=payload.tone or "professional",
            skills=payload.experienceDescription or payload.achievements,
            projects=payload.projects,
            job_description=payload.jobDescription,
            missing_keywords=missing_keywords if isinstance(missing_keywords, list) else [],
        )

        # Parse bullets and return in expected format
        bullets = result.get("bullets", [])
        if not bullets:
            bullets = [
                "Developed and maintained web applications using modern technologies",
                "Collaborated with cross-functional teams to deliver high-quality software solutions",
                "Implemented automated testing and CI/CD pipelines",
                "Mentored junior developers and conducted code reviews",
            ]

        return {
            "success": True,
            "companyName": payload.currentCompany or "Tech Company",
            "jobTitle": payload.currentJobTitle or "Software Engineer",
            "dateRange": payload.currentDateRange or "2020-2023",
            "bullets": bullets,
        }

    except Exception as e:
        logger.error(f"Work experience generation error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "companyName": payload.currentCompany or "Tech Company",
            "jobTitle": payload.currentJobTitle or "Software Engineer",
            "dateRange": payload.currentDateRange or "2020-2023",
            "bullets": [
                "Developed and maintained web applications using modern technologies",
                "Collaborated with cross-functional teams to deliver high-quality software solutions",
                "Implemented automated testing and CI/CD pipelines",
                "Mentored junior developers and conducted code reviews",
            ],
        }


@router.post("/generate_bullet_from_keywords")
async def generate_bullet_from_keywords(payload: dict):
    """Generate bullet points from keywords and company context"""
    try:
        # Check if content generation agent is available
        if content_generation_agent is None:
            raise HTTPException(
                status_code=503,
                detail="Content generation service is not available. Please check server configuration."
            )

        raw_keywords = payload.get("keywords", "")
        company_title = payload.get("company_title", "")
        job_title = payload.get("job_title", "")
        job_description = payload.get("job_description", "") or ""
        resume_context = payload.get("resume_context", "") or ""
        current_bullet = str(payload.get("current_bullet", "") or "").strip()
        mode = str(payload.get("mode", "improve")).lower()
        requested_count = payload.get("count", 3)

        if isinstance(raw_keywords, str):
            keywords_list = [
                kw.strip() for kw in raw_keywords.split(",") if kw and kw.strip()
            ]
        elif isinstance(raw_keywords, (list, tuple, set)):
            keywords_list = [str(kw).strip() for kw in raw_keywords if str(kw).strip()]
        else:
            keywords_list = []

        if not keywords_list:
            raise HTTPException(status_code=400, detail="Keywords are required")

        keywords_str = ", ".join(keywords_list)
        # Limit context size to prevent slow API calls
        jd_excerpt = job_description[:500] if job_description else ""  # Reduced from 800
        resume_excerpt = resume_context[:500] if resume_context else ""  # Reduced from 800
        count = max(
            1, min(int(requested_count) if isinstance(requested_count, int) else 3, 5)
        )

        if mode in {"create", "new"} or not current_bullet:
            # Use content generation agent for create mode
            result = await content_generation_agent.generate_bullet_from_keywords(
                keywords_str=keywords_str,
                company_title=company_title,
                job_title=job_title,
                jd_excerpt=jd_excerpt,
                resume_excerpt=resume_excerpt,
                count=count,
            )

            bullets = result.get("bullets", [])
            cleaned_options = []
            for bullet in bullets:
                if not bullet or len(bullet) < 5:
                    continue
                cleaned = bullet.replace("\u2022", "").lstrip("•*- ").strip()
                if cleaned:
                    cleaned_options.append(cleaned)
                if len(cleaned_options) >= count:
                    break

            return {
                "success": True,
                "mode": "create",
                "bullet_options": cleaned_options or bullets[:count],
                "keywords_used": keywords_list,
                "company_title": company_title,
                "job_title": job_title,
                "tokens_used": result.get("tokens_used", 0),
            }
        else:
            # Use improvement agent for improve mode
            result = await content_generation_agent.generate_bullets_from_keywords(
                current_bullet=current_bullet,
                keywords_str=keywords_str,
                company_title=company_title,
                job_title=job_title,
                jd_excerpt=jd_excerpt,
            )

            bullet_text = result.get("improved_bullet", "").strip()
            bullet_text = (
                bullet_text.replace("\u2022", "").replace("•", "").replace("*", "").strip()
            )

            return {
                "success": True,
                "mode": "improve",
                "improved_bullet": bullet_text,
                "keywords_used": keywords_list,
                "company_title": company_title,
                "job_title": job_title,
                "tokens_used": result.get("tokens_used", 0),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI generate bullet from keywords error: {str(e)}", exc_info=True)
        error_message = "AI generation failed: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/generate_bullets_from_keywords")
async def generate_bullets_from_keywords(payload: dict):
    """Generate multiple bullet points from selected keywords for a work experience entry"""
    try:
        # Check if content generation agent is available
        if content_generation_agent is None:
            raise HTTPException(
                status_code=503,
                detail="Content generation service is not available. Please check server configuration."
            )

        keywords_list = payload.get("keywords", [])
        job_description = payload.get("job_description", "")
        company_title = payload.get("company_title", "")
        job_title = payload.get("job_title", "")

        if not keywords_list or len(keywords_list) == 0:
            raise HTTPException(status_code=400, detail="Keywords list is required")

        keywords_str = ", ".join(keywords_list)

        # Use content generation agent - only use selected keywords, not missing keywords
        result = await content_generation_agent.generate_bullet_from_keywords(
            keywords_str=keywords_str,
            company_title=company_title,
            job_title=job_title,
            jd_excerpt=job_description[:500] if job_description else None,
            resume_excerpt=None,
            count=max(3, min(len(keywords_list), 5)),
            missing_keywords=None,  # Don't use missing keywords - only use selected keywords
        )

        bullets = result.get("bullets", [])

        # Validate that all keywords are used in the generated bullets
        keywords_lower = [kw.lower().strip() for kw in keywords_list if kw.strip()]
        used_keywords = set()
        
        for bullet in bullets:
            bullet_lower = bullet.lower()
            for keyword in keywords_lower:
                # Check if keyword appears in bullet (whole word match)
                keyword_normalized = keyword.replace('/', '').replace('-', '').replace('.', '').replace('#', '')
                bullet_normalized = bullet_lower.replace('/', '').replace('-', '').replace('.', '').replace('#', '')
                if keyword_normalized in bullet_normalized or keyword in bullet_lower:
                    used_keywords.add(keyword)
        
        # If not all keywords are used, log a warning (prompt should handle this, but double-check)
        missing_keywords = set(keywords_lower) - used_keywords
        if missing_keywords:
            logger.warning(f"Some selected keywords were not used in generated bullets: {missing_keywords}")

        # Clean up bullets
        cleaned_bullets = []
        for bullet in bullets:
            bullet = bullet.strip()
            if bullet and len(bullet) > 10:
                for prefix in [
                    "•",
                    "*",
                    "-",
                    "1.",
                    "2.",
                    "3.",
                    "4.",
                    "5.",
                    "6.",
                    "7.",
                    "8.",
                    "9.",
                ]:
                    if bullet.startswith(prefix):
                        bullet = bullet[len(prefix) :].strip()
                cleaned_bullets.append(bullet)

        return {
            "success": True,
            "bullets": cleaned_bullets[: len(keywords_list) + 2],
            "keywords_used": keywords_list,
            "company_title": company_title,
            "job_title": job_title,
            "tokens_used": result.get("tokens_used", 0),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI generate bullets from keywords error: {str(e)}")
        error_message = "AI generation failed: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/generate_summary_from_experience")
async def generate_summary_from_experience(payload: dict):
    """Generate ATS-optimized professional summary by analyzing work experience"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")

    try:
        name = payload.get("name", "Professional")
        title = payload.get("title", "")
        sections = payload.get("sections", [])
        job_description = payload.get("job_description", "") or ""
        existing_summary = payload.get("existing_summary", "") or ""

        work_experience_sections = []
        skills_entries = []
        fallback_bullets = []

        for section in sections or []:
            section_title = str(section.get("title") or "").strip()
            bullets = section.get("bullets") or []
            bullet_texts = []

            for bullet in bullets:
                text = str(bullet.get("text") or "").strip()
                if not text:
                    continue
                cleaned = text.lstrip("-•*").strip()
                if cleaned:
                    bullet_texts.append(cleaned)

            if not bullet_texts:
                continue

            fallback_bullets.extend(bullet_texts)

            title_lower = section_title.lower()
            if any(
                keyword in title_lower
                for keyword in ["experience", "employment", "career", "history"]
            ):
                work_experience_sections.append(
                    f"{section_title or 'Experience'}:\n- "
                    + "\n- ".join(bullet_texts[:8])
                )
            if any(
                keyword in title_lower
                for keyword in [
                    "skill",
                    "competenc",
                    "strength",
                    "expertise",
                    "technology",
                    "technolog",
                    "tool",
                ]
            ):
                skills_entries.extend(bullet_texts)

        if work_experience_sections:
            work_experience_text = "\n\n".join(work_experience_sections[:4])
        else:
            work_experience_text = (
                "- " + "\n- ".join(fallback_bullets[:12]) if fallback_bullets else ""
            )

        def normalize_keywords(values):
            normalized = []
            if not values:
                return normalized
            for value in values:
                keyword = ""
                if isinstance(value, str):
                    keyword = value.strip()
                elif isinstance(value, dict):
                    keyword = str(value.get("keyword", "")).strip()
                else:
                    keyword = str(value).strip()
                if keyword:
                    normalized.append(keyword)
            return normalized

        priority_keywords = normalize_keywords(payload.get("priority_keywords", []))
        missing_keywords = normalize_keywords(payload.get("missing_keywords", []))
        high_frequency_keywords = normalize_keywords(
            payload.get("high_frequency_keywords", [])
        )
        matching_keywords = normalize_keywords(payload.get("matching_keywords", []))
        target_keywords = normalize_keywords(payload.get("target_keywords", []))
        
        # Extract company name from payload if available
        company_name = payload.get("company_name") or payload.get("companyName") or None
        
        # Filter out company names from missing keywords
        def filter_company_names(keywords: List[str], company: str | None) -> List[str]:
            if not company or not keywords:
                return keywords
            company_lower = company.lower().strip()
            if not company_lower:
                return keywords
            
            company_words = company_lower.split()
            filtered = []
            for keyword in keywords:
                keyword_lower = keyword.lower().strip()
                # Check if keyword matches company name or contains company words
                is_company_name = False
                if keyword_lower == company_lower:
                    is_company_name = True
                else:
                    # Check if keyword contains significant company words (length > 2)
                    for cw in company_words:
                        if len(cw) > 2 and (cw in keyword_lower or keyword_lower in cw):
                            is_company_name = True
                            break
                
                if not is_company_name:
                    filtered.append(keyword)
            
            return filtered
        
        # Filter company names from missing keywords
        if company_name:
            missing_keywords = filter_company_names(missing_keywords, company_name)

        combined_keywords = []
        seen_keywords = set()

        def append_keywords(sequence):
            for keyword in sequence:
                lower = keyword.lower()
                if lower in seen_keywords:
                    continue
                seen_keywords.add(lower)
                combined_keywords.append(keyword)

        append_keywords(target_keywords)
        append_keywords(priority_keywords)
        append_keywords(missing_keywords)
        append_keywords(high_frequency_keywords)
        append_keywords(matching_keywords)

        keyword_sections = []
        if priority_keywords:
            keyword_sections.append(
                "Priority Keywords (must appear naturally):\n- "
                + "\n- ".join(priority_keywords)
            )
        if missing_keywords:
            keyword_sections.append(
                "Missing JD Keywords to add:\n- " + "\n- ".join(missing_keywords)
            )
        if high_frequency_keywords:
            keyword_sections.append(
                "High-Frequency JD Keywords:\n- "
                + "\n- ".join(high_frequency_keywords[:12])
            )
        if matching_keywords:
            keyword_sections.append(
                "Resume Keywords to keep strength on:\n- "
                + "\n- ".join(matching_keywords[:12])
            )

        keyword_guidance = (
            "\n\n".join(keyword_sections)
            if keyword_sections
            else "No additional keyword guidance provided."
        )

        def sanitize_bullet_text(text_value):
            if not text_value:
                return ""
            text_str = str(text_value).strip()
            text_str = text_str.lstrip("•*- ").strip()
            return text_str

        def format_section_text(section_data):
            if not isinstance(section_data, dict):
                return ""
            title_value = section_data.get("title") or ""
            title_text = str(title_value).strip()
            lines = []
            if title_text:
                lines.append(title_text.upper())
            bullets = section_data.get("bullets") or []
            for bullet in bullets:
                bullet_text = ""
                if isinstance(bullet, dict):
                    bullet_text = sanitize_bullet_text(bullet.get("text"))
                else:
                    bullet_text = sanitize_bullet_text(bullet)
                if bullet_text:
                    lines.append(f"- {bullet_text}")
            return "\n".join(lines).strip()

        work_section_texts: List[str] = []
        skills_entries_list: List[str] = []
        project_section_texts: List[str] = []

        for section in sections or []:
            formatted_section = format_section_text(section)
            if not formatted_section:
                continue

            title_value = section.get("title") or ""
            title_lower = str(title_value).lower()

            if any(
                keyword in title_lower
                for keyword in [
                    "experience",
                    "employment",
                    "career",
                    "work history",
                    "professional history",
                    "roles",
                ]
            ):
                work_section_texts.append(formatted_section)
            elif "project" in title_lower:
                project_section_texts.append(formatted_section)
            elif "skill" in title_lower:
                section_bullets = section.get("bullets") or []
                skill_tokens = []
                for bullet in section_bullets:
                    bullet_text = ""
                    if isinstance(bullet, dict):
                        bullet_text = sanitize_bullet_text(bullet.get("text"))
                    else:
                        bullet_text = sanitize_bullet_text(bullet)
                    if bullet_text:
                        skill_tokens.append(bullet_text)
                if skill_tokens:
                    skills_entries_list.append(", ".join(skill_tokens))

        if not work_section_texts and project_section_texts:
            work_section_texts = project_section_texts

        work_experience_text = "\n\n".join(work_section_texts).strip()

        if not skills_entries_list:
            aggregated_skills: List[str] = []
            for section in sections or []:
                for bullet in section.get("bullets") or []:
                    bullet_text = ""
                    if isinstance(bullet, dict):
                        bullet_text = sanitize_bullet_text(bullet.get("text"))
                    else:
                        bullet_text = sanitize_bullet_text(bullet)
                    if bullet_text:
                        aggregated_skills.append(bullet_text)
            skills_text = ", ".join(aggregated_skills[:20])
        else:
            skills_text = "\n".join(skills_entries_list).strip()

        job_description_excerpt = job_description.strip()
        if len(job_description_excerpt) > 2000:
            job_description_excerpt = job_description_excerpt[:2000] + "..."

        def build_fallback_summary() -> str:
            headline = title or "Experienced professional"
            experience_phrases: List[str] = []
            for section in sections or []:
                bullets = section.get("bullets") or []
                for bullet in bullets:
                    bullet_text = ""
                    if isinstance(bullet, dict):
                        bullet_text = sanitize_bullet_text(bullet.get("text"))
                    else:
                        bullet_text = sanitize_bullet_text(bullet)
                    if bullet_text:
                        experience_phrases.append(bullet_text)
                    if len(experience_phrases) >= 5:
                        break
                if len(experience_phrases) >= 5:
                    break

            keyword_snippet = ", ".join(combined_keywords[:6])
            summary_parts = []

            if experience_phrases:
                summary_parts.append(
                    "Key achievements include " + "; ".join(experience_phrases[:3])
                )

            if keyword_snippet:
                summary_parts.append(f"Strengths across {keyword_snippet}.")

            if not summary_parts:
                return ""

            return (
                f"{headline} with a proven record of delivering results. "
                + " ".join(summary_parts)
            )

        missing_kw_section = ""
        if missing_keywords and len(missing_keywords) > 0:
            # Limit to 5-8 missing keywords (use up to 8)
            limited_missing = missing_keywords[:8]
            missing_kw_section = f"""
CRITICAL - Missing Keywords from Job Description (HIGH PRIORITY - MUST include these naturally):
{', '.join(limited_missing)}

These keywords are currently MISSING from your resume and MUST be incorporated 
into the summary to improve ATS score. Use them naturally in context - they are 
the highest priority for inclusion.
"""
        
        company_warning = ""
        if company_name:
            company_warning = f"""
CRITICAL: NEVER mention or reference the company name "{company_name}" or any company name from the job description in the professional summary. 
The summary should be generic and applicable to any role, not specific to any particular company.
"""
        
        context = f"""Analyze this professional's work experience and create a compelling ATS-optimized professional summary.

Professional Title: {title if title else 'Not specified'}

Work Experience:
{work_experience_text if work_experience_text else 'Limited information provided'}

Skills:
{skills_text if skills_text else 'To be extracted from experience'}

 Target Job Description Keywords (blend these naturally into the narrative):
{keyword_guidance}
{missing_kw_section}
{company_warning}
 Job Description Snapshot (for context):
{job_description_excerpt if job_description_excerpt else 'Not provided'}

 Existing Summary (for reference only – produce a new, improved summary):
{existing_summary if existing_summary else 'No existing summary provided'}

Requirements for the Professional Summary:
1. Length: 4-7 sentences (minimum 4 sentences, maximum 7 sentences, approximately 80-120 words)
2. ATS-Optimized: Include relevant keywords from their experience and industry
3. Structure:
   - Sentence 1: Opening statement with years of experience and core expertise
   - Sentences 2-4: Key achievements, skills, and value proposition with specific metrics when available
   - Sentences 5-6 (if needed): Technical competencies and areas of expertise
   - Final sentence: Career objective or unique value add
4. Include specific technologies, tools, and methodologies mentioned in experience
5. Use action-oriented language and quantifiable achievements
6. Professional, confident tone
7. Third-person perspective (avoid "I")
8. Focus on impact and results
9. Include industry-specific keywords for ATS systems
10. Prioritize incorporating the provided priority and missing JD keywords verbatim when it fits naturally
11. CRITICAL: The missing keywords listed above are HIGH PRIORITY - ensure they appear naturally in the summary
12. Avoid keyword stuffing—ensure the summary flows smoothly while covering the critical terms
13. NEVER include any company names from the job description in the summary

Return ONLY the professional summary paragraph, no labels, explanations, or formatting markers."""

        summary_text = ""
        tokens_used = 0
        fallback_error: Optional[str] = None

        try:
            headers = {
                "Authorization": f"Bearer {openai_client['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": openai_client["model"],
                "messages": [{"role": "user", "content": context}],
                "max_tokens": 500,
                "temperature": 0.7,
            }

            logger.info(f"Generating summary from experience for: {name}")

            # Use async HTTP client with proper timeout handling
            httpx_client = openai_client.get("httpx_client")
            if not httpx_client:
                # Fallback to creating a new client if not available
                import httpx
                httpx_client = httpx.AsyncClient(
                    timeout=httpx.Timeout(35.0, connect=5.0),
                    limits=httpx.Limits(max_keepalive_connections=10, max_connections=50),
                )

            async def make_request():
                response = await httpx_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                )
                if response.status_code != 200:
                    raise Exception(
                        f"OpenAI API error: {response.status_code} - {response.text}"
                    )
                return response.json()

            # Use asyncio.wait_for for proper timeout handling
            result = await asyncio.wait_for(make_request(), timeout=35.0)
            summary_text = result["choices"][0]["message"]["content"].strip()
            tokens_used = result.get("usage", {}).get("total_tokens", 0)
        except asyncio.TimeoutError:
            fallback_error = "Request timed out after 35 seconds"
            logger.error(f"OpenAI generate summary timeout: {fallback_error}")
            summary_text = build_fallback_summary()
            if not summary_text:
                default_headline = title or "Results-driven professional"
                keyword_snippet = ", ".join(combined_keywords[:5])
                if keyword_snippet:
                    summary_text = f"{default_headline} known for expertise across {keyword_snippet}, committed to delivering measurable business impact."
                else:
                    summary_text = f"{default_headline} with a track record of driving successful outcomes and elevating team performance."
            tokens_used = 0
        except Exception as generation_error:
            fallback_error = str(generation_error)
            logger.error(
                f"OpenAI generate summary from experience error: {fallback_error}"
            )
            summary_text = build_fallback_summary()
            if not summary_text:
                default_headline = title or "Results-driven professional"
                keyword_snippet = ", ".join(combined_keywords[:5])
                if keyword_snippet:
                    summary_text = f"{default_headline} known for expertise across {keyword_snippet}, committed to delivering measurable business impact."
                else:
                    summary_text = f"{default_headline} with a track record of driving successful outcomes and elevating team performance."

        summary_text = summary_text.strip("\"'")

        summary_lower = summary_text.lower()
        keywords_incorporated = []
        for keyword in combined_keywords:
            if keyword.lower() in summary_lower:
                keywords_incorporated.append(keyword)

        uncovered_missing_keywords = [
            keyword
            for keyword in missing_keywords
            if keyword and keyword.lower() not in summary_lower
        ]

        if uncovered_missing_keywords:
            additional_clause = (
                " Key focus areas include "
                + ", ".join(uncovered_missing_keywords[:6])
                + "."
            )
            if not summary_text.endswith((".", "!", "?")):
                summary_text = summary_text.rstrip() + "."
            summary_text = summary_text.rstrip() + additional_clause
            summary_lower = summary_text.lower()
            for keyword in uncovered_missing_keywords:
                if (
                    keyword.lower() in summary_lower
                    and keyword not in keywords_incorporated
                ):
                    keywords_incorporated.append(keyword)

        response_payload = {
            "success": True,
            "summary": summary_text,
            "tokens_used": tokens_used,
            "word_count": len(summary_text.split()),
            "keywords_incorporated": keywords_incorporated,
            "requested_keywords": combined_keywords,
        }

        if fallback_error:
            response_payload["fallback"] = True
            response_payload["error"] = fallback_error

        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI generate summary from experience error: {str(e)}")
        # Always return a response, even on error, to prevent "No response returned" error
        try:
            fallback_summary = build_fallback_summary()
            if not fallback_summary:
                default_headline = payload.get("title") or "Results-driven professional"
                fallback_summary = f"{default_headline} with a track record of driving successful outcomes and elevating team performance."
            
            return {
                "success": True,
                "summary": fallback_summary,
                "tokens_used": 0,
                "word_count": len(fallback_summary.split()),
                "keywords_incorporated": [],
                "requested_keywords": [],
                "fallback": True,
                "error": str(e)
            }
        except Exception as fallback_error:
            logger.error(f"Even fallback summary generation failed: {str(fallback_error)}")
            # Last resort - return a basic summary
            return {
                "success": True,
                "summary": "Experienced professional with a proven track record of delivering results and driving business impact.",
                "tokens_used": 0,
                "word_count": 12,
                "keywords_incorporated": [],
                "requested_keywords": [],
                "fallback": True,
                "error": f"Primary error: {str(e)}, Fallback error: {str(fallback_error)}"
            }


@router.post("/generate_resume_content")
async def generate_resume_content(payload: dict):
    """Generate resume content based on user requirements"""
    try:
        content_type = payload.get("contentType", "job")
        requirements = payload.get("requirements", "")
        position = payload.get("position", "end")
        target_section = payload.get("targetSection", "")
        existing_data = payload.get("existingData", {})
        context = payload.get("context", {})

        # Build context from existing resume data
        existing_context = f"""
        Current Resume:
        Name: {context.get('name', '')}
        Title: {context.get('title', '')}
        Existing Sections: {', '.join(context.get('currentSections', []))}
        """

        # Use content generation agent
        result = await content_generation_agent.generate_resume_content(
            content_type=content_type,
            requirements=requirements,
            existing_context=existing_context,
            position=position,
            current_bullet=context.get("bulletText") if content_type == "bullet-improvement" else None,
            section_title=context.get("sectionTitle") if content_type == "bullet-improvement" else None,
            company_name=context.get("companyName") if content_type == "bullet-improvement" else None,
            job_title=context.get("jobTitle") if content_type == "bullet-improvement" else None,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        error_message = "Failed to generate content: " + str(e)
        raise HTTPException(status_code=500, detail=error_message)


@router.post("/improve_ats_score")
async def improve_ats_score_bulk(payload: EnhancedATSPayload):
    """Apply multiple AI improvements to boost ATS score"""
    try:
        logger.info("Processing bulk ATS score improvement request")

        # Check if enhanced ATS checker and AI improvement engine are available
        if not enhanced_ats_checker or not ai_improvement_engine:
            return {
                "success": False,
                "improved_resume": None,
                "score_improvement": 0,
                "applied_improvements": [],
                "error": "Required services not available",
            }

        # Convert ResumePayload to dict
        resume_data = {
            "name": payload.resume_data.name,
            "title": payload.resume_data.title,
            "email": payload.resume_data.email,
            "phone": payload.resume_data.phone,
            "location": payload.resume_data.location,
            "summary": payload.resume_data.summary,
            "sections": [
                {
                    "id": section.id,
                    "title": section.title,
                    "bullets": [
                        {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                        for bullet in section.bullets
                    ],
                }
                for section in payload.resume_data.sections
            ],
        }

        # Get current ATS score
        # Automatically use industry-standard TF-IDF when job description is provided
        use_tfidf = bool(payload.job_description and payload.job_description.strip())
        current_result = enhanced_ats_checker.get_enhanced_ats_score(
            resume_data, payload.job_description, use_industry_standard=use_tfidf
        )
        current_score = current_result.get("score", 0)

        # Get AI improvements
        improvements = current_result.get("ai_improvements", [])

        # Sort improvements by impact score (highest first) and priority
        priority_order = {"high": 3, "medium": 2, "low": 1}
        improvements.sort(
            key=lambda x: (
                priority_order.get(x.get("priority", "low"), 1),
                x.get("impact_score", 0),
            ),
            reverse=True,
        )

        # Apply top improvements (limit to 5 to avoid overwhelming changes)
        applied_improvements = []
        improved_resume = resume_data.copy()

        for improvement in improvements[:5]:
            try:
                # Map category to strategy
                strategy_mapping = {
                    "professional_summary": "summary",
                    "quantified_achievements": "achievements",
                    "job_alignment": "keywords",
                    "career_transition": "experience",
                    "content_audit": "content",
                    "modern_format": "format",
                    "skills_enhancement": "skills",
                    "leadership_emphasis": "leadership",
                    "contact_optimization": "contact",
                    "ats_compatibility": "ats",
                }

                strategy = strategy_mapping.get(
                    improvement.get("category", "").lower().replace(" ", "_"), "content"
                )

                # Generate improvement using AI improvement agent
                if openai_client:
                    result = await improvement_agent.apply_ats_improvement(
                        improvement_title=improvement.get("title", ""),
                        improvement_description=improvement.get("description", ""),
                        specific_suggestion=improvement.get("specific_suggestion", ""),
                        improved_resume=str(improved_resume)[:2000],
                        job_description=payload.job_description[:500]
                        if payload.job_description
                        else None,
                    )

                    if result.get("success"):
                        updated_resume = result.get("improved_resume")
                        if updated_resume:
                            improved_resume = updated_resume
                            applied_improvements.append(improvement)
                            logger.info(
                                f"Applied improvement: {improvement.get('title', '')}"
                            )
                    else:
                        logger.warning(
                            f"Failed to apply improvement: {improvement.get('title', '')} - {result.get('error', 'Unknown error')}"
                        )
                        continue

            except Exception as e:
                logger.error(
                    f"Error applying improvement {improvement.get('title', '')}: {str(e)}"
                )
                continue

        # Calculate new ATS score
        # Automatically use industry-standard TF-IDF when job description is provided
        use_tfidf = bool(payload.job_description and payload.job_description.strip())
        new_result = enhanced_ats_checker.get_enhanced_ats_score(
            improved_resume, payload.job_description, use_industry_standard=use_tfidf
        )
        new_score = new_result.get("score", current_score)
        score_improvement = new_score - current_score

        logger.info(
            f"ATS score improved from {current_score} to {new_score} (+{score_improvement})"
        )

        return {
            "success": True,
            "improved_resume": improved_resume,
            "original_score": current_score,
            "new_score": new_score,
            "score_improvement": score_improvement,
            "applied_improvements": applied_improvements,
            "remaining_improvements": len(improvements) - len(applied_improvements),
        }

    except Exception as e:
        logger.error(f"Bulk ATS improvement error: {str(e)}")
        return {
            "success": False,
            "improved_resume": None,
            "score_improvement": 0,
            "applied_improvements": [],
            "error": str(e),
        }


@router.post("/apply_improvement")
async def apply_ai_improvement(payload: AIImprovementPayload):
    """Apply specific AI improvement to resume content"""
    try:
        logger.info(
            f"Processing AI improvement application for strategy: {payload.strategy}"
        )

        # Check if AI improvement engine is available
        if not ai_improvement_engine:
            return {
                "success": False,
                "improved_content": "",
                "suggestions": ["AI improvement engine is not available."],
                "error": "AI improvement engine not available",
            }

        # Convert ResumePayload to dict
        resume_data = {
            "name": payload.resume_data.name,
            "title": payload.resume_data.title,
            "email": payload.resume_data.email,
            "phone": payload.resume_data.phone,
            "location": payload.resume_data.location,
            "summary": payload.resume_data.summary,
            "sections": [
                {
                    "id": section.id,
                    "title": section.title,
                    "bullets": [
                        {"id": bullet.id, "text": bullet.text, "params": bullet.params}
                        for bullet in section.bullets
                    ],
                }
                for section in payload.resume_data.sections
            ],
        }

        # Generate improvement prompt for specific strategy
        if payload.strategy:
            # Map category names to strategy enum values
            strategy_mapping = {
                "summary": "professional_summary",
                "achievements": "quantified_achievements",
                "keywords": "job_alignment",
                "experience": "career_transition",
                "content": "content_audit",
                "format": "modern_format",
                "skills": "skills_enhancement",
                "leadership": "leadership_emphasis",
                "contact": "contact_optimization",
                "ats": "ats_compatibility",
            }

            # Get the mapped strategy name
            mapped_strategy = strategy_mapping.get(payload.strategy, payload.strategy)
            logger.info(f"Strategy mapping: {payload.strategy} -> {mapped_strategy}")

            try:
                strategy = ImprovementStrategy(mapped_strategy)
                prompt = ai_improvement_engine.generate_improvement_prompt(
                    strategy,
                    resume_data,
                    payload.job_description,
                    payload.target_role,
                    payload.industry,
                )

                # Use OpenAI to generate improved content
                if openai_client:
                    try:
                        response = openai_client["requests"].post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {openai_client['api_key']}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": openai_client["model"],
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": "You are an expert resume writer. Provide specific, actionable improvements to resume content.",
                                    },
                                    {"role": "user", "content": prompt},
                                ],
                                "max_tokens": OPENAI_MAX_TOKENS,
                                "temperature": 0.7,
                            },
                        )

                        if response.status_code == 200:
                            ai_response = response.json()
                            improved_content = ai_response["choices"][0]["message"]["content"]

                            return {
                                "success": True,
                                "improved_content": improved_content,
                                "strategy": payload.strategy,
                                "prompt_used": prompt,
                                "message": f"AI improvement applied for {payload.strategy} strategy",
                            }
                        else:
                            logger.error(f"OpenAI API error: {response.status_code}")
                            return {
                                "success": False,
                                "improved_content": "",
                                "suggestions": [
                                    "AI improvement generation failed. Please try again."
                                ],
                                "error": f"OpenAI API error: {response.status_code}",
                            }
                    except Exception as e:
                        logger.error(f"OpenAI request error: {str(e)}")
                        return {
                            "success": False,
                            "improved_content": "",
                            "suggestions": [
                                "AI improvement generation failed. Please try again."
                            ],
                            "error": str(e),
                        }
                else:
                    return {
                        "success": False,
                        "improved_content": "",
                        "suggestions": [
                            "OpenAI client not available. Please configure API key."
                        ],
                        "error": "OpenAI client not available",
                    }
            except ValueError:
                return {
                    "success": False,
                    "improved_content": "",
                    "suggestions": [
                        f"Invalid strategy: {payload.strategy}. Available strategies: {', '.join(strategy_mapping.keys())}"
                    ],
                    "error": f"Invalid strategy: {payload.strategy}. Mapped to: {mapped_strategy}",
                }
        else:
            return {
                "success": False,
                "improved_content": "",
                "suggestions": ["Please specify a strategy to apply."],
                "error": "No strategy specified",
            }

    except Exception as e:
        logger.error(f"AI improvement application error: {str(e)}")
        return {
            "success": False,
            "improved_content": "",
            "suggestions": ["Unable to apply AI improvement. Please try again."],
            "error": str(e),
        }


from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import re
import json
import logging
import secrets
from datetime import datetime
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))

openai_client = None
if OPENAI_API_KEY and OPENAI_API_KEY != "sk-your-openai-api-key-here":
    try:
        # Use requests library directly to avoid version compatibility issues
        import requests
        openai_client = {
            'api_key': OPENAI_API_KEY,
            'model': OPENAI_MODEL,
            'requests': requests
        }
        logger.info(f"OpenAI client initialized successfully with model: {OPENAI_MODEL}")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")
        logger.warning("AI features will be disabled due to client initialization error")
        openai_client = None
else:
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not found. AI features will be disabled.")
    else:
        logger.warning("OpenAI API key is still the placeholder value. Please set a real API key.")

app = FastAPI(title="editresume.io API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BulletParam(BaseModel):
    id: Optional[str] = None
    text: str
    params: Optional[Dict[str, str]] = {}

class Section(BaseModel):
    id: Optional[str] = None
    title: str
    bullets: List[BulletParam] = []

class ResumePayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    variant: Optional[str] = None

class ExportPayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    replacements: Optional[Dict[str, str]] = None
    template: Optional[str] = "tech"
    two_column_left: Optional[List[str]] = []
    two_column_right: Optional[List[str]] = []
    two_column_left_width: Optional[int] = 50

class LoginPayload(BaseModel):
    email: str
    password: str

class SignupPayload(BaseModel):
    email: str
    password: str
    name: str

class ImproveBulletPayload(BaseModel):
    bullet: str
    context: Optional[str] = None
    tone: Optional[str] = "professional"

class GenerateBulletPointsPayload(BaseModel):
    role: str
    company: str
    skills: str
    count: int = 5
    tone: Optional[str] = "professional"

class GenerateSummaryPayload(BaseModel):
    role: str
    years_experience: int
    skills: str
    achievements: Optional[str] = None

users_db = {}
user_stats = {}
payment_history = {}
PREMIUM_MODE = os.getenv("PREMIUM_MODE", "false").lower() == "true"

@app.get("/health")
async def health():
    openai_status = {
        "configured": OPENAI_API_KEY is not None,
        "model": OPENAI_MODEL if OPENAI_API_KEY else None,
        "client_ready": openai_client is not None
    }
    return {
        "status": "ok", 
        "db": os.getenv("DATABASE_URL", "unset"), 
        "premium_mode": PREMIUM_MODE,
        "openai": openai_status
    }

@app.post("/api/auth/signup")
async def signup(payload: SignupPayload):
    if payload.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    token = secrets.token_urlsafe(32)
    user = {
        "email": payload.email,
        "name": payload.name,
        "password": payload.password,
        "isPremium": not PREMIUM_MODE,
        "created_at": datetime.now().isoformat()
    }
    users_db[payload.email] = user
    
    logger.info(f"New user signup: {payload.email} (Premium: {user['isPremium']})")
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"]
        },
        "message": "Account created successfully"
    }

@app.post("/api/auth/login")
async def login(payload: LoginPayload):
    user = users_db.get(payload.email)
    
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = secrets.token_urlsafe(32)
    logger.info(f"User login: {payload.email}")
    
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"],
            "createdAt": user.get("created_at")
        },
        "message": "Login successful"
    }

@app.get("/api/user/profile")
async def get_profile(email: str):
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    stats = user_stats.get(email, {
        "resumesCreated": 0,
        "exportsThisMonth": 0,
        "totalExports": 0
    })
    
    return {
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"],
            "createdAt": user.get("created_at")
        },
        "stats": stats
    }

@app.get("/api/user/payment-history")
async def get_payment_history(email: str):
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    history = payment_history.get(email, [])
    
    if user["isPremium"] and not history:
        history = [{
            "id": "1",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "amount": "$9.99",
            "status": "Paid",
            "plan": "Premium Monthly"
        }]
    
    return {"payments": history}

@app.post("/api/user/upgrade")
async def upgrade_to_premium(payload: dict):
    email = payload.get("email")
    user = users_db.get(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["isPremium"]:
        raise HTTPException(status_code=400, detail="Already premium")
    
    user["isPremium"] = True
    
    if email not in payment_history:
        payment_history[email] = []
    
    payment_history[email].append({
        "id": str(len(payment_history[email]) + 1),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "amount": "$9.99",
        "status": "Paid",
        "plan": "Premium Monthly"
    })
    
    logger.info(f"User upgraded to premium: {email}")
    
    return {
        "user": {
            "email": user["email"],
            "name": user["name"],
            "isPremium": user["isPremium"]
        },
        "message": "Upgraded to premium successfully"
    }

@app.post("/api/user/track-export")
async def track_export(payload: dict):
    email = payload.get("email")
    if not email:
        return {"status": "ok"}
    
    if email not in user_stats:
        user_stats[email] = {
            "resumesCreated": 0,
            "exportsThisMonth": 0,
            "totalExports": 0
        }
    
    user_stats[email]["exportsThisMonth"] += 1
    user_stats[email]["totalExports"] += 1
    
    return {"status": "ok", "stats": user_stats[email]}

@app.delete("/api/user/account")
async def delete_account(email: str):
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    del users_db[email]
    if email in user_stats:
        del user_stats[email]
    if email in payment_history:
        del payment_history[email]
    
    logger.info(f"User account deleted: {email}")
    
    return {"message": "Account deleted successfully"}

# OpenAI AI Endpoints
@app.get("/api/openai/status")
async def get_openai_status():
    """Check OpenAI connection status"""
    if not OPENAI_API_KEY:
        return {
            "status": "disabled",
            "message": "OpenAI API key not configured",
            "configured": False
        }
    
    if not openai_client:
        return {
            "status": "error",
            "message": "OpenAI client not initialized",
            "configured": False
        }
    
    try:
        # Test the connection with a simple request using requests
        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 5
        }
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            tokens_used = result.get('usage', {}).get('total_tokens', 0)
            return {
                "status": "connected",
                "message": "OpenAI client is working",
                "configured": True,
                "model": OPENAI_MODEL,
                "tokens_used": tokens_used
            }
        else:
            return {
                "status": "error",
                "message": f"OpenAI API error: {response.status_code}",
                "configured": False
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"OpenAI connection failed: {str(e)}",
            "configured": False
        }

@app.post("/api/openai/improve-bullet")
async def improve_bullet(payload: ImproveBulletPayload):
    """Improve a bullet point using AI"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        tone_instructions = {
            "professional": "Use professional, corporate language with strong action verbs",
            "technical": "Use technical terminology and methodologies, focus on tools and processes",
            "formal": "Use formal, executive-level language with strategic focus",
            "casual": "Use conversational but workplace-appropriate language"
        }
        
        tone_instruction = tone_instructions.get(payload.tone, tone_instructions["professional"])
        
        context = f"Context: {payload.context}" if payload.context else ""
        
        prompt = f"""Improve this resume bullet point to be more impactful and ATS-optimized.

Current bullet: "{payload.bullet}"

{context}

Requirements:
- Make it more specific with metrics/numbers if possible
- Use strong action verbs
- Focus on achievements and impact
- Keep it concise (1-2 lines)
- {tone_instruction}
- ATS-friendly format

Return ONLY the improved bullet point, no explanations."""

        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": OPENAI_MAX_TOKENS,
            "temperature": 0.7
        }
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        
        result = response.json()
        improved_bullet = result['choices'][0]['message']['content'].strip()
        
        return {
            "success": True,
            "original": payload.bullet,
            "improved": improved_bullet,
            "tokens_used": result.get('usage', {}).get('total_tokens', 0),
            "tone": payload.tone
        }
        
    except Exception as e:
        logger.error(f"OpenAI improve bullet error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to improve bullet: {str(e)}")

@app.post("/api/ai/generate_bullet_points")
async def generate_bullet_points(payload: GenerateBulletPointsPayload):
    """Generate bullet points from scratch using AI"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        tone_instructions = {
            "professional": "Use professional, corporate language with strong action verbs",
            "technical": "Use technical terminology and methodologies, focus on tools and processes",
            "formal": "Use formal, executive-level language with strategic focus",
            "casual": "Use conversational but workplace-appropriate language"
        }
        
        tone_instruction = tone_instructions.get(payload.tone, tone_instructions["professional"])
        
        prompt = f"""Generate {payload.count} professional resume bullet points for this role:

Role: {payload.role}
Company: {payload.company}
Skills: {payload.skills}

Requirements:
- Include specific metrics/numbers where possible (use realistic examples)
- Use strong action verbs
- Focus on achievements and impact
- Each bullet should be 1-2 lines
- {tone_instruction}
- ATS-friendly format
- Make them diverse and cover different aspects of the role

Return ONLY the bullet points, one per line, no numbering or explanations."""

        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": OPENAI_MAX_TOKENS,
            "temperature": 0.7
        }
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        
        result = response.json()
        bullet_points_text = result['choices'][0]['message']['content'].strip()
        bullet_points = [line.strip() for line in bullet_points_text.split('\n') if line.strip()]
        
        return {
            "success": True,
            "bullet_points": bullet_points,
            "count": len(bullet_points),
            "tokens_used": result.get('usage', {}).get('total_tokens', 0),
            "role": payload.role,
            "company": payload.company,
            "tone": payload.tone
        }
        
    except Exception as e:
        logger.error(f"OpenAI generate bullet points error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate bullet points: {str(e)}")

@app.post("/api/ai/generate_summary")
async def generate_summary(payload: GenerateSummaryPayload):
    """Generate professional resume summary using AI"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        achievements = f"Key achievements: {payload.achievements}" if payload.achievements else ""
        
        context = f"""
Role: {payload.role}
Experience: {payload.years_experience} years
Skills: {payload.skills}
{achievements}

Requirements:
- Concise and impactful (50-80 words)
- Highlight key strengths and value proposition
- Include relevant technical skills and experience
- ATS-optimized with industry keywords
- Professional tone
- Focus on achievements and impact

Return ONLY the summary text, no explanations or labels."""

        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [{"role": "user", "content": context}],
            "max_tokens": OPENAI_MAX_TOKENS,
            "temperature": 0.7
        }
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        
        result = response.json()
        summary = result['choices'][0]['message']['content'].strip()
        
        return {
            "success": True,
            "summary": summary,
            "tokens_used": result.get('usage', {}).get('total_tokens', 0)
        }
    except Exception as e:
        logger.error(f"OpenAI generate summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@app.post("/api/ai/generate_bullet_from_keywords")
async def generate_bullet_from_keywords(payload: dict):
    """Generate bullet points from keywords and company context"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        keywords = payload.get('keywords', '')
        company_title = payload.get('company_title', '')
        job_title = payload.get('job_title', '')
        
        if not keywords:
            raise HTTPException(status_code=400, detail="Keywords are required")
        
        context = f"""Generate a professional bullet point for a resume based on these keywords and context:

Company: {company_title}
Job Title: {job_title}
Keywords: {keywords}

Requirements:
- Create ONE professional bullet point
- Use action-oriented language (managed, implemented, developed, etc.)
- Include specific technologies/tools if mentioned in keywords
- Make it achievement-focused with metrics if possible
- 1-2 lines maximum
- Professional tone
- ATS-optimized

Return ONLY the bullet point text, no explanations or labels."""

        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a professional resume writer. Create compelling bullet points that highlight achievements and technical skills."},
                    {"role": "user", "content": context}
                ],
                "max_tokens": 150,
                "temperature": 0.7
            },
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="AI service error")
        
        result = response.json()
        bullet_text = result['choices'][0]['message']['content'].strip()
        
        # Clean up the response
        bullet_text = bullet_text.replace('•', '').replace('*', '').strip()
        
        return {
            "success": True,
            "bullet_text": bullet_text,
            "keywords_used": keywords,
            "company_title": company_title,
            "job_title": job_title,
            "tokens_used": result.get('usage', {}).get('total_tokens', 0)
        }
        
    except Exception as e:
        logger.error(f"OpenAI generate bullet from keywords error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@app.post("/api/ai/generate_summary_from_experience")
async def generate_summary_from_experience(payload: dict):
    """Generate ATS-optimized professional summary by analyzing work experience"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        name = payload.get('name', 'Professional')
        title = payload.get('title', '')
        sections = payload.get('sections', [])
        
        # Extract work experience
        work_experience_text = ""
        skills_text = ""
        
        for section in sections:
            section_title = section.get('title', '').lower()
            bullets = section.get('bullets', [])
            
            if 'experience' in section_title or 'work' in section_title or 'employment' in section_title:
                work_experience_text += f"\n{section.get('title')}:\n"
                for bullet in bullets:
                    bullet_text = bullet.get('text', '') if isinstance(bullet, dict) else str(bullet)
                    if bullet_text.strip():
                        work_experience_text += f"  {bullet_text}\n"
            
            if 'skill' in section_title:
                for bullet in bullets:
                    bullet_text = bullet.get('text', '') if isinstance(bullet, dict) else str(bullet)
                    if bullet_text.strip():
                        skills_text += f"{bullet_text}, "
        
        context = f"""Analyze this professional's work experience and create a compelling ATS-optimized professional summary.

Professional Title: {title if title else 'Not specified'}

Work Experience:
{work_experience_text if work_experience_text else 'Limited information provided'}

Skills:
{skills_text if skills_text else 'To be extracted from experience'}

Requirements for the Professional Summary:
1. Length: 6-7 sentences (approximately 100-120 words)
2. ATS-Optimized: Include relevant keywords from their experience and industry
3. Structure:
   - Sentence 1: Opening statement with years of experience and core expertise
   - Sentences 2-4: Key achievements, skills, and value proposition with specific metrics when available
   - Sentences 5-6: Technical competencies and areas of expertise
   - Sentence 7: Career objective or unique value add
4. Include specific technologies, tools, and methodologies mentioned in experience
5. Use action-oriented language and quantifiable achievements
6. Professional, confident tone
7. Third-person perspective (avoid "I")
8. Focus on impact and results
9. Include industry-specific keywords for ATS systems

Return ONLY the professional summary paragraph, no labels, explanations, or formatting markers."""

        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [
                {"role": "system", "content": "You are an expert resume writer specializing in ATS-optimized professional summaries. You analyze work experience to create compelling, keyword-rich summaries that pass ATS systems and impress recruiters."},
                {"role": "user", "content": context}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        logger.info(f"Generating summary from experience for: {name}")
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        
        result = response.json()
        summary = result['choices'][0]['message']['content'].strip()
        
        # Remove any quotes or formatting markers
        summary = summary.strip('"\'')
        
        logger.info(f"Generated summary: {len(summary)} characters")
        
        return {
            "success": True,
            "summary": summary,
            "tokens_used": result.get('usage', {}).get('total_tokens', 0),
            "word_count": len(summary.split())
        }
    except Exception as e:
        logger.error(f"OpenAI generate summary from experience error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@app.post("/api/ai/generate_resume_content")
async def generate_resume_content(payload: dict):
    """Generate resume content based on user requirements"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service not available")
    
    try:
        content_type = payload.get('contentType', 'job')
        requirements = payload.get('requirements', '')
        position = payload.get('position', 'end')
        target_section = payload.get('targetSection', '')
        existing_data = payload.get('existingData', {})
        context = payload.get('context', {})
        
        # Build context from existing resume data
        existing_context = f"""
        Current Resume:
        Name: {context.get('name', '')}
        Title: {context.get('title', '')}
        Existing Sections: {', '.join(context.get('currentSections', []))}
        """
        
        # Generate content based on type
        if content_type == 'job':
            prompt = f"""
            Based on the following requirements, generate a complete work experience entry:
            
            Requirements: {requirements}
            Position: {position}
            {existing_context}
            
            Generate a REALISTIC work experience entry with:
            1. Company name (use a real tech company like Google, Microsoft, Amazon, etc.)
            2. Job title/role (specific to the requirements)
            3. Duration (realistic timeframe like "2022-2024" or "Jan 2023 - Present")
            4. 4-6 professional bullet points with:
               - Action verbs and quantifiable results
               - Technical skills mentioned in requirements
               - ATS-optimized language
               - Progressive responsibility
            
            IMPORTANT: 
            - Use REAL company names, not placeholders
            - Use REAL job titles, not generic ones
            - Use REAL timeframes, not placeholders
            - Make bullet points specific and detailed
            
            Return ONLY valid JSON with fields: company, role, duration, bullets (array of strings)
            
            Example format:
            {
              "company": "Google",
              "role": "DevOps Engineer", 
              "duration": "2022-2024",
              "bullets": ["Deployed applications using Kubernetes", "Managed CI/CD pipelines"]
            }
            """
        elif content_type == 'project':
            prompt = f"""
            Based on the following requirements, generate a project entry:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate a project entry with:
            1. Project name
            2. Brief description
            3. 3-5 bullet points with:
               - Technical implementation details
               - Technologies used
               - Results/impact
               - Challenges overcome
            
            Return as JSON with fields: name, description, bullets (array of strings)
            """
        elif content_type == 'skill':
            prompt = f"""
            Based on the following requirements, generate a skills section:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate a skills section with:
            1. Categorized skills (Technical, Tools, Languages, etc.)
            2. Relevant to the person's background
            3. Industry-standard terminology
            4. ATS-friendly format
            
            Return as JSON with fields: categories (object with category names as keys and skill arrays as values)
            """
        elif content_type == 'education':
            prompt = f"""
            Based on the following requirements, generate an education entry:
            
            Requirements: {requirements}
            {existing_context}
            
            Generate an education entry with:
            1. Institution name
            2. Degree/qualification
            3. Relevant coursework (if applicable)
            4. Graduation year
            5. Any honors or achievements
            
            Return as JSON with fields: institution, degree, year, coursework (array), honors (array)
            """
        else:
            raise HTTPException(status_code=400, detail="Invalid content type")
        
        headers = {
            "Authorization": f"Bearer {openai_client['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": openai_client['model'],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        response = openai_client['requests'].post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        logger.info(f"OpenAI response content: {content}")
        
        # Try to parse as JSON
        try:
            import json
            parsed_content = json.loads(content)
            logger.info(f"Parsed JSON content: {parsed_content}")
            return parsed_content
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")
            logger.warning(f"Raw content: {content}")
            
            # Try to extract JSON from the content if it's wrapped in markdown
            import re
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                try:
                    parsed_content = json.loads(json_match.group(1))
                    logger.info(f"Extracted JSON from markdown: {parsed_content}")
                    return parsed_content
                except json.JSONDecodeError:
                    pass
            
            # If all else fails, create a structured response based on content type
            if content_type == 'job':
                return {
                    "company": "Generated Company",
                    "role": "Generated Role", 
                    "duration": "2023-2024",
                    "bullets": [content]
                }
            else:
                return {"content": content}
            
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

TEMPLATES = {
    "tech": {
        "name": "Tech Professional",
        "industry": "Technology",
        "styles": {
            "header_align": "left",
            "header_border": "3px solid #2563eb",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "healthcare": {
        "name": "Healthcare Pro",
        "industry": "Healthcare",
        "styles": {
            "header_align": "center",
            "header_border": "2px solid #059669",
            "font": "Georgia, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    },
    "finance": {
        "name": "Finance Executive",
        "industry": "Finance",
        "styles": {
            "header_align": "center",
            "header_border": "3px solid #1e40af",
            "font": "Times New Roman, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    },
    "creative": {
        "name": "Creative Portfolio",
        "industry": "Marketing & Design",
        "styles": {
            "header_align": "left",
            "header_border": "none",
            "font": "Verdana, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "academic": {
        "name": "Academic Scholar",
        "industry": "Education",
        "styles": {
            "header_align": "center",
            "header_border": "1px solid #000",
            "font": "Times New Roman, serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "legal": {
        "name": "Legal Professional",
        "industry": "Legal",
        "styles": {
            "header_align": "center",
            "header_border": "2px solid #1e293b",
            "font": "Georgia, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    },
    "engineering": {
        "name": "Engineering Pro",
        "industry": "Engineering",
        "styles": {
            "header_align": "left",
            "header_border": "2px solid #ea580c",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "sales": {
        "name": "Sales Leader",
        "industry": "Sales",
        "styles": {
            "header_align": "left",
            "header_border": "3px solid #dc2626",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "consulting": {
        "name": "Consultant Elite",
        "industry": "Consulting",
        "styles": {
            "header_align": "center",
            "header_border": "2px solid #4338ca",
            "font": "Georgia, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    },
    "hr": {
        "name": "HR Professional",
        "industry": "Human Resources",
        "styles": {
            "header_align": "left",
            "header_border": "2px solid #7c3aed",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "operations": {
        "name": "Operations Manager",
        "industry": "Operations",
        "styles": {
            "header_align": "left",
            "header_border": "2px solid #0891b2",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "customer": {
        "name": "Customer Success",
        "industry": "Customer Service",
        "styles": {
            "header_align": "center",
            "header_border": "2px solid #06b6d4",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "data": {
        "name": "Data Scientist",
        "industry": "Data & Analytics",
        "styles": {
            "header_align": "left",
            "header_border": "2px solid #8b5cf6",
            "font": "Courier New, monospace",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "product": {
        "name": "Product Manager",
        "industry": "Product",
        "styles": {
            "header_align": "left",
            "header_border": "3px solid #ec4899",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "executive": {
        "name": "Executive Leader",
        "industry": "Executive",
        "styles": {
            "header_align": "center",
            "header_border": "3px solid #1e293b",
            "font": "Georgia, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    }
}

@app.get("/api/resume/templates")
async def get_templates():
    return {
        "templates": [
            {"id": tid, "name": t["name"], "industry": t.get("industry", "General")} 
            for tid, t in TEMPLATES.items()
        ]
    }

@app.post("/api/resume/parse-text")
async def parse_text(payload: dict):
    try:
        text = payload.get("text", "")
        
        if not text.strip():
            return {"success": False, "error": "No text provided"}
        
        logger.info(f"Parsing text: {len(text)} characters with AI")
        parsed_data = parse_resume_with_ai(text)
        
        return {
            "success": True,
            "data": parsed_data,
            "message": "Resume parsed with AI - sections automatically organized!"
        }
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/resume/preview")
async def preview_resume(payload: ResumePayload):
    assembled = f"{payload.name} — {payload.title}\n\n"
    if payload.summary:
        assembled += payload.summary + "\n\n"
    for s in payload.sections:
        assembled += s.title + "\n"
        for b in s.bullets:
            extra = []
            if b.metric: extra.append(b.metric)
            if b.tool: extra.append(b.tool)
            meta = f" ({', '.join(extra)})" if extra else ""
            assembled += f"• {b.text}{meta}\n"
        assembled += "\n"
    return {"variant": payload.variant or "default", "preview_text": assembled}

def apply_replacements(text: str, replacements: Dict[str, str]) -> str:
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text

def format_bold_text(text: str) -> str:
    """Convert **text** to <strong>text</strong> for HTML"""
    return text.replace('**', '<strong>').replace('**', '</strong>')

def format_work_experience_bullets(bullets, replacements):
    """Format work experience bullets with proper company headers and tasks"""
    html_parts = []
    current_company = None
    
    for bullet in bullets:
        if not bullet.text.strip():
            # Empty separator - add spacing
            html_parts.append('<div class="job-separator"></div>')
            continue
            
        bullet_text = apply_replacements(bullet.text, replacements)
        
        # Check if this is a company header (starts with **)
        if bullet_text.startswith('**') and '**' in bullet_text[2:]:
            # Company header - extract company name and format
            company_text = bullet_text.replace('**', '').strip()
            html_parts.append(f'<div class="job-entry"><div class="company-name">{company_text}</div>')
            current_company = company_text
        else:
            # Regular task bullet - remove any existing bullet points
            task_text = bullet_text.replace('•', '').replace('*', '').strip()
            if task_text:
                html_parts.append(f'<li>{task_text}</li>')
    
    # Close the last job entry if needed
    if current_company:
        html_parts.append('</div>')
    
    return '\n'.join(html_parts)

def format_regular_bullets(bullets, replacements):
    """Format regular section bullets"""
    html_parts = []
    
    for bullet in bullets:
        if bullet.text.strip():
            bullet_text = apply_replacements(bullet.text, replacements)
            # Remove any existing bullet points and format
            clean_text = bullet_text.replace('•', '').replace('*', '').strip()
            if clean_text:
                html_parts.append(f'<li>{format_bold_text(clean_text)}</li>')
    
    return '\n'.join(html_parts)

@app.post("/api/resume/export/pdf")
async def export_pdf(payload: ExportPayload):
    try:
        from weasyprint import HTML
        from io import BytesIO
        
        replacements = payload.replacements or {}
        template_id = payload.template or "tech"
        template_style = TEMPLATES.get(template_id, TEMPLATES["tech"])
        
        logger.info(f"Exporting PDF with template: {template_id}")
        logger.info(f"Template style: {template_style}")
        logger.info(f"Two-column settings: left={payload.two_column_left}, right={payload.two_column_right}, width={payload.two_column_left_width}")
        
        font_family = template_style["styles"]["font"]
        header_align = template_style["styles"]["header_align"]
        header_border = template_style["styles"]["header_border"]
        section_uppercase = "text-transform: uppercase;" if template_style["styles"]["section_uppercase"] else ""
        layout = template_style["styles"]["layout"]
        
        # Build HTML content sections
        contact_info = apply_replacements(payload.email or '', replacements)
        if payload.phone:
            contact_info += ' • ' + apply_replacements(payload.phone, replacements)
        if payload.location:
            contact_info += ' • ' + apply_replacements(payload.location, replacements)
        
        # Build sections HTML
        if layout == 'two-column':
            left_sections_html = ""
            right_sections_html = ""
            
            # Summary will be handled as part of section distribution
            # Don't add it separately here
            
            # Use localStorage configuration if provided, otherwise fallback to alternating
            left_section_ids = set(payload.two_column_left or [])
            right_section_ids = set(payload.two_column_right or [])
            
            # If no configuration provided, use alternating logic
            if not left_section_ids and not right_section_ids:
                for i, s in enumerate(payload.sections):
                    section_title = s.title.lower()
                    is_work_experience = 'experience' in section_title or 'work' in section_title or 'employment' in section_title
                    
                    if is_work_experience:
                        bullets_html = format_work_experience_bullets(s.bullets, replacements)
                        section_html = f'''
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            {bullets_html}
                        </div>'''
                    else:
                        bullets_html = format_regular_bullets(s.bullets, replacements)
                        section_html = f'''
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            <ul>
                                {bullets_html}
                            </ul>
                        </div>'''
                    
                    if i % 2 == 0:
                        left_sections_html += section_html
                    else:
                        right_sections_html += section_html
            else:
                # Use provided configuration
                for s in payload.sections:
                    section_title = s.title.lower()
                    is_work_experience = 'experience' in section_title or 'work' in section_title or 'employment' in section_title
                    
                    if is_work_experience:
                        bullets_html = format_work_experience_bullets(s.bullets, replacements)
                        section_html = f'''
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            {bullets_html}
                        </div>'''
                    else:
                        bullets_html = format_regular_bullets(s.bullets, replacements)
                        section_html = f'''
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            <ul>
                                {bullets_html}
                            </ul>
                        </div>'''
                    
                    if s.id and s.id in left_section_ids:
                        left_sections_html += section_html
                    elif s.id and s.id in right_section_ids:
                        right_sections_html += section_html
            
            # Calculate column widths with spacing
            left_width = payload.two_column_left_width or 50
            right_width = 100 - left_width
            
            # Adjust for spacing between columns (2% gap)
            gap = 2
            left_width_adjusted = left_width - (gap / 2)
            right_width_adjusted = right_width - (gap / 2)
            
            content_html = f'''
            <div class="two-column">
                <div class="column" style="width: {left_width_adjusted}%; margin-right: {gap}%;">{left_sections_html}</div>
                <div class="column" style="width: {right_width_adjusted}%;">{right_sections_html}</div>
                <div class="clearfix"></div>
            </div>'''
        else:
            # Single column layout
            summary_html = f'<div class="summary">{apply_replacements(payload.summary, replacements)}</div>' if payload.summary else ''
            sections_html = ''
            for s in payload.sections:
                section_title = s.title.lower()
                is_work_experience = 'experience' in section_title or 'work' in section_title or 'employment' in section_title
                
                if is_work_experience:
                    bullets_html = format_work_experience_bullets(s.bullets, replacements)
                    sections_html += f'''
                    <div class="section">
                        <h2>{apply_replacements(s.title, replacements)}</h2>
                        {bullets_html}
                    </div>'''
                else:
                    bullets_html = format_regular_bullets(s.bullets, replacements)
                    sections_html += f'''
                    <div class="section">
                        <h2>{apply_replacements(s.title, replacements)}</h2>
                        <ul>
                            {bullets_html}
                        </ul>
                    </div>'''
            content_html = summary_html + sections_html
        
        html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{ size: A4; margin: 2cm; }}
        body {{ font-family: {font_family}; font-size: 11pt; line-height: 1.4; color: #333; }}
        .header {{ text-align: {header_align}; border-bottom: {header_border}; padding-bottom: 10px; margin-bottom: 15px; }}
        .header h1 {{ margin: 0; font-size: 24pt; font-weight: bold; }}
        .header .title {{ font-size: 14pt; margin: 5px 0; color: #555; }}
        .header .contact {{ font-size: 10pt; color: #666; margin-top: 5px; }}
        .summary {{ margin-bottom: 15px; font-size: 10pt; line-height: 1.5; }}
        .section {{ margin-bottom: 15px; }}
        .section h2 {{ font-size: 12pt; font-weight: bold; {section_uppercase}
                       border-bottom: 1px solid #333; padding-bottom: 3px; margin-bottom: 8px; }}
        .section ul {{ margin: 0; padding-left: 20px; list-style-type: disc; }}
        .section li {{ margin-bottom: 6px; font-size: 10pt; }}
        .job-entry {{ margin-bottom: 20px; }}
        .company-name {{ font-weight: bold; font-size: 1.1em; color: #333; margin-bottom: 5px; margin-left: 0; }}
        .job-separator {{ height: 10px; }}
        .two-column {{ width: 100%; }}
        .column {{ float: left; }}
        .clearfix {{ clear: both; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{apply_replacements(payload.name, replacements)}</h1>
        <div class="title">{apply_replacements(payload.title, replacements)}</div>
        <div class="contact">{contact_info}</div>
    </div>
    {content_html}
</body>
</html>'''
        
        logger.info(f"Generated HTML length: {len(html_content)}")
        logger.info(f"Layout type: {layout}")
        
        pdf_bytes = HTML(string=html_content).write_pdf()
        logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resume.pdf"}
        )
    except Exception as e:
        logger.error(f"PDF export error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        from io import BytesIO
        
        contents = await file.read()
        filename = file.filename if file.filename else 'unknown'
        file_type = filename.split('.')[-1].lower() if '.' in filename else ''
        
        logger.info(f"Upload: filename={filename}, type={file_type}, content_type={file.content_type}, size={len(contents)}")
        
        magic_bytes = contents[:4]
        is_docx = magic_bytes == b'PK\x03\x04'
        is_pdf = contents[:5] == b'%PDF-'
        
        logger.info(f"File magic: is_docx={is_docx}, is_pdf={is_pdf}")
        
        text = ""
        actual_type = ""
        
        if is_docx or file_type in ['docx', 'doc'] or 'wordprocessingml' in str(file.content_type):
            logger.info("Processing as DOCX")
            actual_type = "DOCX"
            try:
                from docx import Document
                from docx.oxml.text.paragraph import CT_P
                from docx.oxml.table import CT_Tbl
                from docx.table import _Cell, Table
                from docx.text.paragraph import Paragraph
                
                docx_file = BytesIO(contents)
                doc = Document(docx_file)
                
                def extract_text_from_element(element):
                    elem_text = ""
                    if isinstance(element, Paragraph):
                        if element.text.strip():
                            elem_text += element.text + "\n"
                    elif isinstance(element, Table):
                        for row in element.rows:
                            for cell in row.cells:
                                for para in cell.paragraphs:
                                    if para.text.strip():
                                        elem_text += para.text + "\n"
                    return elem_text
                
                for element in doc.element.body:
                    if isinstance(element, CT_P):
                        para = Paragraph(element, doc)
                        if para.text.strip():
                            text += para.text + "\n"
                    elif isinstance(element, CT_Tbl):
                        table = Table(element, doc)
                        for row in table.rows:
                            for cell in row.cells:
                                for para in cell.paragraphs:
                                    if para.text.strip():
                                        text += para.text + "\n"
                
                for section in doc.sections:
                    if section.header:
                        for para in section.header.paragraphs:
                            if para.text.strip():
                                text += para.text + "\n"
                    if section.footer:
                        for para in section.footer.paragraphs:
                            if para.text.strip():
                                text += para.text + "\n"
                
                logger.info(f"DOCX extracted {len(text)} characters from {len(doc.paragraphs)} paragraphs")
            except Exception as docx_error:
                logger.error(f"DOCX error: {str(docx_error)}")
                return {
                    "success": False,
                    "error": f"Could not read DOCX file: {str(docx_error)}"
                }
        
        elif is_pdf or file_type == 'pdf' or file.content_type == 'application/pdf':
            logger.info("Processing as PDF")
            actual_type = "PDF"
            try:
                import pdfplumber
                pdf_file = BytesIO(contents)
                with pdfplumber.open(pdf_file) as pdf:
                    total_pages = len(pdf.pages)
                    logger.info(f"PDF has {total_pages} pages")
                    
                    for page_num, page in enumerate(pdf.pages, 1):
                        page_text = page.extract_text()
                        if page_text:
                            text += f"\n--- Page {page_num} ---\n"
                            text += page_text + "\n"
                            logger.info(f"Extracted {len(page_text)} characters from page {page_num}")
                
                logger.info(f"PDF extraction complete: {total_pages} pages, {len(text)} total characters")
            except Exception as pdf_error:
                error_msg = str(pdf_error)
                logger.error(f"PDF error: {error_msg}")
                if "Root object" in error_msg or "really a PDF" in error_msg:
                    return {
                        "success": False,
                        "error": "PDF file appears to be corrupted or invalid. Try:\n1. Re-saving the PDF from its original application\n2. Converting to DOCX first\n3. Or use manual entry"
                    }
                raise
        
        else:
            logger.warning(f"Unsupported file type: {file_type}")
            return {
                "success": False,
                "error": f"Unsupported file type: {file_type}. Please upload PDF or DOCX."
            }
        
        if not text.strip():
            logger.warning(f"No text extracted from {actual_type} file")
            return {
                "success": False,
                "error": f"Could not extract text from {actual_type} file. The file might be:\n• Empty\n• Using special formatting (text boxes)\n• Password protected\n\nPlease try exporting from Word as a new DOCX, or use manual entry."
            }
        
        logger.info("Using AI-powered parsing for better resume organization...")
        parsed_data = parse_resume_with_ai(text)
        
        return {
            "success": True,
            "data": parsed_data,
            "raw_text": text[:1000],
            "debug": {
                "file_type": file_type,
                "text_length": len(text),
                "has_content": bool(text.strip())
            }
        }
    except Exception as e:
        return {"success": False, "error": f"Upload failed: {str(e)}"}

def parse_resume_with_ai(text: str) -> Dict:
    """Use AI to intelligently parse and structure resume content"""
    if not openai_client:
        logger.warning("AI parsing not available, falling back to basic parsing")
        return parse_resume_text(text)
    
    try:
        prompt = f"""Parse this resume text and extract structured information. Return a JSON object with this exact structure:

{{
  "name": "Full Name",
  "title": "Professional Title or Current Role",
  "email": "email@example.com",
  "phone": "+1-234-567-8900",
  "location": "City, State/Country",
  "summary": "Professional summary or objective (2-3 sentences)",
  "sections": [
    {{
      "title": "Work Experience",
      "bullets": [
        "**Company Name / Job Title / Start Date - End Date**",
        "• Achievement or task for this role",
        "• Another achievement with metrics",
        "• Key responsibility or accomplishment",
        "",
        "**Another Company / Job Title / Start Date - End Date**",
        "• Achievement at this company",
        "• Another task or responsibility"
      ]
    }},
    {{
      "title": "Education",
      "bullets": [
        "Degree, Institution, Year",
        "GPA or honors if applicable"
      ]
    }},
    {{
      "title": "Skills",
      "bullets": [
        "Skill category: specific skills",
        "Another category: more skills"
      ]
    }}
  ]
}}

CRITICAL RULES FOR WORK EXPERIENCE:
1. Company/Job line MUST be: **Company Name / Job Title / Date Range** (with ** for bold)
2. Tasks/achievements MUST start with "• " (bullet point)
3. Separate different jobs with empty string ""
4. Extract complete date ranges (e.g., "Jan 2020 - Dec 2022" or "2020-2022")
5. Include ALL jobs from the resume

OTHER RULES:
6. Identify ALL sections (Education, Skills, Projects, Certifications, Awards, etc.)
7. Preserve important details (dates, technologies, metrics, achievements)
8. If something is missing (like phone or email), leave it as empty string
9. Professional summary should be concise (2-3 sentences max)
10. Return ONLY valid JSON, no markdown code blocks
11. This may be a MULTI-PAGE resume - extract ALL information from ALL pages
12. Include everything: all work experience, education, skills, projects, certifications

Resume Text (Full Content):
{text[:12000]}
"""

        # For very long resumes, use higher token limit
        resume_length = len(text)
        max_tokens_for_resume = min(4000, OPENAI_MAX_TOKENS) if resume_length > 8000 else OPENAI_MAX_TOKENS
        
        logger.info(f"Parsing resume: {resume_length} characters, using {max_tokens_for_resume} max tokens")

        response = openai_client['requests'].post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f"Bearer {openai_client['api_key']}",
                'Content-Type': 'application/json'
            },
            json={
                'model': openai_client['model'],
                'messages': [
                    {'role': 'system', 'content': 'You are a resume parsing expert. Extract structured information from multi-page resumes accurately. Capture ALL sections and information. Always return valid JSON.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'max_tokens': max_tokens_for_resume
            },
            timeout=45
        )
        
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return parse_resume_text(text)
        
        result = response.json()
        ai_response = result['choices'][0]['message']['content'].strip()
        
        ai_response = re.sub(r'^```json\s*', '', ai_response)
        ai_response = re.sub(r'\s*```$', '', ai_response)
        
        parsed_data = json.loads(ai_response)
        
        for i, section in enumerate(parsed_data.get('sections', [])):
            section['id'] = str(i)
            for j, bullet in enumerate(section.get('bullets', [])):
                if isinstance(bullet, str):
                    if 'bullets' not in section:
                        section['bullets'] = []
                    section['bullets'][j] = {
                        'id': f"{i}-{j}",
                        'text': bullet,
                        'params': {}
                    }
        
        parsed_data.setdefault('detected_variables', {})
        
        logger.info(f"AI parsing successful: {len(parsed_data.get('sections', []))} sections extracted")
        return parsed_data
        
    except json.JSONDecodeError as e:
        logger.error(f"AI returned invalid JSON: {e}")
        return parse_resume_text(text)
    except Exception as e:
        logger.error(f"AI parsing failed: {str(e)}")
        return parse_resume_text(text)

def parse_resume_text(text: str) -> Dict:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    data = {
        "name": "",
        "title": "",
        "email": "",
        "phone": "",
        "location": "",
        "summary": "",
        "sections": [],
        "detected_variables": {}
    }
    
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        data["email"] = email_match.group()
    
    phone_match = re.search(r'[\+\(]?[0-9][0-9 .\-\(\)]{8,}[0-9]', text)
    if phone_match:
        data["phone"] = phone_match.group()
    
    if lines:
        data["name"] = lines[0]
        if len(lines) > 1:
            data["title"] = lines[1]
    
    section_headers = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary']
    current_section = None
    current_bullets = []
    summary_lines = []
    
    for i, line in enumerate(lines[2:], start=2):
        line_lower = line.lower()
        
        if any(header in line_lower for header in section_headers):
            if current_section:
                data["sections"].append({
                    "id": str(len(data["sections"])),
                    "title": current_section,
                    "bullets": [{"id": str(j), "text": b, "params": {}} for j, b in enumerate(current_bullets)]
                })
            current_section = line
            current_bullets = []
        elif current_section:
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                bullet_text = re.sub(r'^[•\-\*]\s*', '', line)
                current_bullets.append(bullet_text)
            elif len(line) > 20 and not any(header in line_lower for header in section_headers):
                current_bullets.append(line)
        elif 'summary' in line_lower:
            pass
        elif not current_section and len(line) > 30:
            summary_lines.append(line)
    
    if current_section:
        data["sections"].append({
            "id": str(len(data["sections"])),
            "title": current_section,
            "bullets": [{"id": str(j), "text": b, "params": {}} for j, b in enumerate(current_bullets)]
        })
    
    if summary_lines:
        data["summary"] = " ".join(summary_lines)
    
    data["detected_variables"] = detect_parameterization(text)
    
    return data

def detect_parameterization(text: str) -> Dict[str, str]:
    variables = {}
    
    companies = re.findall(r'\b(?:at|for|with)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\b', text)
    if companies:
        most_common = max(set(companies), key=companies.count)
        variables["{{company}}"] = most_common
    
    percentages = re.findall(r'(\d+)%', text)
    if percentages:
        variables["{{metric}}"] = percentages[0]
    
    tech_keywords = ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Python', 'Java', 'React', 'Node.js']
    found_tech = [tech for tech in tech_keywords if tech in text]
    if found_tech:
        variables["{{tech}}"] = found_tech[0]
    
    return variables

@app.post("/api/resume/export/docx")
async def export_docx(payload: ExportPayload):
    try:
        from docx import Document
        from docx.shared import Pt, Inches, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from io import BytesIO
        
        replacements = payload.replacements or {}
        template_id = payload.template or "tech"
        template_style = TEMPLATES.get(template_id, TEMPLATES["tech"])
        
        logger.info(f"Exporting DOCX with template: {template_id}")
        logger.info(f"Template layout: {template_style['styles']['layout']}")
        logger.info(f"Two-column settings: left={payload.two_column_left}, right={payload.two_column_right}, width={payload.two_column_left_width}")
        
        layout = template_style["styles"]["layout"]
        
        doc = Document()
        
        section = doc.sections[0]
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
        name_para = doc.add_paragraph()
        name_run = name_para.add_run(apply_replacements(payload.name, replacements))
        name_run.font.size = Pt(18)
        name_run.font.bold = True
        name_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
        if template_style["styles"]["header_align"] == "center":
            name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        title_para = doc.add_paragraph()
        title_run = title_para.add_run(apply_replacements(payload.title, replacements))
        title_run.font.size = Pt(12)
        title_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
        if template_style["styles"]["header_align"] == "center":
            title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        contact_parts = []
        if payload.email:
            contact_parts.append(apply_replacements(payload.email, replacements))
        if payload.phone:
            contact_parts.append(apply_replacements(payload.phone, replacements))
        if payload.location:
            contact_parts.append(apply_replacements(payload.location, replacements))
        
        if contact_parts:
            contact_para = doc.add_paragraph(' • '.join(contact_parts))
            contact_para.runs[0].font.size = Pt(10)
            if template_style["styles"]["header_align"] == "center":
                contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        doc.add_paragraph()
        
        logger.info(f"Layout decision: layout='{layout}', is_two_column={layout == 'two-column'}")
        if layout == 'two-column':
            logger.info("Creating two-column layout")
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
            
            # Create a table for two-column layout
            table = doc.add_table(rows=1, cols=2)
            table.autofit = False
            table.allow_autofit = False
            
            # Remove table borders
            tbl = table._element
            tblPr = tbl.tblPr
            if tblPr is None:
                tblPr = OxmlElement('w:tblPr')
                tbl.insert(0, tblPr)
            
            tblBorders = OxmlElement('w:tblBorders')
            for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
                border = OxmlElement(f'w:{border_name}')
                border.set(qn('w:val'), 'none')
                border.set(qn('w:sz'), '0')
                border.set(qn('w:space'), '0')
                border.set(qn('w:color'), 'auto')
                tblBorders.append(border)
            tblPr.append(tblBorders)
            
            # Set column widths based on user preference
            left_width_percent = payload.two_column_left_width or 50
            right_width_percent = 100 - left_width_percent
            
            # Convert percentages to inches (assuming 8.5" total width)
            left_width_inches = (left_width_percent / 100) * 8.5
            right_width_inches = (right_width_percent / 100) * 8.5
            
            table.columns[0].width = Inches(left_width_inches)
            table.columns[1].width = Inches(right_width_inches)
            
            logger.info(f"Column widths: left={left_width_inches:.1f}\", right={right_width_inches:.1f}\"")
            
            # Left column
            left_cell = table.cell(0, 0)
            # Clear existing paragraphs in left cell
            for paragraph in left_cell.paragraphs:
                paragraph.clear()
            
            # Right column  
            right_cell = table.cell(0, 1)
            # Clear existing paragraphs in right cell
            for paragraph in right_cell.paragraphs:
                paragraph.clear()
            
            # Summary will be handled as part of section distribution
            # Don't add it separately here
            
            # Use localStorage configuration if provided, otherwise fallback to alternating
            left_section_ids = set(payload.two_column_left or [])
            right_section_ids = set(payload.two_column_right or [])
            
            logger.info(f"Section IDs from payload: left={left_section_ids}, right={right_section_ids}")
            logger.info(f"Available sections: {[s.id for s in payload.sections if s.id]}")  # Only log sections with IDs
            
            if not left_section_ids and not right_section_ids:
                # Use alternating logic if no configuration
                logger.info("Using alternating logic - no localStorage configuration provided")
                left_sections = [s for i, s in enumerate(payload.sections) if i % 2 == 0]
                right_sections = [s for i, s in enumerate(payload.sections) if i % 2 == 1]
            else:
                # Use provided configuration
                logger.info("Using localStorage configuration")
                left_sections = [s for s in payload.sections if s.id and s.id in left_section_ids]
                right_sections = [s for s in payload.sections if s.id and s.id in right_section_ids]
            
            logger.info(f"Final section distribution: left={[s.title for s in left_sections]}, right={[s.title for s in right_sections]}")
            logger.info(f"Left sections count: {len(left_sections)}, Right sections count: {len(right_sections)}")
            
            # Add sections to left column
            for s in left_sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()
                
                heading_para = left_cell.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    if not b.text.strip():  # Skip empty bullets
                        continue
                    bullet_text = apply_replacements(b.text, replacements)
                    bullet_para = left_cell.add_paragraph(style='List Bullet')
                    
                    # Handle bold text formatting
                    if '**' in bullet_text:
                        parts = bullet_text.split('**')
                        for i, part in enumerate(parts):
                            if i % 2 == 0:  # Regular text
                                if part.strip():
                                    run = bullet_para.add_run(part)
                                    run.font.size = Pt(10)
                            else:  # Bold text
                                run = bullet_para.add_run(part)
                                run.font.size = Pt(10)
                                run.font.bold = True
                    else:
                        run = bullet_para.add_run(bullet_text)
                        run.font.size = Pt(10)
                
                left_cell.add_paragraph()
            
            # Add sections to right column
            for s in right_sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()
                
                heading_para = right_cell.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    if not b.text.strip():  # Skip empty bullets
                        continue
                    bullet_text = apply_replacements(b.text, replacements)
                    bullet_para = right_cell.add_paragraph(style='List Bullet')
                    
                    # Handle bold text formatting
                    if '**' in bullet_text:
                        parts = bullet_text.split('**')
                        for i, part in enumerate(parts):
                            if i % 2 == 0:  # Regular text
                                if part.strip():
                                    run = bullet_para.add_run(part)
                                    run.font.size = Pt(10)
                            else:  # Bold text
                                run = bullet_para.add_run(part)
                                run.font.size = Pt(10)
                                run.font.bold = True
                    else:
                        run = bullet_para.add_run(bullet_text)
                        run.font.size = Pt(10)
                
                right_cell.add_paragraph()
        else:
            # Single column layout
            if payload.summary:
                summary_para = doc.add_paragraph(apply_replacements(payload.summary, replacements))
                summary_para.runs[0].font.size = Pt(10)
                doc.add_paragraph()
            
            for s in payload.sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()
                
                heading_para = doc.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    if not b.text.strip():  # Skip empty bullets
                        continue
                    bullet_text = apply_replacements(b.text, replacements)
                    bullet_para = doc.add_paragraph(style='List Bullet')
                    
                    # Handle bold text formatting
                    if '**' in bullet_text:
                        parts = bullet_text.split('**')
                        for i, part in enumerate(parts):
                            if i % 2 == 0:  # Regular text
                                if part.strip():
                                    run = bullet_para.add_run(part)
                                    run.font.size = Pt(10)
                            else:  # Bold text
                                run = bullet_para.add_run(part)
                                run.font.size = Pt(10)
                                run.font.bold = True
                    else:
                        run = bullet_para.add_run(bullet_text)
                        run.font.size = Pt(10)
                
                doc.add_paragraph()
        
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        docx_bytes = buffer.getvalue()
        logger.info(f"DOCX generated successfully, size: {len(docx_bytes)} bytes")
        
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=resume.docx"}
        )
    except Exception as e:
        logger.error(f"DOCX export error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# REAL-TIME COLLABORATION (WebSocket)
# ============================================================

class Comment(BaseModel):
    id: str
    user_name: str
    text: str
    timestamp: str
    target_type: str
    target_id: str
    resolved: bool = False

class CollaborationRoom:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, any]] = {}
        self.comments: Dict[str, List[Dict]] = {}
    
    def create_room(self, room_id: str):
        if room_id not in self.rooms:
            self.rooms[room_id] = {
                "connections": {},
                "resume_data": None,
                "last_update": datetime.now().isoformat()
            }
            self.comments[room_id] = []
            logger.info(f"Created collaboration room: {room_id}")
    
    def add_connection(self, room_id: str, user_id: str, websocket: WebSocket, user_name: str):
        self.create_room(room_id)
        
        # Remove any existing connection with the same user_id to prevent duplicates
        if user_id in self.rooms[room_id]["connections"]:
            logger.info(f"Replacing existing connection for user {user_name} ({user_id})")
        
        self.rooms[room_id]["connections"][user_id] = {
            "ws": websocket,
            "name": user_name,
            "joined_at": datetime.now().isoformat()
        }
        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")
    
    def remove_connection(self, room_id: str, user_id: str):
        if room_id in self.rooms and user_id in self.rooms[room_id]["connections"]:
            del self.rooms[room_id]["connections"][user_id]
            logger.info(f"User {user_id} left room {room_id}")
            if not self.rooms[room_id]["connections"]:
                del self.rooms[room_id]
                if room_id in self.comments:
                    del self.comments[room_id]
                logger.info(f"Room {room_id} is now empty and removed")
    
    def get_active_users(self, room_id: str) -> List[Dict]:
        if room_id not in self.rooms:
            return []
        return [
            {"user_id": uid, "name": conn["name"], "joined_at": conn["joined_at"]}
            for uid, conn in self.rooms[room_id]["connections"].items()
        ]
    
    async def broadcast(self, room_id: str, message: dict, exclude_user: str = None):
        if room_id not in self.rooms:
            return
        
        dead_connections = []
        for user_id, conn in self.rooms[room_id]["connections"].items():
            if exclude_user and user_id == exclude_user:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                dead_connections.append(user_id)
        
        for user_id in dead_connections:
            self.remove_connection(room_id, user_id)
    
    def add_comment(self, room_id: str, comment: Dict) -> Dict:
        self.create_room(room_id)
        comment_data = {
            **comment,
            "id": secrets.token_urlsafe(8),
            "timestamp": datetime.now().isoformat()
        }
        self.comments[room_id].append(comment_data)
        logger.info(f"Added comment in room {room_id}: {comment_data['id']}")
        return comment_data
    
    def get_comments(self, room_id: str, target_id: str = None) -> List[Dict]:
        if room_id not in self.comments:
            return []
        comments = self.comments[room_id]
        if target_id:
            return [c for c in comments if c.get("target_id") == target_id]
        return comments
    
    def resolve_comment(self, room_id: str, comment_id: str):
        if room_id in self.comments:
            for comment in self.comments[room_id]:
                if comment["id"] == comment_id:
                    comment["resolved"] = True
                    logger.info(f"Resolved comment {comment_id} in room {room_id}")
                    return True
        return False
    
    def delete_comment(self, room_id: str, comment_id: str):
        if room_id in self.comments:
            self.comments[room_id] = [c for c in self.comments[room_id] if c["id"] != comment_id]
            logger.info(f"Deleted comment {comment_id} from room {room_id}")
            return True
        return False

collab_manager = CollaborationRoom()

@app.get("/api/collab/room/create")
async def create_collab_room():
    room_id = secrets.token_urlsafe(8)
    collab_manager.create_room(room_id)
    return {"room_id": room_id, "url": f"/editor?room={room_id}"}

@app.get("/api/collab/room/{room_id}/users")
async def get_room_users(room_id: str):
    users = collab_manager.get_active_users(room_id)
    return {"room_id": room_id, "users": users, "count": len(users)}

@app.get("/api/collab/room/{room_id}/comments")
async def get_room_comments(room_id: str, target_id: str = None):
    comments = collab_manager.get_comments(room_id, target_id)
    return {"room_id": room_id, "comments": comments, "count": len(comments)}

@app.post("/api/collab/room/{room_id}/comments")
async def add_comment(room_id: str, comment: Comment):
    comment_data = collab_manager.add_comment(room_id, comment.dict())
    return {"success": True, "comment": comment_data}

@app.post("/api/collab/room/{room_id}/comments/{comment_id}/resolve")
async def resolve_comment_endpoint(room_id: str, comment_id: str):
    success = collab_manager.resolve_comment(room_id, comment_id)
    return {"success": success}

@app.delete("/api/collab/room/{room_id}/comments/{comment_id}")
async def delete_comment_endpoint(room_id: str, comment_id: str):
    success = collab_manager.delete_comment(room_id, comment_id)
    return {"success": success}

@app.websocket("/ws/collab/{room_id}")
async def websocket_collab(websocket: WebSocket, room_id: str):
    await websocket.accept()
    
    try:
        init_msg = await websocket.receive_json()
        user_id = init_msg.get("user_id", secrets.token_urlsafe(6))
        user_name = init_msg.get("user_name", "Anonymous")
        
        collab_manager.add_connection(room_id, user_id, websocket, user_name)
        
        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "active_users": active_users
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "resume_update":
                await collab_manager.broadcast(room_id, {
                    "type": "resume_update",
                    "user_id": user_id,
                    "user_name": user_name,
                    "data": data.get("data"),
                    "timestamp": datetime.now().isoformat()
                }, exclude_user=user_id)
            
            elif message_type == "cursor_position":
                await collab_manager.broadcast(room_id, {
                    "type": "cursor_position",
                    "user_id": user_id,
                    "user_name": user_name,
                    "position": data.get("position")
                }, exclude_user=user_id)
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif message_type == "add_comment":
                comment = collab_manager.add_comment(room_id, {
                    "user_name": user_name,
                    "text": data.get("text"),
                    "target_type": data.get("target_type"),
                    "target_id": data.get("target_id"),
                    "resolved": False
                })
                await collab_manager.broadcast(room_id, {
                    "type": "comment_added",
                    "comment": comment
                })
            
            elif message_type == "resolve_comment":
                comment_id = data.get("comment_id")
                collab_manager.resolve_comment(room_id, comment_id)
                await collab_manager.broadcast(room_id, {
                    "type": "comment_resolved",
                    "comment_id": comment_id
                })
            
            elif message_type == "delete_comment":
                comment_id = data.get("comment_id")
                collab_manager.delete_comment(room_id, comment_id)
                await collab_manager.broadcast(room_id, {
                    "type": "comment_deleted",
                    "comment_id": comment_id
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
        collab_manager.remove_connection(room_id, user_id)
        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(room_id, {
            "type": "user_left",
            "user_id": user_id,
            "user_name": user_name,
            "active_users": active_users
        })
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        collab_manager.remove_connection(room_id, user_id)
        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(room_id, {
            "type": "user_left",
            "user_id": user_id,
            "user_name": user_name,
            "active_users": active_users
        })


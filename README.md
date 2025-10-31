# Backend API - editresume.io

FastAPI backend providing resume editing, AI enhancements, and analytics.

## Architecture

- **FastAPI** with Python 3.12
- **PostgreSQL** for all environments (development, staging, production)
- **OpenAI API** for AI features
- **SQLAlchemy ORM** for database management

## Core Files

### `main.py` (4923+ lines)
Main FastAPI application with 59 endpoints:

**Auth Endpoints:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/user/profile` - Get user profile
- `POST /api/user/upgrade` - Upgrade to premium
- `DELETE /api/user/account` - Delete account

**AI Endpoints:**
- `POST /api/ai/ats_score` - Basic ATS compatibility scoring
- `POST /api/ai/enhanced_ats_score` - Advanced ATS with AI improvements
- `POST /api/ai/improvement_suggestions` - Get AI improvement strategies
- `POST /api/ai/grammar_check` - Grammar and style checking
- `POST /api/ai/match_job_description` - Resume-job matching
- `POST /api/ai/cover_letter` - Generate cover letters
- `POST /api/ai/generate_bullet_points` - AI bullet generation
- `POST /api/ai/generate_summary` - Generate professional summary
- `POST /api/ai/generate-work-experience` - Generate work experience entries

**Resume Endpoints:**
- `POST /api/resume/upload` - Upload & parse resume files
- `POST /api/resume/export/pdf` - Export as PDF
- `POST /api/resume/export/docx` - Export as DOCX
- `POST /api/resume/save` - Save resume to database
- `GET /api/resume/templates` - List available templates

**Version Control:**
- `POST /api/resume/version/create` - Create version snapshot
- `GET /api/resume/{id}/versions` - List all versions
- `POST /api/resume/version/rollback` - Restore version
- `POST /api/resume/version/compare` - Compare two versions

**Analytics:**
- `GET /api/analytics/exports` - Export history
- `GET /api/analytics/job-matches` - Job matching history

**Collaboration (WebSocket):**
- Real-time collaboration rooms
- Comments and feedback system

### `database.py`
SQLAlchemy models and database setup:

**Tables:**
- `users` - User accounts with premium status
- `resumes` - Resume documents
- `resume_versions` - Version history snapshots
- `export_analytics` - PDF/DOCX export tracking
- `job_matches` - Job description matching results
- `shared_resumes` - Shareable resume links
- `resume_views` - View tracking for shared resumes
- `shared_resume_comments` - Comments on shared resumes

**Key Features:**
- Automatic table creation
- Relationship management
- PostgreSQL-only (production-ready)

### `ats_checker.py` & `enhanced_ats_checker.py`
ATS (Applicant Tracking System) compatibility analyzers:

**ATSChecker (Basic):**
- Section detection (contact, summary, experience, education, skills)
- Keyword density analysis
- Formatting issue detection
- Overall ATS score calculation

**EnhancedATSChecker:**
- All basic features plus:
- Industry-specific keyword detection
- Leadership keyword analysis
- Detailed improvement suggestions
- AI-powered recommendations
- Priority-based action items

### `ai_improvement_engine.py`
AI-powered resume improvement strategies:

**10 Improvement Strategies:**
1. Professional summary enhancement
2. Quantified achievements
3. Job alignment
4. Career transition support
5. Content audit
6. Modern formatting
7. Skills enhancement
8. Leadership emphasis
9. Contact optimization
10. ATS compatibility

### `grammar_checker.py`
Grammar and style analysis:
- Grammar error detection
- Style issue identification
- Readability scoring
- Professional tone checking
- Suggestion generation

### `keyword_extractor.py`
Keyword extraction for job matching:
- Technical keyword identification
- Action verb detection
- Skill extraction
- Industry term recognition

### `version_control.py`
Resume version management:
- Snapshot creation
- Change tracking
- Rollback functionality
- Version comparison

## AI Integration

**OpenAI Models:**
- Default: `gpt-4o-mini`
- Configurable via `OPENAI_MODEL` env var
- Fallback to non-AI features if API unavailable

**Usage:**
AI endpoints check for `OPENAI_API_KEY` environment variable and gracefully degrade when unavailable.

## Dependencies

See `requirements.txt`:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `openai` - AI integration
- `weasyprint` - PDF generation
- `python-docx` - DOCX generation
- `pypdf2` - PDF parsing
- `nltk`, `sklearn`, `spacy` - NLP (optional)

## Environment Variables

```bash
# PostgreSQL connection string (REQUIRED)
DATABASE_URL=postgresql+psycopg2://username:password@host:5432/database

# OpenAI Configuration
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
```

## Testing

```bash
# Create test user
python backend/create_test_user.py

# Test API
curl http://localhost:8000/health
```

## Deployment

**Render.com:**
- Uses `Dockerfile.render`
- PostgreSQL database
- Auto-deploys on push

**Local:**
```bash
docker compose up backend
# or
uvicorn main:app --reload --port 8000
```


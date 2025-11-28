# Repository Map - editresume.io

**Generated:** 2025-01-27  
**Purpose:** Codebase structure analysis for cleanup and optimization

---

## Directory Tree

```
editresume-frontend/
├── backend/                          # FastAPI backend application
│   ├── app/                          # Main application package
│   │   ├── agents/                   # AI agent implementations
│   │   ├── api/                      # API route handlers
│   │   │   ├── jobs/                 # Job-related routes
│   │   │   └── resumes/              # Resume-related routes
│   │   ├── core/                     # Core infrastructure
│   │   ├── domain/                    # Domain logic (DDD structure)
│   │   ├── middleware/               # Request middleware
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   ├── prompts/                  # AI prompt templates
│   │   ├── services/                 # Business logic services
│   │   └── utils/                    # Utility functions
│   ├── ai_improvement_engine.py      # ⚠️ LEGACY wrapper
│   ├── ats_checker.py                # ⚠️ POTENTIAL DUPLICATE
│   ├── enhanced_ats_checker.py       # ⚠️ POTENTIAL DUPLICATE
│   ├── grammar_checker.py            # ⚠️ POTENTIAL DUPLICATE
│   ├── keyword_extractor.py          # ⚠️ POTENTIAL DUPLICATE
│   ├── main.py                       # ⚠️ LEGACY entrypoint (re-exports app.main)
│   ├── database.py                   # ⚠️ LEGACY compatibility module
│   ├── version_control.py             # ⚠️ UNKNOWN STATUS
│   ├── create_test_user.py           # ⚠️ DEV/SCRIPT
│   ├── test_backend_fixes.py         # ⚠️ TEST/SCRIPT
│   ├── run_*.py                      # Migration scripts
│   ├── migrate_*.sql                 # SQL migration files
│   └── requirements*.txt             # Python dependencies
│
├── frontend/                         # Next.js 14 frontend application
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── auth/                 # Authentication pages
│   │   │   ├── billing/              # Billing/subscription pages
│   │   │   ├── editor/               # ✅ Main editor (active)
│   │   │   ├── editor-v2/            # ⚠️ SUSPECT - No references found
│   │   │   ├── extension/            # Extension info page
│   │   │   ├── profile/              # User profile page
│   │   │   ├── shared/               # Shared resume pages
│   │   │   └── upload/               # Resume upload page
│   │   ├── components/               # React components
│   │   │   ├── AI/                   # AI-related components
│   │   │   ├── Editor/               # Editor components
│   │   │   ├── Resume/               # Resume-specific components
│   │   │   ├── home/                 # Landing page components
│   │   │   ├── layout/               # Layout components
│   │   │   └── Shared/               # Shared UI components
│   │   ├── contexts/                 # React Context providers
│   │   ├── features/                 # Feature modules (domain-driven)
│   │   │   ├── jobs/                 # Job management feature
│   │   │   ├── resume/               # Resume feature
│   │   │   └── resume-automation/    # Resume automation feature
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # Libraries & utilities
│   │   │   └── services/             # API service clients
│   │   └── utils/                    # Utility functions
│   ├── knip.config.js                # Dead code detection config
│   └── package.json
│
├── extension/                        # Chrome extension
│   ├── content.js                    # Content script
│   ├── service-worker.js             # Service worker
│   └── manifest.json                 # Extension manifest
│
├── docs/                             # Documentation
│   └── architecture.md               # Architecture docs
│
├── docker-compose*.yml               # Docker configurations
├── vercel.json                       # Vercel deployment config
└── env.example                       # Environment variable template
```

---

## Modules by Domain

### Frontend Domains

#### **Core Infrastructure**
- `src/contexts/` - Global state management (Auth, Settings, Modal)
- `src/lib/config.ts` - Configuration management
- `src/lib/firebaseClient.ts` - Firebase authentication client
- `src/lib/guestAuth.ts` - Guest authentication logic

#### **Resume Domain**
- `src/features/resume/` - Resume templates, customization, hooks
- `src/components/Resume/` - Resume-specific UI components
- `src/components/Editor/` - Editor UI components
- `src/lib/services/versionControl.ts` - Version control service
- `src/lib/services/sharedResume.ts` - Resume sharing service

#### **Job Domain**
- `src/features/jobs/` - Job management (saved jobs, API, hooks)
- `src/components/Editor/JobsView.tsx` - Jobs view component
- `src/lib/services/jobMatchAnalytics.ts` - Job matching analytics

#### **AI Domain**
- `src/components/AI/` - AI-powered features (ATS scoring, improvements, grammar, cover letters)
- `src/features/resume-automation/` - Automated resume generation

#### **Analytics Domain**
- `src/lib/services/exportAnalytics.ts` - Export tracking
- `src/lib/services/jobMatchAnalytics.ts` - Job match tracking
- `src/components/Resume/ExportAnalyticsDashboard.tsx`
- `src/components/AI/JobMatchAnalyticsDashboard.tsx`

### Backend Domains

#### **Core Infrastructure**
- `app/core/` - Configuration, database, dependencies, logging, security
- `app/middleware/` - Request middleware (Firebase auth)

#### **API Layer**
- `app/api/` - FastAPI route handlers
  - `ai.py` - AI endpoints (ATS, improvements, grammar, cover letters)
  - `auth.py` - Authentication endpoints
  - `firebase_auth.py` - Firebase authentication
  - `resume.py` - Resume CRUD operations
  - `resumes/routes.py` - Resume automation routes
  - `job.py` - Job description matching
  - `jobs/routes.py` - Job CRUD operations
  - `user.py` - User profile management
  - `stripe.py` - Payment processing
  - `collaboration.py` - Real-time collaboration (WebSocket)
  - `analytics.py` - Analytics endpoints
  - `models.py` - Pydantic request/response models

#### **Domain Layer (DDD)**
- `app/domain/jobs/` - Job domain logic (models, repositories, services)
- `app/domain/resume/` - Resume domain logic
- `app/domain/resume_matcher/` - Resume matching domain logic

#### **Service Layer**
- `app/services/` - Business logic services
  - `ai_improvement_engine.py` - AI improvement strategies
  - `ats_service.py` - ATS scoring
  - `enhanced_ats_service.py` - Enhanced ATS with AI
  - `grammar_service.py` - Grammar checking
  - `resume_export.py` - PDF/DOCX export
  - `resume_upload.py` - Resume parsing
  - `resume_automation.py` - Automated resume generation
  - `version_control_service.py` - Version management
  - `collaboration_service.py` - Real-time collaboration
  - `job_service.py` - Job management
  - `keyword_service.py` - Keyword extraction

#### **AI Agents**
- `app/agents/` - AI agent implementations
  - `improvement_agent.py` - Resume improvement agent
  - `grammar_agent.py` - Grammar checking agent
  - `job_matching_agent.py` - Job matching agent
  - `content_generation_agent.py` - Content generation agent
  - `cover_letter_agent.py` - Cover letter generation agent

#### **Data Layer**
- `app/models/` - SQLAlchemy ORM models
  - `user.py` - User model
  - `resume.py` - Resume model
  - `job.py` - Job description model
  - `match.py` - Job-resume matching model
  - `analytics.py` - Analytics models
  - `sharing.py` - Shared resume models

---

## Top Importers (Most Referenced Modules)

### Frontend

1. **`@/lib/config`** - Configuration (imported by 20+ files)
   - Used by: API clients, services, components
   - Purpose: Centralized API base URL and configuration

2. **`@/contexts/AuthContext`** - Authentication (imported by 15+ files)
   - Used by: Protected routes, components requiring auth
   - Purpose: User authentication state management

3. **`@/components/Editor/ModernEditorLayout`** - Editor layout
   - Used by: `editor/page.tsx`, `editor-v2/page.tsx`
   - Purpose: Main editor UI container

4. **`@/components/Resume/PreviewPanel`** - Resume preview
   - Used by: Editor pages, components
   - Purpose: Live resume preview

5. **`@/lib/services/versionControl`** - Version control
   - Used by: Editor, version control components
   - Purpose: Resume version management

### Backend

1. **`app.core.db`** - Database (imported by 30+ files)
   - Used by: All API routes, services, models
   - Purpose: Database session management, connection

2. **`app.core.dependencies`** - Dependency injection (imported by 20+ files)
   - Used by: API routes, services
   - Purpose: Shared dependencies (OpenAI client, agents, services)

3. **`app.api.models`** - Request/response models (imported by 15+ files)
   - Used by: All API route handlers
   - Purpose: Pydantic validation models

4. **`app.models`** - ORM models (imported by 20+ files)
   - Used by: API routes, services, repositories
   - Purpose: Database models

5. **`app.services.ai_improvement_engine`** - AI improvements (imported by 5+ files)
   - Used by: AI API routes, improvement agent
   - Purpose: Resume improvement strategies

---

## Shared Utilities

### Frontend

- **`src/lib/config.ts`** - Centralized configuration
- **`src/lib/firebaseClient.ts`** - Firebase initialization
- **`src/lib/guestAuth.ts`** - Guest authentication helpers
- **`src/lib/exportUtils.ts`** - Export utilities
- **`src/utils/sectionDeduplication.ts`** - Section deduplication logic

### Backend

- **`app/utils/`** - Utility modules
  - `resume_parsing.py` - PDF/DOCX parsing
  - `resume_formatting.py` - Resume formatting
  - `resume_templates.py` - Template definitions
  - `job_helpers.py` - Job-related helpers
  - `match_helpers.py` - Matching algorithm helpers

- **`app/core/`** - Core utilities
  - `config.py` - Settings management (Pydantic)
  - `db.py` - Database connection & session management
  - `logging.py` - Logging configuration
  - `security.py` - Security utilities
  - `openai_client.py` - OpenAI client initialization

---

## Module Classification

### ✅ **CORE** - Essential, actively used

**Frontend:**
- `src/app/editor/` - Main editor route
- `src/components/Editor/` - Editor components
- `src/components/Resume/` - Resume components
- `src/contexts/` - Context providers
- `src/lib/config.ts` - Configuration
- `src/lib/firebaseClient.ts` - Firebase client
- `src/features/resume/` - Resume feature module
- `src/features/jobs/` - Jobs feature module

**Backend:**
- `app/main.py` - Application entry point
- `app/core/` - Core infrastructure
- `app/api/` - API routes
- `app/models/` - Database models
- `app/services/` - Business logic
- `app/domain/` - Domain logic
- `app/agents/` - AI agents

### 🎯 **FEATURE** - Feature-specific, actively used

**Frontend:**
- `src/features/resume-automation/` - Resume automation
- `src/components/AI/` - AI-powered features
- `src/app/billing/` - Billing pages
- `src/app/shared/` - Shared resume pages
- `src/app/profile/` - User profile

**Backend:**
- `app/api/collaboration.py` - Collaboration features
- `app/api/analytics.py` - Analytics endpoints
- `app/services/collaboration_service.py`
- `app/services/version_control_service.py`

### ⚠️ **LEGACY** - Backward compatibility, may be removable

**Backend:**
- `backend/ai_improvement_engine.py` - Legacy wrapper (re-exports `app.services.ai_improvement_engine`)
- `backend/main.py` - Legacy entrypoint (re-exports `app.main`)
- `backend/database.py` - Legacy compatibility module (re-exports `app.core.db` and `app.models`)
- `backend/version_control.py` - Status unknown, needs investigation
- `app/main.py` - Legacy routes: `/api/openai/status`, `/api/openai/improve-bullet`, `/matches/{match_id}`

### 🚨 **SUSPECT** - Potentially unused or duplicate

**Frontend:**
- `src/app/editor-v2/` - **NO REFERENCES FOUND** - Appears to be unused alternative editor
- `src/app/editor-v2/layout.tsx` - Empty layout wrapper
- `src/app/editor-v2/page.tsx` - Simplified editor implementation

**Backend:**
- `backend/ats_checker.py` - Potential duplicate of `app/services/ats_service.py`
- `backend/enhanced_ats_checker.py` - Potential duplicate of `app/services/enhanced_ats_service.py`
- `backend/grammar_checker.py` - Potential duplicate of `app/services/grammar_service.py`
- `backend/keyword_extractor.py` - Potential duplicate of `app/services/keyword_service.py`

### 🧪 **DEV/SCRIPT** - Development/testing tools

**Backend:**
- `backend/create_test_user.py` - Test user creation script
- `backend/test_backend_fixes.py` - Test script
- `backend/run_*.py` - Migration scripts
- `backend/migrate_*.sql` - SQL migration files

---

## Suspicious Directories & Files

### High Priority (Likely Safe to Remove/Archive)

1. **`frontend/src/app/editor-v2/`** ⚠️
   - **Status:** No imports/references found
   - **Evidence:** `grep` search found 0 references to `editor-v2`
   - **Action:** Verify with `knip` and `ts-prune`, then archive or remove
   - **Risk:** Low (no references found)

2. **`backend/ai_improvement_engine.py`** ⚠️
   - **Status:** Legacy wrapper (only re-exports)
   - **Evidence:** Only contains `from app.services.ai_improvement_engine import *`
   - **Action:** Remove if no external scripts depend on it
   - **Risk:** Medium (check for external imports)

3. **`backend/main.py`** ⚠️
   - **Status:** Legacy entrypoint wrapper
   - **Evidence:** Only re-exports `app.main.app`
   - **Action:** Verify Render/ASGI server doesn't depend on it
   - **Risk:** Medium (deployment dependency)

4. **`backend/database.py`** ⚠️
   - **Status:** Legacy compatibility module
   - **Evidence:** Re-exports from `app.core.db` and `app.models`
   - **Action:** Check for external scripts using it, then remove
   - **Risk:** Low (internal compatibility only)

### Medium Priority (Needs Investigation)

5. **`backend/ats_checker.py`** ⚠️
   - **Status:** Potential duplicate
   - **Action:** Compare with `app/services/ats_service.py`, verify usage
   - **Risk:** Medium (may be used by external scripts)

6. **`backend/enhanced_ats_checker.py`** ⚠️
   - **Status:** Potential duplicate
   - **Action:** Compare with `app/services/enhanced_ats_service.py`
   - **Risk:** Medium

7. **`backend/grammar_checker.py`** ⚠️
   - **Status:** Potential duplicate
   - **Action:** Compare with `app/services/grammar_service.py`
   - **Risk:** Medium

8. **`backend/keyword_extractor.py`** ⚠️
   - **Status:** Potential duplicate
   - **Action:** Compare with `app/services/keyword_service.py`
   - **Risk:** Medium

9. **`backend/version_control.py`** ⚠️
   - **Status:** Unknown
   - **Action:** Check if used anywhere, compare with `app/services/version_control_service.py`
   - **Risk:** Low

### Low Priority (Keep for Now)

10. **`backend/create_test_user.py`** 🧪
    - **Status:** Development script
    - **Action:** Keep in repo, document usage

11. **`backend/test_backend_fixes.py`** 🧪
    - **Status:** Test script
    - **Action:** Keep if needed for testing

12. **Migration files** (`backend/migrate_*.sql`, `backend/run_*.py`)
    - **Status:** Historical migrations
    - **Action:** Keep for reference, consider archiving

---

## Next Steps

1. **Run dead code detection tools:**
   - `npm run dead:files` (knip)
   - `npm run dead:exports` (ts-prune)
   - `npm run dead:deps` (depcheck)
   - `vulture backend --min-confidence 90`

2. **Cross-reference findings** with this map to identify false positives

3. **Verify suspicious items** with `ripgrep` and TypeScript compiler

4. **Create cleanup PRs** starting with highest-confidence removals

---

## Notes

- **Editor routes:** Both `/editor` and `/editor-v2` exist, but `editor-v2` has no references
- **Backend structure:** Well-organized with DDD pattern (`app/domain/`) and service layer
- **Legacy compatibility:** Several root-level backend files are compatibility wrappers
- **No test files found:** Consider adding test infrastructure
- **Migration scripts:** Multiple migration files suggest active schema evolution


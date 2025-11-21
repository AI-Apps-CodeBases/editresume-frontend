# editresume.io – Full-Featured Resume Editor

## ✨ Features

✅ **Upload PDF Resume** - Automatically parse existing resumes  
✅ **Smart Parameterization** - Auto-detect & create variables for easy customization  
✅ **Export PDF & DOCX** - Professional outputs in both formats  
✅ **15 Industry Templates** - Tech, Healthcare, Finance, Creative, Legal & more  
✅ **Real-time Preview** - See changes instantly  
✅ **Global Replacements** - Change variables once, update entire resume  
✅ **User Authentication** - Optional login system with premium mode toggle  
✅ **AI-Powered Improvements** - OpenAI integration for bullet point enhancement  

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Copy the example env file
cp env.example .env

# Edit .env and add your OpenAI API key (optional)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### 2. Start the Application

```bash
docker compose up --build
```

**Editor**: http://localhost:3000/editor  
**API Docs**: http://localhost:8000/docs

> **Note**: OpenAI integration is optional. The app works without it, but AI features will be disabled.

### 3. Deployment Performance Tips

- Set `UVICORN_WORKERS`/`WEB_CONCURRENCY` in the backend service (Render, Docker, etc.) to at least `2` so long-running PDF parsing doesn't block ATS requests.
- Render: add a Cron Job that hits `https://<your-backend>/health` every 5 minutes to keep the dyno warm and reduce cold starts.
- Inspect the new `X-Process-Time` response header (and accompanying logs) on key endpoints like `/api/resume/upload` and `/api/ai/match_job_description` to spot slow steps quickly.

## 📖 Documentation

- **FEATURES.md** - Complete feature guide with examples
- **USAGE.md** - Quick start guide
- **login.md** - User authentication setup

## 🔧 How It Works

1. **Upload** your existing PDF resume (or start fresh)
2. **Parameterize** with `{{company}}`, `{{tech}}`, `{{metric}}` variables
3. **Edit** sections and bullets in clean UI
4. **Choose** from 15 industry-specific templates
5. **Export** as PDF or DOCX with one click

## 🎯 Example Workflow

```
Upload: resume.pdf
Auto-detected: {{company}} = AWS, {{metric}} = 35%

Edit bullet:
"Reduced costs by {{metric}} at {{company}}"

Change: {{company}} = Google, {{metric}} = 42%
Export: Downloads "Hasan Tutac.pdf" with replacements
```

## 🛠️ API Endpoints

### Core Endpoints
- `GET /health` - Health check (includes OpenAI status)
- `GET /api/resume/templates` - Get available templates
- `POST /api/resume/upload` - Upload & parse PDF
- `POST /api/resume/export/pdf` - Export as PDF
- `POST /api/resume/export/docx` - Export as DOCX
- `POST /api/resume/preview` - Preview text

### OpenAI Endpoints
- `GET /api/openai/status` - Check OpenAI connection status
- `POST /api/openai/improve-bullet` - AI-powered bullet point improvement
- `POST /api/ai/generate_bullet_points` - Generate bullet points from scratch
- `POST /api/ai/generate_summary` - Generate professional resume summary

## 💻 Development

```bash
# Stop services
docker compose down

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Rebuild after changes
docker compose up --build -d
```

## 📁 Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend**: FastAPI, Python 3.12
- **AI**: OpenAI API (optional)
- **PDF**: PyPDF2 for parsing, WeasyPrint for generation
- **DOCX**: python-docx
- **Database**: PostgreSQL (ready for future features)

## 🤖 OpenAI Integration

### Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env` file:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini  # or gpt-4, gpt-3.5-turbo
   OPENAI_MAX_TOKENS=2000
   ```
3. Restart containers: `docker compose restart backend`

### Features

- **Bullet Point Improvement**: AI analyzes and rewrites bullet points to be more impactful
- **Generate Bullet Points**: Create professional bullet points from scratch based on role and context
- **Generate Summary**: AI-powered professional summary generation
- **Tone Selection**: Choose from 4 writing styles (Professional, Technical, Formal, Casual)
- **ATS Optimization**: Suggestions are optimized for Applicant Tracking Systems
- **Context-Aware**: Provide job context for better tailoring

### API Usage

```bash
# Check OpenAI status
curl http://localhost:8000/api/openai/status

# Improve a bullet point
curl -X POST http://localhost:8000/api/openai/improve-bullet \
  -H "Content-Type: application/json" \
  -d '{
    "bullet": "Worked on backend features",
    "context": "Senior Backend Engineer at tech startup",
    "tone": "technical"
  }'

# Generate bullet points
curl -X POST http://localhost:8000/api/ai/generate_bullet_points \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Senior Backend Engineer",
    "company": "Tech Startup",
    "skills": "Python, FastAPI, PostgreSQL",
    "count": 5,
    "tone": "professional"
  }'

# Generate resume summary
curl -X POST http://localhost:8000/api/ai/generate_summary \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Senior Backend Engineer",
    "years_experience": 5,
    "skills": "Python, FastAPI, Docker, Kubernetes",
    "achievements": "Led team, improved performance by 40%"
  }'
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | Your OpenAI API key (required for AI features) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use (gpt-4o-mini, gpt-4, gpt-3.5-turbo) |
| `OPENAI_MAX_TOKENS` | `2000` | Maximum tokens per request |
| `PREMIUM_MODE` | `false` | Enable/disable premium features |

### Writing Tones

Choose from 4 AI writing tones for your resume content:

- **💼 Professional** - Corporate & polished language (default)
- **⚙️ Technical** - Tech-focused terminology and methodologies
- **👔 Formal** - Executive-level, strategic language
- **😊 Casual** - Conversational but workplace-appropriate


# editresume.io – Frontend Application

Next.js 14 frontend application for the full-featured resume editor platform.

## ✨ Features

testtee rr

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

# Edit .env and add your configuration
NEXT_PUBLIC_API_BASE=https://editresume-staging.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
# ... other variables (see env.example)
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

```bash
# Development server
npm run dev

# Or using Docker
docker compose up
```

**Editor**: http://localhost:3000/editor

## 🐳 Docker Development

```bash
# Start with Docker Compose
docker compose up

# Start with local backend API
docker compose -f docker-compose.local.yml up

# Stop services
docker compose down
```

## 📁 Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components
│   ├── contexts/            # React Context providers
│   ├── features/            # Feature-specific modules
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities & services
│   └── styles/              # Global styles
├── public/                  # Static assets
├── extension/               # Browser extension
└── docs/                    # Documentation
```

## 📖 Documentation

- **FEATURES.md** - Complete feature guide with examples
- **docs/architecture.md** - Architecture documentation
- **extension/README.md** - Browser extension documentation

## 🔧 How It Works

1. **Upload** your existing PDF resume (or start fresh)
2. **Parameterize** with `{{company}}`, `{{tech}}`, `{{metric}}` variables
3. **Edit** sections and bullets in clean UI
4. **Choose** from 15 industry-specific templates
5. **Export** as PDF or DOCX with one click

## 💻 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📁 Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (configured via vercel.json)

## 🔌 Backend API

This frontend application requires a backend API. The API base URL is configured via `NEXT_PUBLIC_API_BASE` environment variable.

Default API endpoints:
- Production: `https://editresume-staging.onrender.com`
- Local: `http://localhost:8000` or `http://localhost:8001`

## 🌐 Browser Extension

The `extension/` folder contains a Chrome extension for extracting job descriptions from job boards and importing them into the resume editor.

See `extension/README.md` for more details.

## 📝 License

Private repository - All rights reserved.

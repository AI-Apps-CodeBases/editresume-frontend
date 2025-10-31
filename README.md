# Frontend Application - editresume.io

Next.js 14 application with TypeScript, Tailwind CSS, and AI-powered resume editing.

## Architecture

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context** for state management
- **Component-based** architecture

## Project Structure

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── editor/          # Main resume editor
│   │   ├── profile/         # User profile page
│   │   └── shared/[token]/  # Shared resume viewer
│   │
│   ├── components/          # React components
│   │   ├── auth/           # Authentication modals
│   │   ├── editor/         # Resume editor components
│   │   └── [feature]/      # Landing page components
│   │
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── SettingsContext.tsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   └── useCollaboration.ts
│   │
│   ├── lib/                # Utilities & services
│   │   ├── config.ts       # API configuration
│   │   └── services/       # API service wrappers
│   │
│   └── styles/            # Global styles
│       └── globals.css
│
├── public/                # Static assets
└── package.json          # Dependencies
```

## Core Components

### Editor Components (`src/components/editor/`)

**VisualResumeEditor.tsx** - Main interactive editor
- Click-to-edit functionality
- Drag-and-drop reordering
- AI improvement integration
- Real-time collaboration support

**PreviewPanel.tsx** - Live resume preview
- Real-time rendering
- Multiple template support
- Print-ready output

**NewResumeWizard.tsx** - Onboarding flow
- Upload existing resume (PDF/DOCX)
- Paste text import
- Start from scratch
- Template selection

**AIWizard.tsx** - AI content generation
- Add work experience
- Generate projects
- Create skills sections
- Add education entries

**EnhancedATSScoreWidget.tsx** - ATS analysis
- Compatibility scoring
- Keyword matching
- Improvement suggestions
- AI-powered recommendations

**GrammarStylePanel.tsx** - Writing quality
- Grammar checking
- Style analysis
- Readability scoring
- Suggestion application

**JobDescriptionMatcher.tsx** - Job matching
- Resume-job comparison
- Missing keyword identification
- Match percentage calculation
- Improvement recommendations

**CoverLetterGenerator.tsx** - Letter generation
- AI-powered content
- Job-specific tailoring
- Tone customization
- PDF export

**VersionControlPanel.tsx** - Version management
- Snapshot creation
- Version history
- Comparison view
- Rollback functionality

**ExportAnalyticsDashboard.tsx** - Usage tracking
- Export history
- Template usage
- Success rates
- Trends analysis

**JobMatchAnalyticsDashboard.tsx** - Matching history
- Previous matches
- Score tracking
- Improvement suggestions
- Trends

**ShareResumeModal.tsx** - Sharing
- Public link generation
- Password protection
- Expiration settings
- View tracking

**CollaborationPanel.tsx** - Real-time collab
- Room creation
- User presence
- Live updates
- Comment system

**LeftSidebar.tsx** - Tool sidebar
- Quick access to all tools
- Feature grouping
- Premium indicators

### Feature-Specific Components

**AIImprovementWidget.tsx** - AI suggestions
- 10 improvement strategies
- Priority-based recommendations
- One-click application

**AIWorkExperience.tsx** - Work entry assistant
- Bullet generation
- Company/role context
- AI enhancement

**AISectionAssistant.tsx** - Section help
- Content suggestions
- Structure guidance
- Best practices

**InlineGrammarChecker.tsx** - In-place checking
- Real-time validation
- Inline suggestions
- Quick fixes

**Comments.tsx** - Commenting system
- Threaded comments
- Resolution tracking
- Collaboration features

**GlobalReplacements.tsx** - Variable replacement
- Template variables
- Batch updates
- Consistency checking

**UploadResume.tsx** - File upload
- Drag-and-drop
- PDF/DOCX parsing
- Progress tracking

**PasteResume.tsx** - Text input
- Plain text import
- Quick parsing
- Format preservation

**TemplateSelector.tsx** - Template chooser
- Preview images
- Responsive layouts
- Instant switching

**SectionReorder.tsx** - Section management
- Drag-and-drop
- Visibility toggles
- Custom ordering

## Pages

### `/editor` - Main Editor
- Visual editor interface
- Live preview panel
- AI tools sidebar
- Export controls
- Version management

### `/profile` - User Profile
- Account information
- Premium status
- Settings management
- Delete account

### `/shared/[token]` - Shared Resume
- Public resume viewer
- Comment system
- Analytics dashboard
- Password protection

## Context Providers

**AuthContext.tsx**
- User authentication
- Login/logout handling
- Premium access checking
- Session management

**SettingsContext.tsx**
- User preferences
- Feature toggles
- AI settings
- Grammar preferences

## Custom Hooks

**useCollaboration.ts**
- WebSocket connections
- Real-time updates
- Room management
- Presence tracking

## Services

**versionControl.ts**
- Version API calls
- Snapshot creation
- Comparison logic

**exportAnalytics.ts**
- Export tracking
- Statistics aggregation
- History management

**jobMatchAnalytics.ts**
- Match history
- Score tracking
- Trend analysis

**sharedResume.ts**
- Share link generation
- View tracking
- Comment management

## Styling

**Tailwind CSS** configuration:
- Custom color palette
- Responsive breakpoints
- Component utilities
- Dark mode ready

**Component styling:**
- Inline Tailwind classes
- Responsive design
- Mobile-first approach
- Accessibility features

## State Management

**Local State:** React `useState` for component data
**Shared State:** React Context for global data
**Persistent State:** `localStorage` for preferences
**Server State:** API calls with caching

## Key Features

✅ **Real-time Editing** - Instant preview updates
✅ **AI-Powered** - OpenAI integration for content
✅ **ATS Optimization** - Compatibility scoring
✅ **Multi-format Export** - PDF and DOCX
✅ **Version Control** - History and rollback
✅ **Collaboration** - Real-time sharing
✅ **Analytics** - Usage tracking
✅ **Responsive** - Mobile and desktop

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Dependencies

**Core:**
- `next` - React framework
- `react` - UI library
- `typescript` - Type safety

**Styling:**
- `tailwindcss` - Utility-first CSS
- `postcss` - CSS processing

**State:**
- React Context API

## Configuration

**Next.js:** `next.config.mjs`
**TypeScript:** `tsconfig.json`
**Tailwind:** `tailwind.config.ts`
**PostCSS:** `postcss.config.mjs`

## Deployment

**Vercel:**
- Automatic deployments
- Edge functions
- CDN distribution
- Preview deployments

**Configuration:** `vercel.json`


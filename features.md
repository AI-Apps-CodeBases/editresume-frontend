# EditResume.io - High-Level Features

## Core Resume Management

### Upload & Parse
- Upload existing resumes in PDF or DOCX format
- Automatic parsing and extraction of content
- Text-based resume input (paste)
- Start from scratch with blank templates

### Resume Templates
- 15+ industry-specific templates
- Templates for Tech, Healthcare, Finance, Creative, Legal, and more
- Real-time template switching with live preview
- Customizable template layouts

### Smart Parameterization
- Auto-detect variables ({{company}}, {{metric}}, {{tech}})
- Global variable replacement across entire resume
- Easy customization for multiple job applications
- Parameterized content management

### Real-Time Preview
- Live preview of resume changes
- Zoom in/out functionality
- Layout adjustments
- Section reordering with drag-and-drop

### Export Capabilities
- Export as PDF (professional format)
- Export as DOCX (editable format)
- One-click export functionality
- Export analytics tracking

## AI-Powered Features

### Content Generation
- **Bullet Point Improvement**: AI rewrites bullet points for greater impact
- **Generate Bullet Points**: Create professional bullet points from scratch
- **Generate Summary**: AI-powered professional resume summary generation
- **Generate Work Experience**: Complete work experience sections with company, title, dates, and bullets

### AI Assistant
- **AI Wizard**: Guided content generation with context
- **Section Assistant**: AI help for specific resume sections
- **Tone Selection**: Choose from 4 writing styles:
  - Professional (corporate & polished)
  - Technical (tech-focused terminology)
  - Formal (executive-level, strategic)
  - Casual (conversational but appropriate)

### ATS Optimization
- **ATS Score Analysis**: Evaluate resume compatibility with Applicant Tracking Systems
- **Enhanced ATS Scoring**: Advanced scoring with detailed insights
- **Improvement Suggestions**: AI-powered recommendations to improve ATS score
- **Keyword Optimization**: Identify and suggest missing keywords
- **ATS-Focused Content**: Generate content optimized for ATS systems

### Cover Letter Generation
- AI-powered cover letter creation
- Tailored to job descriptions
- Multiple tone options
- Context-aware generation

### Grammar & Style
- **Grammar Checker**: Comprehensive grammar and spelling checking
- **Style Analysis**: Writing style recommendations
- **Inline Grammar Check**: Real-time grammar suggestions
- **Grammar Style Panel**: Advanced style correction tools

## Job Matching & Analysis

### Job Description Matcher
- Match resume against job descriptions
- Similarity scoring (overall and technical)
- Keyword matching analysis
- Missing keyword identification
- Improvement suggestions based on job requirements
- Auto-extract job metadata (role, location, work type, job type)
- Save and manage multiple job descriptions
- Match session tracking

### Job Match Analytics
- Track matching performance across multiple jobs
- Match history and trends
- Analytics dashboard for job matches
- Export analytics for job applications

## Collaboration & Sharing

### Real-Time Collaboration
- WebSocket-based real-time editing
- Multi-user collaboration rooms
- Active user presence indicators
- Synchronized editing sessions

### Resume Sharing
- Generate shareable resume links
- Password-protected sharing
- Expiration dates for shared links
- View tracking and analytics
- Public sharing without authentication

### Comments System
- Add comments on resumes (shared and internal)
- Comment threading and replies
- Resolve/resolve comments
- Commenter identification
- Comments on specific resume sections

## Version Control

### Version Management
- Save resume versions with change summaries
- Auto-save functionality
- Manual version creation
- Version history timeline
- Version comparison (side-by-side diff)
- Rollback to previous versions
- Delete old versions

## User Management

### Authentication
- User signup and login
- Optional authentication system
- Premium mode toggle
- User profile management
- Account deletion

### Premium Features
- AI-powered improvements
- Cover letter generation
- Advanced collaboration
- Enhanced analytics

## Analytics & Tracking

### Export Analytics
- Track export history
- Export format statistics (PDF vs DOCX)
- Template usage analytics
- Recent exports tracking
- Export success/failure tracking

### Resume Analytics
- View tracking for shared resumes
- Geographic analytics (country, city)
- Referrer tracking
- View timestamps and user agent data

## Browser Extension

### Chrome Extension
- Extract job descriptions from job boards
- One-click import to resume editor
- Auto-populate job matching
- Extension settings and configuration
- Seamless integration with web app

## Additional Features

### Section Management
- Add/remove resume sections
- Reorder sections with drag-and-drop
- Section-specific editing
- Custom section types

### Visual Editor
- WYSIWYG resume editing
- Visual formatting controls
- Template preview
- Layout customization

### Resume Storage
- Save resumes to user account
- Resume list management
- Resume deletion
- Resume naming and organization

### Settings & Customization
- User preferences
- Feature toggles (grammar check, AI improvements, etc.)
- Advanced features configuration
- Premium feature access control

## Plan Configuration & Access

- Pricing tiers live in `frontend/src/lib/planFeatures.ts`
- `DEFAULT_PLAN` is currently `premium`, ensuring all users keep full feature access during launch
- Keep `NEXT_PUBLIC_PREMIUM_MODE=false` (default) while everything should stay unlocked
- When ready to monetize, flip `NEXT_PUBLIC_PREMIUM_MODE` to `true` and grant the Firebase custom claim `premium: true` (or store an upgraded tier) to enable paid features
- Components can call `useAuth().canUseFeature(featureKey)` to show or hide premium-only experiences


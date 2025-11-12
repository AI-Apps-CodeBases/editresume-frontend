'use client'
import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import config from '@/lib/config';
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import GlobalReplacements from '@/components/AI/GlobalReplacements'
import TemplateSelector from '@/components/Resume/TemplateSelector'
import NewResumeWizard from '@/components/Editor/NewResumeWizard'
import AuthModal from '@/components/Shared/Auth/AuthModal'
import VisualResumeEditor from '@/components/Editor/VisualResumeEditor'
import AIWizard from '@/components/AI/AIWizard'
import CoverLetterGenerator from '@/components/AI/CoverLetterGenerator'
import EnhancedATSScoreWidget from '@/components/AI/EnhancedATSScoreWidget'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import AIImprovementWidget from '@/components/AI/AIImprovementWidget'
import GrammarStylePanel from '@/components/AI/GrammarStylePanel'
import VersionControlPanel from '@/components/Resume/VersionControlPanel'
import VersionComparisonModal from '@/components/Resume/VersionComparisonModal'
import ExportAnalyticsDashboard from '@/components/Resume/ExportAnalyticsDashboard'
import JobMatchAnalyticsDashboard from '@/components/AI/JobMatchAnalyticsDashboard'
import ShareResumeModal from '@/components/Resume/ShareResumeModal'
import JobsView from '@/components/Editor/JobsView'
import ResumesView from '@/components/Resume/ResumesView'
import { useCollaboration } from '@/hooks/useCollaboration'
import { versionControlService } from '@/lib/services/versionControl'
import { shouldPromptAuthentication } from '@/lib/guestAuth'

const EditorPageContent = () => {
  const { user, isAuthenticated, logout, checkPremiumAccess } = useAuth()
  const searchParams = useSearchParams()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showWizard, setShowWizard] = useState(true) // Always start with true to match server render
  const [showAIWizard, setShowAIWizard] = useState(false)
  const [aiWizardContext, setAiWizardContext] = useState<any>(null)
  const [showCoverLetterGenerator, setShowCoverLetterGenerator] = useState(false)
  const [showATSScore, setShowATSScore] = useState(false)
  const [showEnhancedATS, setShowEnhancedATS] = useState(false)
  const [showAIImprovements, setShowAIImprovements] = useState(false)
  const [showVersionControl, setShowVersionControl] = useState(false)
  const [showVersionComparison, setShowVersionComparison] = useState(false)
  const [showExportAnalytics, setShowExportAnalytics] = useState(false)
  const [showShareResume, setShowShareResume] = useState(false)
  const [showJobMatchAnalytics, setShowJobMatchAnalytics] = useState(false)
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null)
  const [grammarEnabled, setGrammarEnabled] = useState(false)
  const [commentsEnabled, setCommentsEnabled] = useState(false)
  const [showGrammarPanel, setShowGrammarPanel] = useState(false)
  const [showCommentsPanel, setShowCommentsPanel] = useState(false)
  const [comparisonVersions, setComparisonVersions] = useState<{ version1Id: number; version2Id: number } | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [currentView, setCurrentView] = useState<'editor' | 'jobs' | 'resumes'>('editor')
  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userName') || ''
    }
    return ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState<'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedTemplate') || 'clean'
      return stored as 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech'
    }
    return 'clean'
  })

  const collaboration = useCollaboration()
  
  const [resumeData, setResumeData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    sections: [] as Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params: Record<string, string>
      }>
    }>
  })
  const lastLoadedRef = useRef<{ resumeId?: number | null; versionId?: number | null }>({})
  const lastQueryParamsRef = useRef<{ resumeIdParam?: string | null; resumeVersionIdParam?: string | null }>({})
  const resumeIdParam = searchParams.get('resumeId')
  const resumeVersionIdParam = searchParams.get('resumeVersionId')
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return

    const resumeId = resumeIdParam ? Number(resumeIdParam) : null
    let resumeVersionId = resumeVersionIdParam ? Number(resumeVersionIdParam) : null

    if ((!resumeId && !resumeVersionId) || Number.isNaN(resumeId ?? undefined) || Number.isNaN(resumeVersionId ?? undefined)) {
      return
    }

    if (
      lastQueryParamsRef.current.resumeIdParam === resumeIdParam &&
      lastQueryParamsRef.current.resumeVersionIdParam === resumeVersionIdParam
    ) {
      return
    }

    let cancelled = false

    const fetchResumeData = async () => {
      lastQueryParamsRef.current = { resumeIdParam, resumeVersionIdParam }
      try {
        let resumeMeta: any = null

        if (resumeId && user?.email) {
          try {
            const metaRes = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
            if (metaRes.ok) {
              const metaJson = await metaRes.json()
              const matched = (metaJson.resumes || []).find((item: any) => item.id === resumeId)
              if (matched) {
                resumeMeta = matched
                if (!resumeVersionId && matched.latest_version_id) {
                  resumeVersionId = matched.latest_version_id
                }
              }
            }
          } catch (err) {
            console.error('Failed to load resume metadata:', err)
          }
        }

        if (!resumeVersionId && resumeId && user?.email) {
          try {
            const versionsRes = await fetch(
              `${config.apiBase}/api/resume/${resumeId}/versions?user_email=${encodeURIComponent(user.email)}`
            )
            if (versionsRes.ok) {
              const versionsJson = await versionsRes.json()
              const firstVersion = (versionsJson.versions || [])[0]
              if (firstVersion?.id) {
                resumeVersionId = firstVersion.id
              }
            }
          } catch (err) {
            console.error('Failed to load resume versions:', err)
          }
        }

        if (!resumeVersionId) {
          console.warn('No resume version available to load')
          return
        }

        const versionRes = await fetch(
          `${config.apiBase}/api/resume/version/${resumeVersionId}?user_email=${encodeURIComponent(user.email)}`
        )
        if (!versionRes.ok) {
          console.error('Failed to load resume version:', await versionRes.text())
          return
        }

        const versionJson = await versionRes.json()
        const versionPayload = versionJson?.version?.resume_data || {}
        const personalInfo = versionPayload.personalInfo || {}
        const sections = Array.isArray(versionPayload.sections) ? versionPayload.sections : []

        const normalizedResume = {
          name: personalInfo.name || resumeMeta?.name || '',
          title: resumeMeta?.title || '',
          email: personalInfo.email || '',
          phone: personalInfo.phone || '',
          location: personalInfo.location || '',
          summary: typeof versionPayload.summary === 'string' ? versionPayload.summary : '',
          sections
        }

        if (cancelled) return

        setResumeData(normalizedResume)
        setPreviewKey((prev) => prev + 1)
        setReplacements({})
        setShowWizard(false)
        if (resumeId) {
          setCurrentResumeId(resumeId)
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentResumeId', String(resumeId))
          }
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('resumeData', JSON.stringify(normalizedResume))
          } catch (error) {
            console.error('Error caching resume data from server:', error)
          }
        }

        const allowedTemplates = ['clean', 'two-column', 'compact', 'minimal', 'modern', 'tech'] as const
        if (resumeMeta?.template && allowedTemplates.includes(resumeMeta.template)) {
          setSelectedTemplate(resumeMeta.template)
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedTemplate', resumeMeta.template)
          }
        }

        lastLoadedRef.current = { resumeId: resumeId ?? null, versionId: resumeVersionId }
        lastQueryParamsRef.current = { resumeIdParam, resumeVersionIdParam }
      } catch (error) {
        console.error('Failed to load resume from server:', error)
      }
    }

    fetchResumeData()

    return () => {
      cancelled = true
    }
  }, [resumeIdParam, resumeVersionIdParam, isAuthenticated, user?.email])

  // Handle client-side mounting to avoid hydration errors
  useEffect(() => {
    setMounted(true)
    
    // Load resume data from localStorage after mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('resumeData')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && (parsed.name || parsed.sections?.length > 0)) {
            console.log('📂 Loading resume from localStorage on mount:', parsed)
            setResumeData(parsed)
            // Check URL params for wizard forcing
            const urlParams = new URLSearchParams(window.location.search)
            const forceWizard = urlParams.get('upload') === 'true' || urlParams.get('new') === 'true'
            setShowWizard(forceWizard)
          } else {
            // No meaningful data, check if we should show wizard
            const urlParams = new URLSearchParams(window.location.search)
            const forceWizard = urlParams.get('upload') === 'true' || urlParams.get('new') === 'true'
            setShowWizard(forceWizard || !resumeData.name)
          }
        } else {
          // No saved data, check URL params
          const urlParams = new URLSearchParams(window.location.search)
          const forceWizard = urlParams.get('upload') === 'true' || urlParams.get('new') === 'true'
          setShowWizard(forceWizard)
        }
      } catch (e) {
        console.error('Error loading resume from localStorage:', e)
      }
    }
  }, []) // Only run once on mount

  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [previewMode, setPreviewMode] = useState<'live' | 'match' | 'analysis'>(() => {
    if (typeof window === 'undefined') return 'live'
    const saved = localStorage.getItem('previewMode')
    return (saved === 'match' || saved === 'analysis') ? saved : 'live'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('previewMode', previewMode)
    }
  }, [previewMode])

  // Deep link: ?jdId=123 to load JD and switch to match mode
  const [deepLinkedJD, setDeepLinkedJD] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deepLinkedJD');
      return saved || null;
    }
    return null;
  })
  const [activeJobDescriptionId, setActiveJobDescriptionId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeJobDescriptionId');
      return saved ? parseInt(saved) : null;
    }
    return null;
  })
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeJobDescriptionId !== null) {
        localStorage.setItem('activeJobDescriptionId', activeJobDescriptionId.toString());
      }
      if (deepLinkedJD) {
        localStorage.setItem('deepLinkedJD', deepLinkedJD);
      }
    }
  }, [activeJobDescriptionId, deepLinkedJD]);
  
  // Load JD when switching back to match mode if we have a saved ID
  useEffect(() => {
    if (previewMode === 'match' && activeJobDescriptionId && !deepLinkedJD) {
      fetch(`${config.apiBase}/api/job-descriptions/${activeJobDescriptionId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.content) {
            setDeepLinkedJD(data.content)
          }
        })
        .catch(() => {})
    }
  }, [previewMode, activeJobDescriptionId, deepLinkedJD]);
  
  useEffect(() => {
    const id = searchParams.get('jdId')
    if (id) {
      fetch(`${config.apiBase}/api/job-descriptions/${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.content) {
            setDeepLinkedJD(data.content)
            setPreviewMode('match')
            setActiveJobDescriptionId(Number(id))
          }
        })
        .catch(() => {})
    }
  }, [searchParams])

  // Global keyboard: ESC returns to Live mode and closes fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewMode('live')
        setFullscreenPreview(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
     if (typeof window === 'undefined') return
     const resumeUploadParam = searchParams.get('resumeUpload')
     const uploadToken = searchParams.get('uploadToken')
     if (resumeUploadParam === '1') {
       setCurrentResumeId(null)
       try {
         localStorage.removeItem('currentResumeId')
         if (uploadToken) {
           const stored = window.sessionStorage.getItem(`uploadedResume:${uploadToken}`)
           if (stored) {
             try {
               const parsed = JSON.parse(stored)
               if (parsed?.resume) {
                 setResumeData(parsed.resume)
                 localStorage.setItem('resumeData', JSON.stringify(parsed.resume))
               }
               if (parsed?.template) {
                 setSelectedTemplate(parsed.template)
                 localStorage.setItem('selectedTemplate', parsed.template)
               }
             } catch (e) {
               console.error('Failed to apply uploaded resume payload', e)
             } finally {
               window.sessionStorage.removeItem(`uploadedResume:${uploadToken}`)
             }
           }
         }
       } catch (e) {
         console.warn('Failed to clear currentResumeId from localStorage', e)
       }
 
       const url = new URL(window.location.href)
       url.searchParams.delete('resumeUpload')
       url.searchParams.delete('uploadToken')
       window.history.replaceState({}, '', url.toString())
     }
   }, [searchParams])

  const generateResumeId = () => {
    return Math.floor(Math.random() * 1000000) + 1
  }

  const handleAddComment = (text: string, targetType: string, targetId: string) => {
    console.log('Adding comment:', { text, targetType, targetId })
    // The collaboration hook will handle the actual API call
  }

  const handleResolveComment = (commentId: string) => {
    console.log('Resolving comment:', commentId)
    // The collaboration hook will handle the actual API call
  }

  const handleDeleteComment = (commentId: string) => {
    console.log('Deleting comment:', commentId)
    // The collaboration hook will handle the actual API call
  }

  const handleWizardComplete = (data: any, template: string, layoutConfig?: any) => {
    console.log('Wizard complete:', { data, template, layoutConfig })
    
    const newResumeData = {
      name: data.name || '',
      title: data.title || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      summary: data.summary || '',
      sections: data.sections || []
    }
    
    setResumeData(newResumeData)
    setCurrentResumeId(generateResumeId())
    
    // Immediately save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('resumeData', JSON.stringify(newResumeData))
      } catch (error) {
        console.error('Error saving resume data:', error)
      }
    }
    
    setSelectedTemplate(template === 'visual' ? 'tech' : template as 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech')
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', template === 'visual' ? 'tech' : template)
    }
    
    if (data.detected_variables) {
      setReplacements(data.detected_variables)
    }

    if (layoutConfig && template === 'two-column') {
      localStorage.setItem('twoColumnLeft', JSON.stringify(layoutConfig.leftSections))
      localStorage.setItem('twoColumnRight', JSON.stringify(layoutConfig.rightSections))
      localStorage.setItem('twoColumnLeftWidth', String(layoutConfig.leftWidth))
    }
    
    setShowWizard(false)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if user wants to upload a resume
    const isUploadResume = searchParams.get('upload') === 'true'
    if (isUploadResume) {
      // Clear any cached data and show upload wizard
      localStorage.removeItem('resumeData')
      setResumeData({
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        sections: []
      })
      setShowWizard(true)
      return
    }
    
    const urlRoomId = searchParams.get('room')
    if (urlRoomId) {
      setRoomId(urlRoomId)
      setShowWizard(false)
      
      if (!userName) {
        const name = prompt('Enter your name for collaboration:')
        if (name) {
          setUserName(name)
          localStorage.setItem('userName', name)
        }
      }
    }
    
    // Check if user wants to create a new resume from scratch
    const isNewResume = searchParams.get('new') === 'true'
    if (isNewResume) {
      // Create empty resume data and skip wizard
      const emptyResumeData = {
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        sections: [
          {
            id: '1',
            title: 'Professional Summary',
            bullets: [{ id: '1', text: '', params: {} }]
          },
          {
            id: '2', 
            title: 'Experience',
            bullets: [{ id: '2', text: '', params: {} }]
          },
          {
            id: '3',
            title: 'Skills', 
            bullets: [{ id: '3', text: '', params: {} }]
          },
          {
            id: '4',
            title: 'Education',
            bullets: [{ id: '4', text: '', params: {} }]
          }
        ],
        template: 'tech',
        layoutConfig: {}
      }
      setResumeData(emptyResumeData)
      setShowWizard(false)
      return
    }
    
    // Load cached resume data (works for both authenticated and non-authenticated users)
    // This runs on mount and when navigating back to ensure resume loads
    const savedResumeData = localStorage.getItem('resumeData')
    if (savedResumeData) {
      try {
        const existingData = JSON.parse(savedResumeData)
        // Only load if there's meaningful content
        if (existingData && (existingData.name || existingData.sections?.length > 0)) {
          console.log('📂 Loading existing resume data from localStorage (useEffect):', existingData)
          // Always update to ensure we have the latest from localStorage
          // This ensures resume persists when navigating back from profile
          setResumeData(existingData)
          setShowWizard(false)
          return
        }
      } catch (error) {
        console.error('Error parsing resume data from localStorage:', error)
      }
    }

    // If no saved data, handle wizard display
    if (!savedResumeData) {
      // Only show wizard if user explicitly wants new resume or has no data
      const wantsNew = searchParams.get('new') === 'true'
      if (wantsNew) {
        setShowWizard(true)
      } else if (!isAuthenticated) {
        // For non-authenticated users with no saved data, show wizard
        setShowWizard(true)
      }
    } else {
      // If we have saved data, ensure wizard is hidden
      setShowWizard(false)
    }
  }, [searchParams, userName, isAuthenticated]) // Intentionally exclude resumeData to avoid loops

  // Save resume data to localStorage whenever it changes (with debouncing)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Only save if there's meaningful data (has name or has sections with content)
    const hasContent = resumeData.name || 
      (resumeData.sections && resumeData.sections.length > 0 && 
       resumeData.sections.some((s: any) => s.bullets && s.bullets.some((b: any) => b.text?.trim())))
    
    if (!hasContent) return

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('resumeData', JSON.stringify(resumeData))
        console.log('💾 Resume data saved to localStorage')
      } catch (error) {
        console.error('Error saving resume data:', error)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [resumeData])

  // Save resume data before page unload or navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasContent = resumeData.name || 
      (resumeData.sections && resumeData.sections.length > 0 && 
       resumeData.sections.some((s: any) => s.bullets && s.bullets.some((b: any) => b.text?.trim())))

    if (!hasContent) return

    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('resumeData', JSON.stringify(resumeData))
      } catch (error) {
        console.error('Error saving resume on unload:', error)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          localStorage.setItem('resumeData', JSON.stringify(resumeData))
        } catch (error) {
          console.error('Error saving resume on visibility change:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [resumeData])

  useEffect(() => {
    if (roomId && userName) {
      collaboration.connect(roomId, userName)
      
      collaboration.onRemoteUpdate((data, remoteUserName) => {
        console.log(`Update from ${remoteUserName}:`, data)
        setResumeData(data)
      })
    }
    
    return () => {
      if (roomId) {
        collaboration.disconnect()
      }
    }
  }, [roomId, userName, collaboration])

  const handleResumeDataChange = useCallback((newData: any) => {
    console.log('=== handleResumeDataChange called ===')
    console.log('Previous resume data:', resumeData)
    console.log('New resume data:', newData)
    console.log('Setting new resume data...')
    
    setResumeData(newData)
    setPreviewKey(prev => prev + 1) // Force preview re-render
    
    if (roomId && collaboration.isConnected) {
      console.log('Sending collaboration update...')
      collaboration.sendUpdate(newData)
    }
    
    console.log('handleResumeDataChange completed')
  }, [roomId, collaboration, resumeData])

  const handleCreateRoom = async () => {
    try {
      const response = await fetch(`${config.apiBase}/api/collab/room/create`)
      const data = await response.json()
      const name = userName || prompt('Enter your name:')
      if (name) {
        setUserName(name)
        localStorage.setItem('userName', name)
        setRoomId(data.room_id)
        window.history.pushState({}, '', `/editor?room=${data.room_id}`)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create collaboration room')
    }
  }

  const handleJoinRoom = (roomIdToJoin: string) => {
    const name = userName || prompt('Enter your name:')
    if (name) {
      setUserName(name)
      localStorage.setItem('userName', name)
      setRoomId(roomIdToJoin)
      window.history.pushState({}, '', `/editor?room=${roomIdToJoin}`)
    }
  }

  const handleLeaveRoom = () => {
    collaboration.disconnect()
    setRoomId(null)
    window.history.pushState({}, '', '/editor')
  }

  const saveToHistory = () => {
    if (!resumeData.name) return
    
    const history = localStorage.getItem('resumeHistory')
    const resumes = history ? JSON.parse(history) : []
    const newResume = {
      id: Date.now().toString(),
      name: resumeData.name,
      lastModified: new Date().toLocaleString(),
      template: selectedTemplate
    }
    resumes.unshift(newResume)
    localStorage.setItem('resumeHistory', JSON.stringify(resumes.slice(0, 10)))
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    console.log('Export requested:', format)
    console.log('Resume data:', resumeData)
    console.log('Is authenticated:', isAuthenticated)
    
    const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'

    if (!premiumMode) {
      const requireAuth = shouldPromptAuthentication('exportResume', isAuthenticated)
      if (requireAuth) {
        setShowAuthModal(true)
        return
      }
    }
    
    if (premiumMode && !isAuthenticated) {
      console.log('Premium mode - showing auth modal')
      setShowAuthModal(true)
      return
    }

    if (premiumMode && !checkPremiumAccess()) {
      console.log('Premium mode - access denied')
      alert('⭐ Premium feature! Upgrade to export resumes.')
      return
    }

    saveToHistory()
    
    if (isAuthenticated && user?.email) {
      try {
        await fetch(`${config.apiBase}/api/user/track-export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        })
      } catch (e) {
        console.log('Failed to track export')
      }
    }

    setIsExporting(true)
    try {
      const exportUrl = `${config.apiBase}/api/resume/export/${format}`
      console.log('Export URL:', exportUrl)
      
      // Add user email to URL for analytics tracking
      const url = new URL(exportUrl)
      if (user?.email) {
        url.searchParams.set('user_email', user.email)
      }
      
      // Clean sections data - remove boolean visible flags from params for API compatibility
      const cleanedSections = resumeData.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        bullets: section.bullets.map((bullet: any) => ({
          id: bullet.id,
          text: bullet.text,
          params: {} // Remove visible flag from params for API compatibility
        }))
      }))
      
      const exportData = {
        name: resumeData.name,
        title: resumeData.title,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        summary: resumeData.summary,
        sections: cleanedSections,
        replacements,
        template: selectedTemplate,
        design: {
          colors: {
            primary: '#000000',
            secondary: '#000000',
            accent: '#000000',
            text: '#000000'
          }
        },
        two_column_left: localStorage.getItem('twoColumnLeft') ? JSON.parse(localStorage.getItem('twoColumnLeft')!) : [],
        two_column_right: localStorage.getItem('twoColumnRight') ? JSON.parse(localStorage.getItem('twoColumnRight')!) : [],
        two_column_left_width: localStorage.getItem('twoColumnLeftWidth') ? Number(localStorage.getItem('twoColumnLeftWidth')!) : 50
      }
      
      console.log('Export data:', exportData)
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      console.log('Export response status:', response.status)
      console.log('Export response ok:', response.ok)
      // After successful export, save resume version and record match session if a JD is active
      if (response.ok && activeJobDescriptionId && isAuthenticated && user?.email) {
        try {
          // First, save or update resume and create a version
          let resumeId = currentResumeId;
          let resumeVersionId = null;
          
          try {
            // Save resume and get version
            // Clean sections data - remove boolean visible flags from params for API compatibility
            const cleanedSectionsForSave = resumeData.sections.map((section: any) => ({
              id: section.id,
              title: section.title,
              bullets: section.bullets.map((bullet: any) => ({
                id: bullet.id,
                text: bullet.text,
                params: {} // Remove visible flag from params for API compatibility
              }))
            }))
            
            const saveResumeRes = await fetch(`${config.apiBase}/api/resume/save?user_email=${encodeURIComponent(user.email)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: resumeData.name,
                title: resumeData.title,
                email: resumeData.email,
                phone: resumeData.phone,
                location: resumeData.location,
                summary: resumeData.summary,
                template: selectedTemplate,
                sections: cleanedSectionsForSave
              })
            });
            
            if (saveResumeRes.ok) {
              const saveData = await saveResumeRes.json();
              resumeId = saveData.resume_id;
              resumeVersionId = saveData.version_id;
              
              console.log('Resume saved successfully:', { resumeId, resumeVersionId });
              
              // Update current resume ID
              if (!currentResumeId) {
                setCurrentResumeId(resumeId);
                // Store it for future use
                localStorage.setItem('currentResumeId', String(resumeId));
              }
            } else {
              const errorText = await saveResumeRes.text();
              console.error('Failed to save resume:', saveResumeRes.status, errorText);
            }
          } catch (e) {
            console.error('Failed to save resume version:', e);
          }
          
            // Then create match session with version ID (even if save failed, try with available data)
          try {
            // Get ATS score from localStorage if available
            let atsScore = null;
            try {
              const storedMatchResult = localStorage.getItem('currentMatchResult');
              if (storedMatchResult) {
                const matchResult = JSON.parse(storedMatchResult);
                atsScore = matchResult?.match_analysis?.similarity_score || null;
              }
            } catch (e) {
              console.error('Failed to get ATS score from localStorage:', e);
            }
            
            const matchPayload: any = {
              jobDescriptionId: activeJobDescriptionId,
              user_email: user.email,
              resume_name: resumeData.name,
              resume_title: resumeData.title,
            };
            
            // Only include resumeId if we have it
            if (resumeId) {
              matchPayload.resumeId = resumeId;
            }
            
            // Include version ID and snapshot if available
            if (resumeVersionId) {
              matchPayload.resume_version_id = resumeVersionId;
            }
            
            // Include ATS score if available
            if (atsScore !== null) {
              matchPayload.ats_score = Math.round(atsScore);
            }
            
            if (exportData) {
              // Transform exportData to match expected resume_snapshot structure
              matchPayload.resume_snapshot = {
                personalInfo: {
                  name: exportData.name,
                  title: exportData.title,
                  email: exportData.email || '',
                  phone: exportData.phone || '',
                  location: exportData.location || ''
                },
                summary: exportData.summary || '',
                sections: exportData.sections || [],
                template: exportData.template || selectedTemplate
              };
            }
            
            console.log('Creating match session with payload:', matchPayload);
            
            const matchResponse = await fetch(`${config.apiBase}/api/matches`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(matchPayload)
            });
            
            if (matchResponse.ok) {
              const matchData = await matchResponse.json();
              console.log('Match session recorded successfully:', matchData);
            } else {
              const errorText = await matchResponse.text();
              console.error('Failed to create match session:', matchResponse.status, errorText);
            }
          } catch (e) {
            console.error('Failed to create match session:', e);
          }
        } catch (e) {
          console.error('Failed to save matched resume:', e);
        }
      }
      
      // Debug logging
      const debugInfo = {
        template: selectedTemplate,
        left: localStorage.getItem('twoColumnLeft'),
        right: localStorage.getItem('twoColumnRight'),
        width: localStorage.getItem('twoColumnLeftWidth'),
        allLocalStorage: Object.keys(localStorage).reduce((obj, key) => {
          if (key.startsWith('twoColumn')) {
            obj[key] = localStorage.getItem(key)
          }
          return obj
        }, {} as Record<string, string | null>)
      }
      console.log('Export payload two-column settings:', debugInfo)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resumeData.name || 'resume'}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorText = await response.text()
        console.error('Export failed:', response.status, errorText)
        alert(`Export failed (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Export failed: ${errorMessage}. Make sure backend is running.`)
    } finally {
      setIsExporting(false)
    }
  }

  // Version Control Handlers (Save functionality moved to JobDescriptionMatcher)

  const handleVersionLoad = (versionData: any) => {
    const newResumeData = {
      name: versionData.personalInfo?.name || '',
      title: versionData.personalInfo?.title || '',
      email: versionData.personalInfo?.email || '',
      phone: versionData.personalInfo?.phone || '',
      location: versionData.personalInfo?.location || '',
      summary: versionData.summary || '',
      sections: versionData.sections || []
    }
    setResumeData(newResumeData)
    setPreviewKey(prev => prev + 1)
  }

  const handleVersionSave = (changeSummary: string) => {
    console.log('Version saved:', changeSummary)
    // Could show a toast notification here
  }

  const handleCompareVersions = (version1Id: number, version2Id: number) => {
    setComparisonVersions({ version1Id, version2Id })
    setShowVersionComparison(true)
  }

  const [previewScale, setPreviewScale] = useState(0.6)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)

  // Safety: if fullscreen is active, force Live mode
  useEffect(() => {
    if (fullscreenPreview && previewMode !== 'live') {
      setPreviewMode('live')
    }
  }, [fullscreenPreview, previewMode])

  const handleWorkExperienceUpdate = (newContent: any) => {
    console.log('=== HANDLING WORK EXPERIENCE UPDATE ===')
    console.log('New content:', newContent)
    console.log('Context:', newContent.context)
    
    try {
      const { content, context } = newContent
      const { sectionId, bulletId, companyName, jobTitle, dateRange } = context
      
      // Find the section and update the company header
      const sections = resumeData.sections.map(section => {
        if (section.id === sectionId) {
          const updatedBullets = section.bullets.map(bullet => {
            if (bullet.id === bulletId) {
              // Update the company header with new information
              return {
                ...bullet,
                text: `**${content.companyName || companyName} / ${content.jobTitle || jobTitle} / ${content.dateRange || dateRange}**`
              }
            }
            return bullet
          })
          
          // Add new bullet points after the company header
          if (content.bullets && content.bullets.length > 0) {
            const newBullets = content.bullets.map((bulletText: string, index: number) => ({
              id: `bullet-${Date.now()}-${index}`,
              text: `• ${bulletText}`,
              params: {}
            }))
            
            // Insert new bullets after the company header
            const headerIndex = updatedBullets.findIndex(b => b.id === bulletId)
            updatedBullets.splice(headerIndex + 1, 0, ...newBullets)
          }
          
          return {
            ...section,
            bullets: updatedBullets
          }
        }
        return section
      })
      
      setResumeData({ ...resumeData, sections })
      console.log('Work experience updated successfully')
      
    } catch (error) {
      console.error('Error updating work experience:', error)
      alert('Failed to update work experience: ' + (error as Error).message)
    }
  }

  const handleBulletImprovement = (newContent: any) => {
    console.log('=== HANDLING BULLET IMPROVEMENT ===')
    console.log('New content:', newContent)
    console.log('Context:', newContent.context)
    
    try {
      const { content, context } = newContent
      const { sectionId, bulletId } = context
      
      // Find the section and update the specific bullet point
      const sections = resumeData.sections.map(section => {
        if (section.id === sectionId) {
          const updatedBullets = section.bullets.map(bullet => {
            if (bullet.id === bulletId) {
              // Update the bullet text with the improved content
              let improvedText = content.improvedBullet || content.bullet || content
              
              // Ensure the text starts with a bullet point
              if (!improvedText.startsWith('•')) {
                improvedText = `• ${improvedText}`
              }
              
              return {
                ...bullet,
                text: improvedText
              }
            }
            return bullet
          })
          
          return {
            ...section,
            bullets: updatedBullets
          }
        }
        return section
      })
      
      setResumeData({ ...resumeData, sections })
      console.log('Bullet point improved successfully')
      
    } catch (error) {
      console.error('Error improving bullet point:', error)
      alert('Failed to improve bullet point: ' + (error as Error).message)
    }
  }

  const handleAddContent = (newContent: any) => {
    console.log('=== AI WIZARD ADDING CONTENT ===')
    console.log('New content from AI wizard:', newContent)
    console.log('Content type:', newContent.type)
    console.log('Content data:', newContent.content)
    console.log('Position:', newContent.position)
    console.log('Current resume data before update:', resumeData)
    
    // Handle AI Wizard context for work experience
    if (newContent.type === 'ai-wizard') {
      console.log('AI Wizard context detected:', newContent.context)
      setAiWizardContext(newContent.context)
      setShowAIWizard(true)
      return
    }
    
    // Handle work experience update
    if (newContent.type === 'work-experience-update') {
      console.log('Work experience update detected:', newContent)
      handleWorkExperienceUpdate(newContent)
      return
    }
    
    if (newContent.type === 'bullet-improvement') {
      console.log('Bullet improvement detected:', newContent)
      handleBulletImprovement(newContent)
      return
    }
    
    try {
      if (newContent.type === 'job') {
        // Add new job experience
        const workExperienceSection = resumeData.sections.find(s => 
          s.title.toLowerCase().includes('experience') || 
          s.title.toLowerCase().includes('work') ||
          s.title.toLowerCase().includes('employment') ||
          s.title.toLowerCase().includes('professional')
        )
        
        console.log('Available sections:', resumeData.sections.map(s => s.title))
        console.log('Found work experience section:', workExperienceSection)
        
        if (newContent.content) {
          let targetSection = workExperienceSection
          
          // If no work experience section found, create one
          if (!targetSection) {
            console.log('No work experience section found, creating one...')
            targetSection = {
              id: Date.now().toString(),
              title: 'Work Experience',
              bullets: []
            }
            // Add the new section to the beginning of sections array
            resumeData.sections.unshift(targetSection)
          }
          const content = newContent.content
          const bullets = content.bullets || []
          
          console.log('Content bullets:', bullets)
          
          console.log('Content validation:', {
            company: content.company,
            role: content.role,
            duration: content.duration,
            bullets: bullets,
            fullContent: content
          })
          
          // Handle undefined values with fallbacks
          const company = content.company || 'Unknown Company'
          const role = content.role || 'Unknown Role'
          const duration = content.duration || 'Unknown Duration'
          
          console.log('Using fallbacks:', { company, role, duration })
          
          const newBullets = [
            { 
              id: Date.now().toString(), 
              text: `**${company} / ${role} / ${duration}**`, 
              params: {} 
            },
            ...bullets.filter((bullet: any) => bullet && bullet.trim()).map((bullet: string) => ({
              id: Date.now().toString() + Math.random(),
              text: `• ${bullet}`,
              params: {}
            }))
          ]
          
          console.log('New bullets to add:', newBullets)
          
          // Clean up existing placeholder entries
          const cleanExistingBullets = (bullets: any[]) => {
            return bullets.filter(bullet => 
              bullet.text && 
              bullet.text.trim() && 
              !bullet.text.includes('Company / Role / Duration') &&
              !bullet.text.includes('**Company**') &&
              !bullet.text.includes('**Role**') &&
              !bullet.text.includes('**Duration**')
            )
          }
          
          const updatedSections = resumeData.sections.map(section => {
            if (section.id === targetSection.id) {
              let updatedBullets
              const cleanedExistingBullets = cleanExistingBullets(section.bullets)
              
              if (newContent.position === 'beginning') {
                updatedBullets = [...newBullets, ...cleanedExistingBullets]
              } else if (newContent.position === 'middle') {
                const middleIndex = Math.floor(cleanedExistingBullets.length / 2)
                const newBulletsList = [...cleanedExistingBullets]
                newBulletsList.splice(middleIndex, 0, ...newBullets)
                updatedBullets = newBulletsList
              } else {
                updatedBullets = [...cleanedExistingBullets, ...newBullets]
              }
              
              console.log('Updated bullets for section:', updatedBullets)
              return { ...section, bullets: updatedBullets }
            }
            return section
          })
          
          console.log('Updated sections:', updatedSections)
          const newResumeData = { ...resumeData, sections: updatedSections }
          console.log('New resume data:', newResumeData)
          console.log('Calling handleResumeDataChange to update preview...')
          handleResumeDataChange(newResumeData)
          console.log('handleResumeDataChange completed')
        } else {
          console.log('No content provided')
        }
      } else if (newContent.type === 'project') {
        // Add new project
        const projectsSection = resumeData.sections.find(s => 
          s.title.toLowerCase().includes('project')
        ) || resumeData.sections[0]
        
        console.log('Found projects section:', projectsSection)
        
        if (newContent.content) {
          const content = newContent.content
          const bullets = content.bullets || []
          
          const newBullets = [
            { id: Date.now().toString(), text: `**${content.name || 'Project Name'}**`, params: {} },
            { id: Date.now().toString() + '1', text: content.description || 'Project description', params: {} },
            ...bullets.map((bullet: string) => ({
              id: Date.now().toString() + Math.random(),
              text: `• ${bullet}`,
              params: {}
            }))
          ]
          
          console.log('New project bullets:', newBullets)
          
          const updatedSections = resumeData.sections.map(section => {
            if (section.id === projectsSection.id) {
              const updatedBullets = [...section.bullets, ...newBullets]
              console.log('Updated project bullets:', updatedBullets)
              return { ...section, bullets: updatedBullets }
            }
            return section
          })
          
          const newResumeData = { ...resumeData, sections: updatedSections }
          console.log('New resume data with project:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      } else if (newContent.type === 'skill') {
        // Add new skills section
        if (newContent.content && newContent.content.categories) {
          const categories = newContent.content.categories
          const skillBullets = Object.entries(categories).map(([category, skills]) => 
            `**${category}:** ${Array.isArray(skills) ? skills.join(', ') : skills}`
          )
          
          const newSection = {
            id: Date.now().toString(),
            title: 'Skills',
            bullets: skillBullets.map(skill => ({
              id: Date.now().toString() + Math.random(),
              text: skill,
              params: {}
            }))
          }
          
          console.log('New skills section:', newSection)
          
          const newResumeData = { 
            ...resumeData, 
            sections: [...resumeData.sections, newSection] 
          }
          console.log('New resume data with skills:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      } else if (newContent.type === 'education') {
        // Add new education section
        if (newContent.content) {
          const content = newContent.content
          const educationBullets = [
            `**${content.institution || 'Institution'}**`,
            `${content.degree || 'Degree'} - ${content.year || 'Year'}`,
            ...(content.coursework || []).map((course: string) => `• ${course}`),
            ...(content.honors || []).map((honor: string) => `• ${honor}`)
          ]
          
          const newSection = {
            id: Date.now().toString(),
            title: 'Education',
            bullets: educationBullets.map(edu => ({
              id: Date.now().toString() + Math.random(),
              text: edu,
              params: {}
            }))
          }
          
          console.log('New education section:', newSection)
          
          const newResumeData = { 
            ...resumeData, 
            sections: [...resumeData.sections, newSection] 
          }
          console.log('New resume data with education:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      }
    } catch (error) {
      console.error('Error adding content:', error)
      alert('Failed to add content: ' + (error as Error).message)
    }
  }

  return (
    <div className="editor-shell min-h-screen bg-body-gradient text-text-primary">
      {mounted && !showWizard && (
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-500/85 shadow-card backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mobile-header">
              <a href="/" className="flex items-center gap-3 text-sm font-semibold text-white transition hover:opacity-80">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-base shadow-glow">
                  ER
                </span>
                <span className="hidden text-base sm:inline">editresume.io</span>
              </a>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mobile-header-buttons">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <a
                      href="/profile"
                      className="inline-flex items-center gap-2 rounded-pill border border-border-subtle bg-white/5 px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                    >
                      👋 {user?.name}
                      {user?.isPremium && (
                        <span className="rounded-pill bg-white/15 px-2 py-0.5 text-[11px] text-accent-pink">
                          PRO
                        </span>
                      )}
                    </a>
                    <button
                      onClick={logout}
                      className="rounded-pill border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="button-primary text-xs sm:text-sm"
                  >
                    🔐 Sign In
                  </button>
                )}
                <button
                  onClick={() => setShowCoverLetterGenerator(true)}
                  className="rounded-pill border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                >
                  📝 Cover Letter
                </button>
                {isAuthenticated && currentResumeId && (
                  <button
                    onClick={() => setShowShareResume(true)}
                    className="rounded-pill border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                  >
                    🔗 Share
                  </button>
                )}
                {isAuthenticated && user && (
                  <button
                    onClick={async () => {
                      if (!resumeData.name && !resumeData.sections?.length) {
                        alert('Please add some content to your resume before saving');
                        return;
                      }
                      const resumeName = prompt('Enter a name for this resume:', resumeData.name || 'My Resume');
                      if (!resumeName) return;
                      
                      try {
                        const cleanedSections = resumeData.sections.map((section: any) => ({
                          id: section.id,
                          title: section.title,
                          bullets: section.bullets.map((bullet: any) => ({
                            id: bullet.id,
                            text: bullet.text,
                            params: {}
                          }))
                        }));
                        
                        const response = await fetch(`${config.apiBase}/api/resume/save?user_email=${encodeURIComponent(user.email)}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: resumeName,
                            title: resumeData.title || '',
                            email: resumeData.email || '',
                            phone: resumeData.phone || '',
                            location: resumeData.location || '',
                            summary: resumeData.summary || '',
                            sections: cleanedSections,
                            template: selectedTemplate
                          })
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            setCurrentResumeId(result.resume_id);
                            
                            // Show toast notification instead of navigating
                            const notification = document.createElement('div');
                            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
                            notification.innerHTML = `
                              <div class="flex items-center gap-3">
                                <div class="text-2xl">✅</div>
                                <div>
                                  <div class="font-bold text-lg">Resume Saved!</div>
                                  <div class="text-sm mt-1">${resumeName}</div>
                                  <div class="text-xs mt-1 text-green-100">Saved to Master Resumes</div>
                                </div>
                                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
                              </div>
                            `;
                            document.body.appendChild(notification);
                            setTimeout(() => notification.remove(), 5000);
                          } else {
                            throw new Error(result.message || 'Save failed');
                          }
                        } else {
                          throw new Error(`HTTP ${response.status}`);
                        }
                      } catch (error) {
                        console.error('Failed to save resume:', error);
                        alert(`Failed to save resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    className="rounded-pill bg-gradient-to-r from-accent-gradientStart via-primary to-accent-gradientEnd px-5 py-2 text-xs font-semibold text-white shadow-glow transition hover:translate-y-[-2px]"
                  >
                    💾 Save Resume
                  </button>
                )}
                <button
                  onClick={() => {
                    console.log('New Resume button clicked')
                    setShowWizard(true)
                  }}
                  className="rounded-pill border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                >
                  ✨ New Resume
                </button>
                
                {!resumeData.name && (
                  <span className="text-[11px] italic text-text-muted">
                    Enter your name to enable export →
                  </span>
                )}
                
                <button 
                  onClick={() => handleExport('docx')}
                  disabled={isExporting || !resumeData.name}
                  className="rounded-pill bg-gradient-to-r from-accent-teal to-emerald-400 px-5 py-2 text-xs font-semibold text-surface-900 shadow-glow transition hover:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
                  title={!resumeData.name ? "Enter your name first" : "Export as DOCX"}
                >
                  📄 Export DOCX
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || !resumeData.name}
                  className="rounded-pill bg-gradient-to-r from-accent-gradientStart via-primary to-accent-gradientEnd px-5 py-2 text-xs font-semibold text-white shadow-glow transition hover:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
                  title={!resumeData.name ? "Enter your name first" : "Export as PDF"}
                >
                  {isExporting ? '⏳ Exporting...' : '📥 Export PDF'}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="w-full px-4 py-4">
        {!mounted || showWizard ? (
          <NewResumeWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        ) : currentView === 'jobs' ? (
          <JobsView onBack={() => setCurrentView('editor')} />
        ) : currentView === 'resumes' ? (
          <ResumesView onBack={() => setCurrentView('editor')} />
        ) : (
          <div className="space-y-4">
            {/* Visual Editor */}
            <div className="space-y-4">
              {/* Two Column Layout for Visual Editor - 60/40 split */}
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mobile-editor-grid">
                {/* Left - Visual Editor (60% of screen) */}
                <div className="lg:col-span-6 space-y-4 mobile-editor-full">
                  <VisualResumeEditor
                    data={resumeData}
                    onChange={handleResumeDataChange}
                    template={selectedTemplate}
                    onAddContent={handleAddContent}
                    roomId={roomId}
                    onAddComment={handleAddComment}
                    onResolveComment={handleResolveComment}
                    onDeleteComment={handleDeleteComment}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    onLeaveRoom={handleLeaveRoom}
                    isConnected={collaboration.isConnected}
                    activeUsers={collaboration.activeUsers}
                    onViewChange={setCurrentView}
                    onAIImprove={async (text: string) => {
                      try {
                        console.log('AI Improve requested for:', text)
                        const response = await fetch(`${config.apiBase}/api/openai/improve-bullet`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bullet: text, tone: 'professional' })
                        })
                        
                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`)
                        }
                        
                        const data = await response.json()
                        console.log('AI Improve response:', data)
                        
                        let improved = data.improved || data.improved_bullet || text
                        improved = improved.replace(/^["']|["']$/g, '')
                        
                        console.log('Final improved text:', improved)
                        return improved
                      } catch (error) {
                        console.error('AI improvement failed:', error)
                        alert('AI improvement failed: ' + (error as Error).message)
                        return text
                      }
                    }}
                  />
                </div>

                {/* Right - Live Preview (40% of screen) */}
                <div className="lg:col-span-4 mobile-preview-bottom">
                  <div className="sticky top-4">
                    <div className="bg-white rounded-xl shadow-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-700">📄 {previewMode === 'live' ? 'Live Preview' : previewMode === 'match' ? 'Match Job Description' : 'Analysis'}</h3>
                          <div className="inline-flex bg-gray-100 rounded-lg p-1 text-xs">
                            <button
                              className={`px-3 py-1 rounded-md ${previewMode === 'live' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                              onClick={() => setPreviewMode('live')}
                            >
                              Live
                            </button>
                            <button
                              className={`px-3 py-1 rounded-md ${previewMode === 'match' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                              onClick={() => setPreviewMode('match')}
                            >
                              Match JD
                            </button>
                            <button
                              className={`px-3 py-1 rounded-md ${previewMode === 'analysis' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                              onClick={() => setPreviewMode('analysis')}
                            >
                              Analysis
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mobile-preview-controls">
                          {/* Grammar Check Switch */}
                          <button
                            onClick={() => {
                              setGrammarEnabled(!grammarEnabled)
                              setShowGrammarPanel(!grammarEnabled)
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              grammarEnabled
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Toggle Grammar Check"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Grammar</span>
                          </button>
                          
                          {/* Comments Switch */}
                          <button
                            onClick={() => {
                              setCommentsEnabled(!commentsEnabled)
                              setShowCommentsPanel(!commentsEnabled)
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              commentsEnabled
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Toggle Comments"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Comments</span>
                          </button>
                          <button
                            onClick={() => {
                              if (previewMode !== 'live') setPreviewMode('live')
                              setFullscreenPreview(true)
                            }}
                            disabled={previewMode !== 'live'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${previewMode === 'live' ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                            title={previewMode === 'live' ? 'View fullscreen preview' : 'Fullscreen available only in Live mode'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Full Page
                          </button>
                          <div className="mobile-preview-scale">
                            <button
                              onClick={() => setPreviewScale(Math.max(0.4, previewScale - 0.1))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold touch-target"
                            >
                              −
                            </button>
                            <span className="text-xs text-gray-600 min-w-[45px] text-center">{Math.round(previewScale * 100)}%</span>
                            <button
                              onClick={() => setPreviewScale(Math.min(1, previewScale + 0.1))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold touch-target"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="overflow-y-auto overflow-x-hidden border-2 rounded-lg bg-gray-50 flex justify-center" 
                      style={{ 
                        maxHeight: 'calc(100vh - 300px)',
                        minHeight: '400px'
                      }}
                    >
                      {previewMode === 'live' ? (
                        <div style={{ 
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top center',
                          width: '850px',
                          margin: '0 auto'
                        }}>
                          <PreviewPanel
                            key={previewKey}
                            data={resumeData}
                            replacements={replacements}
                            template={selectedTemplate}
                          />
                        </div>
                      ) : previewMode === 'match' ? (
                        <div className="p-3 w-full max-w-4xl">
                          <JobDescriptionMatcher
                            resumeData={resumeData as any}
                            standalone={false}
                            onClose={() => {}}
                            onResumeUpdate={(updatedResume) => {
                              setResumeData(updatedResume);
                              setPreviewKey(prev => prev + 1);
                              if (typeof window !== 'undefined') {
                                try {
                                  localStorage.setItem('resumeData', JSON.stringify(updatedResume));
                                  console.log('💾 Improved resume saved to localStorage');
                                } catch (error) {
                                  console.error('Error saving improved resume:', error);
                                }
                              }
                            }}
                            initialJobDescription={deepLinkedJD || undefined}
                            onSelectJobDescriptionId={(id) => {
                              setActiveJobDescriptionId(id);
                              // Also fetch and save the JD content
                              if (id) {
                                fetch(`${config.apiBase}/api/job-descriptions/${id}`)
                                  .then(res => res.ok ? res.json() : null)
                                  .then(data => {
                                    if (data && data.content) {
                                      setDeepLinkedJD(data.content);
                                      if (typeof window !== 'undefined') {
                                        localStorage.setItem('deepLinkedJD', data.content);
                                      }
                                    }
                                  })
                                  .catch(() => {})
                              }
                            }}
                            currentJobDescriptionId={activeJobDescriptionId}
                          />
                        </div>
                      ) : (
                        <div className="p-3 w-full max-w-4xl">
                          <EnhancedATSScoreWidget resumeData={resumeData as any} onClose={() => {}} inline={true} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Content Wizard */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-purple-900 mb-1">🤖 AI Content Wizard</h3>
                      <p className="text-sm text-purple-700">Add new content to your resume with AI assistance</p>
                    </div>
                    <button
                      onClick={() => setShowAIWizard(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      ✨ Open AI Wizard
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">💼</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Jobs</h4>
                      <p className="text-xs text-gray-600">Add work experience with AI-generated content</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">🚀</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Projects</h4>
                      <p className="text-xs text-gray-600">Create project entries with technical details</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">🛠️</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Skills</h4>
                      <p className="text-xs text-gray-600">Generate categorized skills sections</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 <strong>How it works:</strong> Tell the AI what you want to add (e.g., "Add a DevOps job at Google with Jenkins and Kubernetes experience"), and it will generate realistic content that fits your resume perfectly.
                      </p>
                    </div>
                  
                </div>


                {/* AI-Powered Resume Improvements */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-purple-900 mb-1">🤖 AI-Powered Resume Improvements</h3>
                      <p className="text-sm text-purple-700">Get intelligent suggestions to optimize your resume with 10 proven improvement strategies</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewMode('analysis')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        🎯 Enhanced ATS Score
                      </button>
                      <button
                        onClick={() => setShowAIImprovements(true)}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        ✨ AI Improvements
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">🎯</div>
                        <h4 className="font-semibold text-gray-900">Enhanced ATS Analysis</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Comprehensive ATS compatibility scoring with AI-powered improvement suggestions</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Structure & formatting analysis</li>
                        <li>• Keyword optimization scoring</li>
                        <li>• Job description alignment</li>
                        <li>• Content quality assessment</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">✨</div>
                        <h4 className="font-semibold text-gray-900">10 AI Improvement Strategies</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Intelligent suggestions based on proven resume improvement techniques</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Professional summary enhancement</li>
                        <li>• Quantified achievements</li>
                        <li>• Career transition support</li>
                        <li>• Leadership emphasis</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700">
                      💡 <strong>How it works:</strong> Our AI analyzes your resume using 10 proven improvement strategies, from professional summary enhancement to ATS optimization. Get specific, actionable suggestions with examples and apply them with one click.
                    </p>
                  </div>
                </div>

                {/* Cover Letter Generator */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-green-900 mb-1">📝 Cover Letter Generator</h3>
                      <p className="text-sm text-green-700">Generate tailored cover letters with AI that match your resume to specific job applications</p>
                    </div>
                    <button
                      onClick={() => setShowCoverLetterGenerator(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      ✨ Generate Cover Letter
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">🎯</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Tailored Content</h4>
                      <p className="text-xs text-gray-600">AI matches your experience to job requirements</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">✏️</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Customizable</h4>
                      <p className="text-xs text-gray-600">Edit each paragraph to your preference</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Export Ready</h4>
                      <p className="text-xs text-gray-600">Export as PDF or DOCX with your resume</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700">
                      💡 <strong>How it works:</strong> Enter the company name, job title, and job description. Choose your preferred tone (professional, friendly, or concise), and AI will generate a personalized cover letter that highlights your relevant experience.
                    </p>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {fullscreenPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
          <div className="relative w-full h-full max-w-[900px] max-h-full flex flex-col">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">Full Page Preview - {selectedTemplate}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  −
                </button>
                <span className="text-white font-semibold min-w-[60px] text-center">{Math.round(previewScale * 100)}%</span>
                <button
                  onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  +
                </button>
                <button
                  onClick={() => setFullscreenPreview(false)}
                  className="ml-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-8 flex justify-center">
              <div 
                className="bg-white shadow-2xl"
                style={{ 
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  width: '850px',
                  margin: '0 auto'
                }}
              >
                {/* Fullscreen always shows Live Preview */}
                <PreviewPanel
                  data={resumeData}
                  replacements={replacements}
                  template={selectedTemplate}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting}
                className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export DOCX
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Cover Letter Generator */}
      {showCoverLetterGenerator && (
        <CoverLetterGenerator
          resumeData={resumeData}
          onClose={() => setShowCoverLetterGenerator(false)}
        />
      )}

      {/* AI Content Wizard */}
      {showAIWizard && (
        <AIWizard
          resumeData={resumeData}
          context={aiWizardContext}
          onAddContent={(newContent) => {
            console.log('=== AI WIZARD ADDING CONTENT ===')
            console.log('New content from AI wizard:', newContent)
            console.log('Content type:', newContent.type)
            console.log('Content data:', newContent.content)
            console.log('Position:', newContent.position)
            console.log('Current resume data before update:', resumeData)
            
            try {
              if (newContent.type === 'job') {
                // Add new job experience
                const workExperienceSection = resumeData.sections.find(s => 
                  s.title.toLowerCase().includes('experience') || 
                  s.title.toLowerCase().includes('work') ||
                  s.title.toLowerCase().includes('employment') ||
                  s.title.toLowerCase().includes('professional')
                )
                
                console.log('Available sections:', resumeData.sections.map(s => s.title))
                console.log('Found work experience section:', workExperienceSection)
                
                if (newContent.content) {
                  let targetSection = workExperienceSection
                  
                  // If no work experience section found, create one
                  if (!targetSection) {
                    console.log('No work experience section found, creating one...')
                    targetSection = {
                      id: Date.now().toString(),
                      title: 'Work Experience',
                      bullets: []
                    }
                    // Add the new section to the beginning of sections array
                    resumeData.sections.unshift(targetSection)
                  }
                  const content = newContent.content
                  const bullets = content.bullets || []
                  
                  console.log('Content bullets:', bullets)
                  
                  console.log('Content validation:', {
                    company: content.company,
                    role: content.role,
                    duration: content.duration,
                    bullets: bullets,
                    fullContent: content
                  })
                  
                  // Handle undefined values with fallbacks
                  const company = content.company || 'Unknown Company'
                  const role = content.role || 'Unknown Role'
                  const duration = content.duration || 'Unknown Duration'
                  
                  console.log('Using fallbacks:', { company, role, duration })
                  
                  const newBullets = [
                    { 
                      id: Date.now().toString(), 
                      text: `**${company} / ${role} / ${duration}**`, 
                      params: {} 
                    },
                    ...bullets.filter((bullet: string) => bullet && bullet.trim()).map((bullet: string) => ({
                      id: Date.now().toString() + Math.random(),
                      text: `• ${bullet}`,
                      params: {}
                    }))
                  ]
                  
                  console.log('New bullets to add:', newBullets)
                  
                  // Clean up existing placeholder entries
                  const cleanExistingBullets = (bullets: any[]) => {
                    return bullets.filter(bullet => 
                      bullet.text && 
                      bullet.text.trim() && 
                      !bullet.text.includes('Company / Role / Duration') &&
                      !bullet.text.includes('**Company**') &&
                      !bullet.text.includes('**Role**') &&
                      !bullet.text.includes('**Duration**')
                    )
                  }
                  
                  const updatedSections = resumeData.sections.map(section => {
                    if (section.id === targetSection.id) {
                      let updatedBullets
                      const cleanedExistingBullets = cleanExistingBullets(section.bullets)
                      
                      if (newContent.position === 'beginning') {
                        updatedBullets = [...newBullets, ...cleanedExistingBullets]
                      } else if (newContent.position === 'middle') {
                        const middleIndex = Math.floor(cleanedExistingBullets.length / 2)
                        const newBulletsList = [...cleanedExistingBullets]
                        newBulletsList.splice(middleIndex, 0, ...newBullets)
                        updatedBullets = newBulletsList
                      } else {
                        updatedBullets = [...cleanedExistingBullets, ...newBullets]
                      }
                      
                      console.log('Updated bullets for section:', updatedBullets)
                      return { ...section, bullets: updatedBullets }
                    }
                    return section
                  })
                  
                  console.log('Updated sections:', updatedSections)
                  const newResumeData = { ...resumeData, sections: updatedSections }
                  console.log('New resume data:', newResumeData)
                  console.log('Calling handleResumeDataChange to update preview...')
                  handleResumeDataChange(newResumeData)
                  console.log('handleResumeDataChange completed')
                } else {
                  console.log('No content provided')
                }
              } else if (newContent.type === 'project') {
                // Add new project
                const projectsSection = resumeData.sections.find(s => 
                  s.title.toLowerCase().includes('project')
                ) || resumeData.sections[0] // fallback to first section
                
                console.log('Found projects section:', projectsSection)
                
                if (newContent.content) {
                  const content = newContent.content
                  const bullets = content.bullets || []
                  
                  const newBullets = [
                    { id: Date.now().toString(), text: `**${content.name || 'Project Name'}**`, params: {} },
                    { id: Date.now().toString() + '1', text: content.description || 'Project description', params: {} },
                    ...bullets.map((bullet: string) => ({
                      id: Date.now().toString() + Math.random(),
                      text: `• ${bullet}`,
                      params: {}
                    }))
                  ]
                  
                  console.log('New project bullets:', newBullets)
                  
                  const updatedSections = resumeData.sections.map(section => {
                    if (section.id === projectsSection.id) {
                      const updatedBullets = [...section.bullets, ...newBullets]
                      console.log('Updated project bullets:', updatedBullets)
                      return { ...section, bullets: updatedBullets }
                    }
                    return section
                  })
                  
                  const newResumeData = { ...resumeData, sections: updatedSections }
                  console.log('New resume data with project:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              } else if (newContent.type === 'skill') {
                // Add new skills section
                if (newContent.content && newContent.content.categories) {
                  const categories = newContent.content.categories
                  const skillBullets = Object.entries(categories).map(([category, skills]) => 
                    `**${category}:** ${Array.isArray(skills) ? skills.join(', ') : skills}`
                  )
                  
                  const newSection = {
                    id: Date.now().toString(),
                    title: 'Skills',
                    bullets: skillBullets.map(skill => ({
                      id: Date.now().toString() + Math.random(),
                      text: skill,
                      params: {}
                    }))
                  }
                  
                  console.log('New skills section:', newSection)
                  
                  const newResumeData = { 
                    ...resumeData, 
                    sections: [...resumeData.sections, newSection] 
                  }
                  console.log('New resume data with skills:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              } else if (newContent.type === 'education') {
                // Add new education section
                if (newContent.content) {
                  const content = newContent.content
                  const educationBullets = [
                    `**${content.institution || 'Institution'}**`,
                    `${content.degree || 'Degree'} - ${content.year || 'Year'}`,
                    ...(content.coursework || []).map((course: string) => `• ${course}`),
                    ...(content.honors || []).map((honor: string) => `• ${honor}`)
                  ]
                  
                  const newSection = {
                    id: Date.now().toString(),
                    title: 'Education',
                    bullets: educationBullets.map(edu => ({
                      id: Date.now().toString() + Math.random(),
                      text: edu,
                      params: {}
                    }))
                  }
                  
                  console.log('New education section:', newSection)
                  
                  const newResumeData = { 
                    ...resumeData, 
                    sections: [...resumeData.sections, newSection] 
                  }
                  console.log('New resume data with education:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              }
              
              setShowAIWizard(false)
            } catch (error) {
              console.error('Error adding content:', error)
              alert('Failed to add content: ' + (error as Error).message)
            }
          }}
          onClose={() => {
            setShowAIWizard(false)
            setAiWizardContext(null)
          }}
        />
      )}

      {/* ATS/Analysis modals removed: Analysis lives only in side preview via previewMode */}

      {/* AI Improvement Widget */}
      {showAIImprovements && (
        <AIImprovementWidget
          resumeData={resumeData}
          jobDescription=""
          targetRole=""
          industry=""
          onClose={() => setShowAIImprovements(false)}
        />
      )}

      {/* Version Control Panel */}
      {showVersionControl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Version Control</h2>
                <button
                  onClick={() => setShowVersionControl(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <VersionControlPanel
                resumeId={currentResumeId || undefined}
                resumeData={resumeData}
                onVersionLoad={handleVersionLoad}
                onSaveVersion={handleVersionSave}
                onCompareVersions={handleCompareVersions}
              />
            </div>
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {showVersionComparison && comparisonVersions && (
        <VersionComparisonModal
          isOpen={showVersionComparison}
          onClose={() => {
            setShowVersionComparison(false)
            setComparisonVersions(null)
          }}
          version1Id={comparisonVersions.version1Id}
          version2Id={comparisonVersions.version2Id}
        />
      )}

      {/* Export Analytics Dashboard */}
      {showExportAnalytics && (
        <ExportAnalyticsDashboard
          isOpen={showExportAnalytics}
          onClose={() => setShowExportAnalytics(false)}
        />
      )}

      {/* Share Resume Modal */}
      {showShareResume && currentResumeId && (
        <ShareResumeModal
          isOpen={showShareResume}
          onClose={() => setShowShareResume(false)}
          resumeId={currentResumeId}
          resumeName={resumeData.name || 'Untitled Resume'}
          resumeData={{
            personalInfo: {
              name: resumeData.name,
              title: resumeData.title,
              email: resumeData.email,
              phone: resumeData.phone,
              location: resumeData.location
            },
            summary: resumeData.summary,
            sections: resumeData.sections,
            template: selectedTemplate
          }}
        />
      )}

      {/* Job Match Analytics Dashboard */}
      {showJobMatchAnalytics && (
        <JobMatchAnalyticsDashboard
          isOpen={showJobMatchAnalytics}
          onClose={() => setShowJobMatchAnalytics(false)}
        />
      )}

      {/* Grammar Check Panel */}
      {showGrammarPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => {
          setShowGrammarPanel(false)
          setGrammarEnabled(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-[10001]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Grammar & Style Checker
              </h2>
              <button
                onClick={() => {
                  setShowGrammarPanel(false)
                  setGrammarEnabled(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <GrammarStylePanel
                resumeData={resumeData}
                onApplySuggestion={(sectionId: string, bulletId: string, newText: string) => {
                  const sections = resumeData.sections.map(section =>
                    section.id === sectionId
                      ? {
                          ...section,
                          bullets: section.bullets.map(bullet =>
                            bullet.id === bulletId
                              ? { ...bullet, text: newText }
                              : bullet
                          )
                        }
                      : section
                  )
                  handleResumeDataChange({ ...resumeData, sections })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Comments Panel */}
      {showCommentsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => {
          setShowCommentsPanel(false)
          setCommentsEnabled(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden z-[10001]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments & Feedback
              </h2>
              <button
                onClick={() => {
                  setShowCommentsPanel(false)
                  setCommentsEnabled(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Comments Feature</h3>
                <p className="text-gray-600 mb-4">
                  Comments are available for individual sections and bullets in the editor.
                </p>
                <p className="text-sm text-gray-500">
                  Click on any section or bullet point in the visual editor to add comments and feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-body-gradient">
          <div className="rounded-[28px] border border-border-subtle bg-surface-500/85 px-10 py-8 text-center shadow-card backdrop-blur">
            <div className="mb-4 text-3xl animate-pulse">🛠️</div>
            <p className="text-sm font-semibold text-text-secondary">Loading editor…</p>
          </div>
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  )
}


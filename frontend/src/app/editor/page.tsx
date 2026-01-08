'use client'
import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import config from '@/lib/config'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { getOrCreateGuestSessionId } from '@/lib/guestAuth'
import UpgradePrompt from '@/components/Shared/UpgradePrompt'
import { deduplicateSections, sortSectionsByDefaultOrder } from '@/utils/sectionDeduplication'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import GlobalReplacements from '@/components/AI/GlobalReplacements'
import TemplateSelector from '@/components/Resume/TemplateSelector'
import AuthModal from '@/components/Shared/Auth/AuthModal'
import ModernEditorLayout from '@/components/Editor/ModernEditorLayout'
import ActionsDrawer from '@/components/Editor/ActionsDrawer'
import EnhancedATSScoreWidget from '@/components/AI/EnhancedATSScoreWidget'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import AIImprovementWidget from '@/components/AI/AIImprovementWidget'
import JobsView from '@/components/Editor/JobsView'
import ResumesView from '@/components/Resume/ResumesView'

const VersionComparisonModal = dynamic(() => import('@/components/Resume/VersionComparisonModal'), {
  ssr: false,
})

const NewResumeWizard = dynamic(() => import('@/components/Editor/NewResumeWizard'), {
  ssr: false,
})

const TemplateDesignPage = dynamic(() => import('@/components/Editor/TemplateDesignPage'), {
  ssr: false,
})
import { useCollaboration } from '@/hooks/useCollaboration'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { versionControlService } from '@/lib/services/versionControl'
import { shouldPromptAuthentication } from '@/lib/guestAuth'
import { getAuthHeadersAsync } from '@/lib/auth'
import { ResumeAutomationFlow } from '@/features/resume-automation/components/ResumeAutomationFlow'
import { ATSScoreCard } from '@/features/resume-automation/components/ATSScoreCard'
import { OptimizationSuggestions } from '@/features/resume-automation/components/OptimizationSuggestions'
import type {
  AutoGenerateResponse,
  ATSScore as AutomationATSScore,
  GenerationInsights,
} from '@/features/resume-automation/types'
import type { TemplateConfig } from '@/features/resume/templates/types'
import { templateRegistry } from '@/features/resume/templates'

const mapTemplateId = (oldId: string): string => {
  const mapping: Record<string, string> = {
    'clean': 'classic',
    'tech': 'modern',
    'modern': 'modern',
    'two-column': 'two-column',
    'compact': 'classic',
    'minimal': 'modern',
  }
  return mapping[oldId] || oldId
}

const normalizeSectionsForState = (sections: any[]) => {
  const deduplicated = deduplicateSections(sections)
  const sorted = sortSectionsByDefaultOrder(deduplicated)
  return sorted.map(section => ({
    id: section.id,
    title: section.title,
    bullets: section.bullets.map(bullet => ({
      id: bullet.id,
      text: bullet.text,
      params: bullet.params ? Object.fromEntries(
        Object.entries(bullet.params).map(([k, v]) => {
          // Preserve boolean, number, and array types
          if (typeof v === 'boolean' || typeof v === 'number') {
            return [k, v]
          }
          // Preserve arrays (like generatedKeywords)
          if (Array.isArray(v)) {
            return [k, v]
          }
          // Convert other types to string
          return [k, String(v)]
        })
      ) : {}
    }))
  }))
}

const EditorPageContent = () => {
  const { user, isAuthenticated, logout, checkPremiumAccess } = useAuth()
  const { showAlert } = useModal()
  const { checkFeatureAvailability, refreshUsage } = useUsageTracking()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showExportUpgradePrompt, setShowExportUpgradePrompt] = useState(false)
  const [exportUpgradeData, setExportUpgradeData] = useState<{
    currentUsage: number
    limit: number | null
    period: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showWizard, setShowWizard] = useState(false) // Wizard removed - always show editor directly
  const [showActionsDrawer, setShowActionsDrawer] = useState(false)
  const [activeAction, setActiveAction] = useState<'ai-wizard' | 'cover-letter' | 'version-control' | 'share' | 'export-analytics' | 'job-match-analytics'>('ai-wizard')
  const [aiWizardContext, setAiWizardContext] = useState<any>(null)
  const [showATSScore, setShowATSScore] = useState(false)
  const [showEnhancedATS, setShowEnhancedATS] = useState(false)
  const [showAIImprovements, setShowAIImprovements] = useState(false)
  const [showVersionComparison, setShowVersionComparison] = useState(false)
  const [showTemplateDesignPage, setShowTemplateDesignPage] = useState(false)
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | undefined>(undefined)
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null)
  const [commentsEnabled, setCommentsEnabled] = useState(false)
  const [showCommentsPanel, setShowCommentsPanel] = useState(false)
  const [comparisonVersions, setComparisonVersions] = useState<{ version1Id: number; version2Id: number } | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [currentView, setCurrentView] = useState<'editor' | 'jobs' | 'resumes'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const view = params.get('view')
      if (view === 'jobs' || view === 'resumes') {
        return view
      }
    }
    return 'editor'
  })
  const [latestCoverLetter, setLatestCoverLetter] = useState<string | null>(null)

  // Listen for cover letter selection from job detail view
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleCoverLetterSelected = (event: CustomEvent) => {
      if (event.detail?.content) {
        setLatestCoverLetter(event.detail.content)
      }
    }

    // Check localStorage for selected cover letter
    const checkSelectedCoverLetter = () => {
      try {
        const stored = localStorage.getItem('selectedCoverLetter')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.content) {
            setLatestCoverLetter(parsed.content)
          }
        }
      } catch (e) {
        console.error('Failed to read selected cover letter from localStorage:', e)
      }
    }

    checkSelectedCoverLetter()
    window.addEventListener('coverLetterSelected', handleCoverLetterSelected as EventListener)
    
    return () => {
      window.removeEventListener('coverLetterSelected', handleCoverLetterSelected as EventListener)
    }
  }, [])
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [fullscreenExportMenuOpen, setFullscreenExportMenuOpen] = useState(false)
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
  
  const [automationSignal, setAutomationSignal] = useState(0)
  const [autoGeneratedMetadata, setAutoGeneratedMetadata] = useState<{
    atsScore: AutomationATSScore
    insights: GenerationInsights
  } | null>(null)

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
  const exportMenuRef = useRef<HTMLDivElement | null>(null)
  const fullscreenExportMenuRef = useRef<HTMLDivElement | null>(null)
  const skipHistoryRef = useRef(false)
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const undoRedo = useUndoRedo(resumeData)

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
      if (
        fullscreenExportMenuRef.current &&
        !fullscreenExportMenuRef.current.contains(event.target as Node)
      ) {
        setFullscreenExportMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (showActionsDrawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showActionsDrawer])
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
          sections: normalizeSectionsForState(sections)
        }

        if (cancelled) return

        skipHistoryRef.current = true
        setResumeData(normalizedResume)
        undoRedo.setState(normalizedResume, true)
        setPreviewKey((prev) => prev + 1)
        setTimeout(() => {
          skipHistoryRef.current = false
        }, 0)
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
        
        // Handle JD ID after resume is loaded to ensure match mode activates
        const jdIdParam = searchParams.get('jdId')
        if (jdIdParam && !cancelled) {
          const jobId = Number(jdIdParam)
          if (!isNaN(jobId)) {
            setActiveJobDescriptionId(jobId)
            const savedJD = localStorage.getItem('deepLinkedJD')
            if (savedJD) {
              setDeepLinkedJD(savedJD)
              setPreviewMode('match')
            } else {
              (async () => {
                try {
                  const headers = await getAuthHeadersAsync();
                  const [newJob, legacyJob] = await Promise.all([
                    fetch(`${config.apiBase}/api/jobs/${jobId}`, {
                      headers
                    }).then(res => {
                      if (res.status === 404) return null;
                      if (!res.ok) {
                        console.warn(`Job ${jobId} fetch failed: ${res.status}`);
                        return null;
                      }
                      return res.json();
                    }).catch(err => {
                      console.warn(`Job ${jobId} fetch error:`, err);
                      return null;
                    }),
                    fetch(`${config.apiBase}/api/job-descriptions/${jobId}`).then(res => {
                      if (res.status === 404) return null;
                      if (!res.ok) {
                        console.warn(`Legacy job ${jobId} fetch failed: ${res.status}`);
                        return null;
                      }
                      return res.json();
                    }).catch(err => {
                      console.warn(`Legacy job ${jobId} fetch error:`, err);
                      return null;
                    })
                  ]);
                  
                  if (!cancelled) {
                    const jobData = newJob || legacyJob
                    if (jobData) {
                      const description = newJob?.description || legacyJob?.content || ''
                      if (description) {
                        setDeepLinkedJD(description)
                        setPreviewMode('match')
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('deepLinkedJD', description)
                          localStorage.setItem('activeJobDescriptionId', String(jobId))
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error('Failed to load job description:', error)
                }
              })();
            }
          }
        }
      } catch (error) {
        console.error('Failed to load resume from server:', error)
      }
    }

    fetchResumeData()

    return () => {
      cancelled = true
    }
  }, [resumeIdParam, resumeVersionIdParam, isAuthenticated, user?.email, searchParams])

  // Handle client-side mounting to avoid hydration errors
  useEffect(() => {
    setMounted(true)
    
    // Check if this is an upload - if so, don't load from localStorage
    const resumeUploadParam = searchParams.get('resumeUpload')
    const uploadToken = searchParams.get('uploadToken')
    const jdIdParam = searchParams.get('jdId')
    
    // Don't clear JD data on mount - preserve selected job description across navigation
    // Only clear if it's an explicit upload without jdId
    if (resumeUploadParam === '1' && uploadToken && !jdIdParam && typeof window !== 'undefined') {
      // This is an upload without jdId - clear JD data
      localStorage.removeItem('deepLinkedJD')
      localStorage.removeItem('activeJobDescriptionId')
      localStorage.removeItem('extractedKeywords')
      localStorage.removeItem('currentJDKeywords')
      localStorage.removeItem('currentMatchResult')
      setDeepLinkedJD(null)
      setActiveJobDescriptionId(null)
    }
    
    if (resumeUploadParam === '1' && uploadToken) {
      // This is an upload - don't load from localStorage, let the upload handler do it
      console.log('📤 Upload detected, skipping localStorage load')
      // Clear JD unless jdId is explicitly in URL
      if (!jdIdParam && typeof window !== 'undefined') {
        localStorage.removeItem('deepLinkedJD')
        localStorage.removeItem('activeJobDescriptionId')
        localStorage.removeItem('extractedKeywords')
        localStorage.removeItem('currentJDKeywords')
        localStorage.removeItem('currentMatchResult')
        setDeepLinkedJD(null)
        setActiveJobDescriptionId(null)
      }
      return
    }
    
    // Load resume data from localStorage after mount (only if not an upload)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('resumeData')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && (parsed.name || parsed.sections?.length > 0)) {
            console.log('📂 Loading resume from localStorage on mount:', parsed)
            skipHistoryRef.current = true
            setResumeData(parsed)
            undoRedo.setState(parsed, true)
            setTimeout(() => {
              skipHistoryRef.current = false
            }, 0)
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
  }, [searchParams]) // Include searchParams to check for upload

  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = searchParams.get('autoGenerated')
    const jdIdParam = searchParams.get('jdId')
    
    if (flag === '1') {
      try {
        const stored = localStorage.getItem('autoGeneratedATS')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed?.atsScore && parsed?.insights) {
            setAutoGeneratedMetadata({
              atsScore: parsed.atsScore,
              insights: parsed.insights,
            })
          }
          localStorage.removeItem('autoGeneratedATS')
        }
      } catch (error) {
        console.error('Failed loading auto-generated insights', error)
      }
    }
    
    // Handle JD ID from URL - switch to Match JD mode
    if (jdIdParam) {
      const jobId = Number(jdIdParam)
      if (!isNaN(jobId)) {
        console.log('Setting active JD from URL:', jobId)
        setActiveJobDescriptionId(jobId)
        
        // Check localStorage first for the JD content
        const savedJD = localStorage.getItem('deepLinkedJD')
        if (savedJD) {
          console.log('Loading JD from localStorage')
          setDeepLinkedJD(savedJD)
          setPreviewMode('match')
        } else {
          // Fetch from API
          console.log('Fetching JD from API');
          (async () => {
            try {
              const headers = await getAuthHeadersAsync();
              const [newJob, legacyJob] = await Promise.all([
                fetch(`${config.apiBase}/api/jobs/${jobId}`, {
                  headers
                }).then(res => {
                  if (res.status === 404) return null;
                  if (!res.ok) {
                    console.warn(`Job ${jobId} fetch failed: ${res.status}`);
                    return null;
                  }
                  return res.json();
                }).catch(err => {
                  console.warn(`Job ${jobId} fetch error:`, err);
                  return null;
                }),
                fetch(`${config.apiBase}/api/job-descriptions/${jobId}`).then(res => {
                  if (res.status === 404) return null;
                  if (!res.ok) {
                    console.warn(`Legacy job ${jobId} fetch failed: ${res.status}`);
                    return null;
                  }
                  return res.json();
                }).catch(err => {
                  console.warn(`Legacy job ${jobId} fetch error:`, err);
                  return null;
                })
              ]);
              
              const jobData = newJob || legacyJob
              if (jobData) {
                const description = newJob?.description || legacyJob?.content || ''
                if (description) {
                  console.log('Loaded JD from API, setting preview mode to match')
                  setDeepLinkedJD(description)
                  setPreviewMode('match')
                  // Store extracted_keywords if available (from extension)
                  const extractedKeywords = newJob?.extracted_keywords || legacyJob?.extracted_keywords
                  if (extractedKeywords && typeof window !== 'undefined') {
                    localStorage.setItem('extractedKeywords', JSON.stringify(extractedKeywords))
                  }
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('deepLinkedJD', description)
                    localStorage.setItem('activeJobDescriptionId', String(jobId))
                  }
                }
              }
            } catch (error) {
              console.error('Failed to load job description:', error)
            }
          })();
        }
      }
    }
  }, [searchParams])

  // Initialize templateConfig from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || templateConfig !== undefined) return
    
    try {
      const savedConfig = localStorage.getItem('templateConfig')
      const savedTemplate = localStorage.getItem('selectedTemplate') || selectedTemplate
      
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        // Verify it matches the current template
        const mappedTemplateId = mapTemplateId(savedTemplate)
        const template = templateRegistry.find(t => t.id === mappedTemplateId)
        if (template && parsed) {
          setTemplateConfig(parsed as TemplateConfig)
          return
        }
      }
      
      // If no saved config or template mismatch, use default
      const mappedTemplateId = mapTemplateId(savedTemplate)
      const template = templateRegistry.find(t => t.id === mappedTemplateId)
      if (template) {
        setTemplateConfig(template.defaultConfig)
      }
    } catch (e) {
      console.error('Error loading templateConfig from localStorage:', e)
      const mappedTemplateId = mapTemplateId(selectedTemplate)
      const template = templateRegistry.find(t => t.id === mappedTemplateId)
      if (template) {
        setTemplateConfig(template.defaultConfig)
      }
    }
  }, [selectedTemplate]) // Only run once on mount

  // Save templateConfig to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !templateConfig) return
    
    try {
      localStorage.setItem('templateConfig', JSON.stringify(templateConfig))
    } catch (e) {
      console.error('Error saving templateConfig to localStorage:', e)
    }
  }, [templateConfig])

  const autoGeneratedSummary = useMemo<AutoGenerateResponse | null>(() => {
    if (!autoGeneratedMetadata) return null
    return {
      resume: {
        id: currentResumeId ?? 0,
        name: resumeData.name,
        title: resumeData.title,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        summary: resumeData.summary,
        template: selectedTemplate,
        created_at: null,
        updated_at: null,
      },
      version: {
        id: 0,
        resume_id: currentResumeId ?? 0,
        version_number: 0,
        resume_data: {},
        created_at: null,
        change_summary: 'Auto-generated draft',
      },
      ats_score: autoGeneratedMetadata.atsScore,
      insights: autoGeneratedMetadata.insights,
    }
  }, [autoGeneratedMetadata, currentResumeId, resumeData, selectedTemplate])

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
  // Only initialize from localStorage if jdId query param exists
  const [deepLinkedJD, setDeepLinkedJD] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const jdIdParam = new URLSearchParams(window.location.search).get('jdId');
      // Only load from localStorage if jdId is in URL
      if (jdIdParam) {
        const saved = localStorage.getItem('deepLinkedJD');
        return saved || null;
      }
      // Clear JD if no jdId in URL
      localStorage.removeItem('deepLinkedJD');
      localStorage.removeItem('currentJDKeywords');
      localStorage.removeItem('currentMatchResult');
      return null;
    }
    return null;
  })
  const [activeJobDescriptionId, setActiveJobDescriptionId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      // Always try to load from localStorage first for persistence
      const saved = localStorage.getItem('activeJobDescriptionId');
      if (saved) {
        return parseInt(saved);
      }
      // Fallback to URL parameter if no saved value
      const jdIdParam = new URLSearchParams(window.location.search).get('jdId');
      if (jdIdParam) {
        const jobId = parseInt(jdIdParam);
        return isNaN(jobId) ? null : jobId;
      }
      return null;
    }
    return null;
  })
  
  // Always save JD to localStorage for persistence across page navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
        if (activeJobDescriptionId !== null) {
          localStorage.setItem('activeJobDescriptionId', activeJobDescriptionId.toString());
      } else {
        // Only clear if explicitly set to null (not just missing from URL)
        localStorage.removeItem('activeJobDescriptionId');
        }
        if (deepLinkedJD) {
          localStorage.setItem('deepLinkedJD', deepLinkedJD);
        }
      }
  }, [activeJobDescriptionId, deepLinkedJD]);
  
  // Load JD when we have a saved ID but no description (either from URL or localStorage)
  useEffect(() => {
    if (!activeJobDescriptionId || deepLinkedJD) return;
    
    const jdIdParam = searchParams.get('jdId');
    // Fetch if: (1) jdId is in URL, or (2) we have saved ID but no JD content yet
    const shouldFetch = jdIdParam || (typeof window !== 'undefined' && localStorage.getItem('activeJobDescriptionId'));
    
    if (shouldFetch) {
      const fetchJobDescription = async () => {
        try {
          const headers = await getAuthHeadersAsync();
          const [newJob, legacyJob] = await Promise.all([
            fetch(`${config.apiBase}/api/jobs/${activeJobDescriptionId}`, {
              headers
            }).then(res => {
              if (res.status === 404) return null;
              if (!res.ok) return null;
              return res.json();
            }).catch(() => null),
            fetch(`${config.apiBase}/api/job-descriptions/${activeJobDescriptionId}`).then(res => {
              if (res.status === 404) return null;
              if (!res.ok) return null;
              return res.json();
            }).catch(() => null)
          ]);
          
          const jobData = newJob || legacyJob;
          if (jobData) {
            const description = newJob?.description || legacyJob?.content || '';
            if (description) {
              setDeepLinkedJD(description);
            }
          } else {
            // Job not found - clear stale ID
            if (typeof window !== 'undefined') {
              localStorage.removeItem('activeJobDescriptionId');
              localStorage.removeItem('deepLinkedJD');
              localStorage.removeItem('extractedKeywords');
            }
            setActiveJobDescriptionId(null);
            setDeepLinkedJD(null);
          }
        } catch (error) {
          console.warn('Failed to load job description:', error);
        }
      };
      
      fetchJobDescription();
    }
  }, [activeJobDescriptionId, deepLinkedJD, searchParams]);
  
  // Don't clear JD data when jdId is removed from URL - keep it for persistence
  // Only restore from localStorage if we don't have activeJobDescriptionId set
  useEffect(() => {
    if (typeof window === 'undefined') return
    const jdIdParam = searchParams.get('jdId')
    
    // If jdId is in URL, use it (it will be handled by other useEffect)
    if (jdIdParam) {
      const jobId = Number(jdIdParam)
      if (!isNaN(jobId) && activeJobDescriptionId !== jobId) {
        setActiveJobDescriptionId(jobId)
      }
      return
    }
    
    // If no jdId in URL, restore from localStorage if we don't have an active ID
    // This allows persistence when navigating back to editor
    if (!jdIdParam && !activeJobDescriptionId && typeof window !== 'undefined') {
      const savedId = localStorage.getItem('activeJobDescriptionId')
      if (savedId) {
        const jobId = parseInt(savedId)
        if (!isNaN(jobId)) {
          setActiveJobDescriptionId(jobId)
          // Also try to restore the JD content if available
          const savedJD = localStorage.getItem('deepLinkedJD')
          if (savedJD && !deepLinkedJD) {
            setDeepLinkedJD(savedJD)
          }
        }
      }
    }
  }, [searchParams, activeJobDescriptionId, deepLinkedJD])

  useEffect(() => {
    const id = searchParams.get('jdId')
    if (id) {
      const jobId = Number(id)
      setActiveJobDescriptionId(jobId);
      
      (async () => {
        try {
          const headers = await getAuthHeadersAsync();
          const [newJob, legacyJob] = await Promise.all([
            fetch(`${config.apiBase}/api/jobs/${jobId}`, {
              headers
            }).then(res => {
              if (res.status === 404) return null;
              if (!res.ok) {
                console.warn(`Job ${jobId} fetch failed: ${res.status}`);
                return null;
              }
              return res.json();
            }).catch(err => {
              console.warn(`Job ${jobId} fetch error:`, err);
              return null;
            }),
            fetch(`${config.apiBase}/api/job-descriptions/${jobId}`).then(res => {
              if (res.status === 404) return null;
              if (!res.ok) {
                console.warn(`Legacy job ${jobId} fetch failed: ${res.status}`);
                return null;
              }
              return res.json();
            }).catch(err => {
              console.warn(`Legacy job ${jobId} fetch error:`, err);
              return null;
            })
          ]);
          
          const jobData = newJob || legacyJob
          if (jobData) {
            const description = newJob?.description || legacyJob?.content || ''
            if (description) {
              setDeepLinkedJD(description)
              setPreviewMode('match')
            }
          } else {
            // Job not found - clear the ID from URL and localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('activeJobDescriptionId');
              localStorage.removeItem('deepLinkedJD');
              localStorage.removeItem('extractedKeywords');
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('jdId');
              window.history.replaceState({}, '', newUrl.toString());
            }
            setActiveJobDescriptionId(null);
            setDeepLinkedJD(null);
          }
        } catch (error) {
          // Silently handle errors
        }
      })();
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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
      
      // Check if user is typing in an input/textarea to avoid conflicts
      const activeElement = document.activeElement
      const isHTMLElement = activeElement instanceof HTMLElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (isHTMLElement && activeElement.isContentEditable)
      )
      
      // Only handle shortcuts when not typing in inputs (except for contentEditable which we want to handle)
      if (isInputFocused && activeElement?.tagName !== 'DIV' && !(isHTMLElement && activeElement.isContentEditable)) {
        return
      }
      
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (undoRedo.canUndo) {
          undoRedo.undo()
        }
        return
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (undoRedo.canRedo) {
          undoRedo.redo()
        }
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoRedo])

  useEffect(() => {
     if (typeof window === 'undefined') return
     const resumeUploadParam = searchParams.get('resumeUpload')
     const uploadToken = searchParams.get('uploadToken')
     const jdIdParam = searchParams.get('jdId')
     if (resumeUploadParam === '1') {
       console.log('📤 Processing upload - clearing cached data')
       setCurrentResumeId(null)
       try {
         // Clear ALL cached resume data to ensure fresh upload
         const keysToRemove = [
           'currentResumeId',
           'currentResumeVersionId',
           'resumeData',
           'selectedTemplate',
           'resumeHistory',
           'twoColumnLeft',
           'twoColumnRight',
           'twoColumnLeftWidth'
         ]
         keysToRemove.forEach(key => localStorage.removeItem(key))
         
         // Clear JD data unless jdId is explicitly in URL
         if (!jdIdParam) {
           localStorage.removeItem('deepLinkedJD')
           localStorage.removeItem('activeJobDescriptionId')
           localStorage.removeItem('extractedKeywords')
           localStorage.removeItem('currentJDKeywords')
           localStorage.removeItem('currentMatchResult')
           setDeepLinkedJD(null)
           setActiveJobDescriptionId(null)
         }
         
         // Clear ALL old sessionStorage upload entries (except current one)
         Object.keys(window.sessionStorage).forEach(key => {
           if (key.startsWith('uploadedResume:') && key !== `uploadedResume:${uploadToken}`) {
             console.log(`🗑️ Removing old sessionStorage entry: ${key}`)
             window.sessionStorage.removeItem(key)
           }
         })
         
         if (uploadToken) {
           const stored = window.sessionStorage.getItem(`uploadedResume:${uploadToken}`)
           if (stored) {
             try {
               const parsed = JSON.parse(stored)
               console.log('📤 Loading uploaded resume from sessionStorage:', parsed)
               if (parsed?.resume) {
                 const sections = parsed.resume.sections || []
                 const normalizedSections = normalizeSectionsForState(sections)
                 const cleanedResume = {
                   ...parsed.resume,
                   sections: normalizedSections
                 }
                 
                console.log(`📋 Final sections after deduplication: ${sections.length} → ${normalizedSections.length}`)
                console.log('📝 Uploaded resume sections:', normalizedSections.map(s => ({ title: s.title, bullets: s.bullets.length })))
                
                // Set the uploaded resume data - this replaces any existing data
                skipHistoryRef.current = true
                setResumeData(cleanedResume)
                undoRedo.setState(cleanedResume, true)
                setTimeout(() => {
                  skipHistoryRef.current = false
                }, 0)
                 
                // Force clear localStorage and save fresh data
                localStorage.removeItem('resumeData')
                localStorage.removeItem('resumeSectionOrder') // Clear old section order to use sorted order
                localStorage.setItem('resumeData', JSON.stringify(cleanedResume))
                console.log('✅ Uploaded resume loaded successfully')
               }
               if (parsed?.template) {
                 setSelectedTemplate(parsed.template)
                 localStorage.setItem('selectedTemplate', parsed.template)
               }
             } catch (e) {
               console.error('Failed to apply uploaded resume payload', e)
             } finally {
               // Clean up sessionStorage
               window.sessionStorage.removeItem(`uploadedResume:${uploadToken}`)
             }
           } else {
             console.warn('⚠️ No uploaded resume found in sessionStorage for token:', uploadToken)
           }
         } else {
           console.warn('⚠️ No uploadToken provided')
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
      sections: normalizeSectionsForState(data.sections || [])
    }
    
    skipHistoryRef.current = true
    setResumeData(newResumeData)
    undoRedo.setState(newResumeData, true)
    setTimeout(() => {
      skipHistoryRef.current = false
    }, 0)
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
    
    const viewParam = searchParams.get('view')
    if (viewParam === 'templates') {
      setShowTemplateDesignPage(true)
      return
    } else if (viewParam === 'jobs' || viewParam === 'resumes') {
      setCurrentView(viewParam)
    } else if (viewParam === 'editor' || !viewParam) {
      setCurrentView('editor')
    }
  }, [searchParams])

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
      router.push('/upload')
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
      // Clear JD data when creating new resume
      if (typeof window !== 'undefined') {
        localStorage.removeItem('deepLinkedJD')
        localStorage.removeItem('activeJobDescriptionId')
        localStorage.removeItem('extractedKeywords')
        localStorage.removeItem('currentJDKeywords')
        localStorage.removeItem('currentMatchResult')
        setDeepLinkedJD(null)
        setActiveJobDescriptionId(null)
      }
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
      skipHistoryRef.current = true
      setResumeData(emptyResumeData)
      undoRedo.setState(emptyResumeData, true)
      setTimeout(() => {
        skipHistoryRef.current = false
      }, 0)
      setShowWizard(false)
      return
    }
    
    // Check if we just processed an upload - if so, don't load from localStorage
    // This prevents loading stale cached data after an upload
    const resumeUploadParam = searchParams.get('resumeUpload')
    const uploadToken = searchParams.get('uploadToken')
    if (resumeUploadParam === '1' && uploadToken) {
      console.log('📤 Upload in progress, skipping localStorage load in this useEffect')
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
          const cleanedData = {
            ...existingData,
            sections: normalizeSectionsForState(existingData.sections || [])
          }
          // Always update to ensure we have the latest from localStorage
          // This ensures resume persists when navigating back from profile
          skipHistoryRef.current = true
          setResumeData(cleanedData)
          undoRedo.setState(cleanedData, true)
          setTimeout(() => {
            skipHistoryRef.current = false
          }, 0)
          setShowWizard(false)
          return
        }
      } catch (error) {
        console.error('Error parsing resume data from localStorage:', error)
      }
    }

    // Wizard removed - always show editor directly
    setShowWizard(false)
  }, [searchParams, userName, isAuthenticated]) // Intentionally exclude resumeData to avoid loops

  // Sync resumeData with undo/redo current state
  const lastUndoRedoStateRef = useRef<string>('')
  useEffect(() => {
    const currentState = undoRedo.currentState
    const currentStateStr = JSON.stringify(currentState)
    const resumeDataStr = JSON.stringify(resumeData)
    
    if (currentStateStr !== lastUndoRedoStateRef.current && 
        currentStateStr !== resumeDataStr &&
        !skipHistoryRef.current) {
      lastUndoRedoStateRef.current = currentStateStr
      skipHistoryRef.current = true
      setResumeData(currentState)
      setPreviewKey(prev => prev + 1)
      setTimeout(() => {
        skipHistoryRef.current = false
      }, 0)
    }
  }, [undoRedo.currentState])

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
        // Deduplicate sections in remote updates
        const cleanedData = {
          ...data,
          sections: normalizeSectionsForState(data.sections || [])
        }
        skipHistoryRef.current = true
        setResumeData(cleanedData)
        undoRedo.setState(cleanedData, true)
        setTimeout(() => {
          skipHistoryRef.current = false
        }, 0)
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
    
    // Log bullet counts before normalization
    const bulletsBefore = newData.sections?.flatMap((s: any) => s.bullets || []).length || 0
    console.log('Bullets before normalization:', bulletsBefore)
    
    const cleanedData = {
      ...newData,
      sections: normalizeSectionsForState(newData.sections || [])
    }
    
    // Log bullet counts after normalization
    const bulletsAfter = cleanedData.sections?.flatMap((s: any) => s.bullets || []).length || 0
    console.log('Bullets after normalization:', bulletsAfter)
    
    if (bulletsBefore !== bulletsAfter) {
      console.warn(`⚠️ Bullet count changed: ${bulletsBefore} → ${bulletsAfter}`)
      // Log which sections changed
      newData.sections?.forEach((section: any, idx: number) => {
        const beforeCount = section.bullets?.length || 0
        const afterCount = cleanedData.sections[idx]?.bullets?.length || 0
        if (beforeCount !== afterCount) {
          console.warn(`Section "${section.title}": ${beforeCount} → ${afterCount} bullets`)
        }
      })
    }
    
    console.log('Setting new resume data...')
    
    // Clear redo stack when new changes are made
    if (!skipHistoryRef.current) {
      undoRedo.clearRedoStack()
      
      // Debounce history saves to avoid saving on every keystroke
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current)
      }
      
      historyDebounceRef.current = setTimeout(() => {
        undoRedo.pushState(cleanedData)
      }, 300)
    }
    
    setResumeData(cleanedData)
    setPreviewKey(prev => prev + 1) // Force preview re-render
    
    if (roomId && collaboration.isConnected) {
      console.log('Sending collaboration update...')
      collaboration.sendUpdate(cleanedData)
    }
    
    console.log('handleResumeDataChange completed')
  }, [roomId, collaboration, undoRedo])

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
      await showAlert({
        type: 'error',
        message: 'Failed to create collaboration room',
        title: 'Error'
      })
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

  const handleTemplatesClick = () => {
    const mappedTemplateId = mapTemplateId(selectedTemplate)
    const template = templateRegistry.find(t => t.id === mappedTemplateId)
    // Load saved config or use default
    if (template) {
      const savedConfig = templateConfig || template.defaultConfig
      setTemplateConfig(savedConfig)
      // The useEffect will handle saving to localStorage
    }
    setShowTemplateDesignPage(true)
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'templates')
    window.history.pushState({}, '', url.toString())
  }

  const handleTemplateChange = (templateId: string) => {
    // From now on we treat template IDs in state/localStorage as the new registry IDs.
    // mapTemplateId() is still used when READING older saved values like "clean"/"tech".
    setSelectedTemplate(templateId as any)

    // Update template config when template changes
    const template = templateRegistry.find(t => t.id === templateId)
    if (template) {
      const newConfig = template.defaultConfig
      setTemplateConfig(newConfig)
      // The useEffect will handle saving to localStorage
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', templateId)
    }
  }

  const handleTemplateConfigUpdate = (config: TemplateConfig) => {
    setTemplateConfig(config)
    // The useEffect will handle saving to localStorage
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

  const handleExport = async (format: 'pdf' | 'docx' | 'cover-letter-pdf') => {
    console.log('Export requested:', format)
    console.log('Resume data:', resumeData)
    console.log('Is authenticated:', isAuthenticated)
    
    const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'

    // Always require authentication for exports (for marketing/email collection)
    // Even when premium mode is disabled, we want to collect emails on first export
    if (!isAuthenticated) {
      console.log('Export requires authentication - showing auth modal')
      await showAlert({
        type: 'info',
        message: 'Please sign up or sign in to export your resume. This helps us provide better service and track usage.',
        title: 'Sign Up Required'
      })
      setShowAuthModal(true)
      return
    }

    if (premiumMode && !checkPremiumAccess()) {
      // Check export usage limit
      const availability = checkFeatureAvailability('exports')
      if (!availability.allowed) {
        setExportUpgradeData({
          currentUsage: availability.currentUsage,
          limit: availability.limit,
          period: availability.period,
        })
        setShowExportUpgradePrompt(true)
        return
      }
      
      console.log('Premium mode - access denied')
      await showAlert({
        type: 'info',
        message: 'This is a premium feature. Upgrade to export your resume in PDF or DOCX format.',
        title: 'Premium Feature',
        onUpgrade: () => {
          router.push('/profile')
        }
      })
      return
    }

    const isCoverLetterExport = format === 'cover-letter-pdf'
    
    // Check localStorage for selected cover letter if latestCoverLetter is not set
    let coverLetterToExport = latestCoverLetter
    if (isCoverLetterExport && !coverLetterToExport) {
      try {
        const stored = localStorage.getItem('selectedCoverLetter')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.content) {
            coverLetterToExport = parsed.content
            setLatestCoverLetter(parsed.content)
          }
        }
      } catch (e) {
        console.error('Failed to read selected cover letter:', e)
      }
    }
    
    if (isCoverLetterExport && !coverLetterToExport) {
      await showAlert({
        type: 'warning',
        message: 'Please select a cover letter from the jobs page first, or generate a new one.',
        title: 'Selection Required'
      })
      return
    }

    if (!isCoverLetterExport) {
      saveToHistory()
    }
    
    // Track export asynchronously (non-blocking)
    if (isAuthenticated && user?.email) {
      fetch(`${config.apiBase}/api/user/track-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      }).catch(() => {
        // Silently fail - don't block export
      })
    }

    setIsExporting(true)
    try {
      const exportFormat = format === 'cover-letter-pdf' ? 'pdf' : format
      const exportUrl = `${config.apiBase}/api/resume/export/${exportFormat}`
      console.log('Export URL:', exportUrl)
      
      // Add user email and session_id to URL for analytics tracking
      const url = new URL(exportUrl)
      if (user?.email) {
        url.searchParams.set('user_email', user.email)
      }
      if (!isAuthenticated) {
        const sessionId = getOrCreateGuestSessionId()
        url.searchParams.set('session_id', sessionId)
      }
      
      // Preserve sections data with visibility flags for proper filtering in export
      // CRITICAL: Do not remove params.visible or section.params.visible - backend needs these to filter content
      const cleanedSections = resumeData.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        params: section.params || {}, // Preserve section params including visible flag
        bullets: section.bullets.map((bullet: any) => ({
          id: bullet.id,
          text: bullet.text,
          params: bullet.params || {} // Preserve bullet params including visible flag
        }))
      }))
      
      // Get cover letter content and job info - use latestCoverLetter or from localStorage
      let coverLetterContent: string | undefined = undefined
      let companyName: string | undefined = undefined
      let positionTitle: string | undefined = undefined
      
      if (isCoverLetterExport) {
        try {
          const stored = localStorage.getItem('selectedCoverLetter')
          if (stored) {
            const parsed = JSON.parse(stored)
            coverLetterContent = parsed.content || latestCoverLetter
            companyName = parsed.companyName
            positionTitle = parsed.positionTitle
          } else {
            coverLetterContent = latestCoverLetter || undefined
          }
        } catch (e) {
          console.error('Failed to read cover letter from localStorage:', e)
          coverLetterContent = latestCoverLetter || undefined
        }
      }

      // Ensure we always send a valid templateConfig
      let configToSend = templateConfig
      if (!configToSend) {
        // If no templateConfig, get default from template registry
        const mappedTemplateId = mapTemplateId(selectedTemplate)
        const template = templateRegistry.find(t => t.id === mappedTemplateId)
        if (template) {
          configToSend = template.defaultConfig
        }
      }

      // Get column width from templateConfig if available, otherwise from localStorage
      const columnWidth = configToSend?.layout?.columnWidth || 
                         (localStorage.getItem('twoColumnLeftWidth') ? Number(localStorage.getItem('twoColumnLeftWidth')!) : 50)

      const exportData = {
        cover_letter: coverLetterContent,
        name: resumeData.name,
        title: resumeData.title,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        summary: resumeData.summary,
        sections: isCoverLetterExport ? [] : cleanedSections,
        replacements,
        template: selectedTemplate,
        templateConfig: configToSend, // Always send templateConfig (never undefined)
        design: {
          colors: {
            primary: configToSend?.design?.colors?.primary || '#000000',
            secondary: configToSend?.design?.colors?.secondary || '#000000',
            accent: configToSend?.design?.colors?.accent || '#000000',
            text: configToSend?.design?.colors?.text || '#000000'
          }
        },
        fieldsVisible: (resumeData as any).fieldsVisible || {}, // CRITICAL: Preserve fieldsVisible for filtering fields in export
        two_column_left: localStorage.getItem('twoColumnLeft') ? JSON.parse(localStorage.getItem('twoColumnLeft')!) : [],
        two_column_right: localStorage.getItem('twoColumnRight') ? JSON.parse(localStorage.getItem('twoColumnRight')!) : [],
        two_column_left_width: columnWidth,
        company_name: isCoverLetterExport ? companyName : undefined,
        position_title: isCoverLetterExport ? positionTitle : undefined
      }
      
      console.log('Export data:', exportData)
      console.log('TemplateConfig being sent:', configToSend)
      console.log('Font sizes:', {
        h1: configToSend?.typography?.fontSize?.h1,
        h2: configToSend?.typography?.fontSize?.h2,
        body: configToSend?.typography?.fontSize?.body
      })
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (isAuthenticated) {
        const { auth } = await import('@/lib/firebaseClient')
        const token = await auth.currentUser?.getIdToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(exportData)
      })
      
      console.log('Export response status:', response.status)
      console.log('Export response ok:', response.ok)

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}))
        setExportUpgradeData({
          currentUsage: errorData.detail?.usage_info?.current_usage || 0,
          limit: errorData.detail?.usage_info?.limit || null,
          period: errorData.detail?.usage_info?.period || 'monthly',
        })
        setShowExportUpgradePrompt(true)
        setIsExporting(false)
        return
      }
      // After successful export, save resume version and record match session if a JD is active
      if (!isCoverLetterExport && response.ok && activeJobDescriptionId && isAuthenticated && user?.email) {
        try {
          // First, save or update resume and create a version
          let resumeId = currentResumeId;
          let resumeVersionId = null;
          
          try {
            // Save resume and get version
            // Preserve sections data with visibility flags for proper filtering
            // CRITICAL: Do not remove params.visible - backend needs these to filter content
            const cleanedSectionsForSave = resumeData.sections.map((section: any) => ({
              id: section.id,
              title: section.title,
              params: section.params || {}, // Preserve section params including visible flag
              bullets: section.bullets.map((bullet: any) => ({
                id: bullet.id,
                text: bullet.text,
                params: bullet.params || {} // Preserve bullet params including visible flag
              }))
            }))
            
            // Sort sections by default order before saving
            const sortedSectionsForSave = sortSectionsByDefaultOrder(cleanedSectionsForSave)
            
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
                sections: sortedSectionsForSave
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
        const contentType = response.headers.get('content-type')
        const blob = await response.blob()
        const downloadNameBase = isCoverLetterExport ? (resumeData.name || 'cover_letter') : (resumeData.name || 'resume')
        
        if (exportFormat === 'pdf') {
          try {
            const { validateAndSavePDF } = await import('@/lib/pdfValidation')
            await validateAndSavePDF(blob, `${downloadNameBase}.pdf`, contentType)
          } catch (pdfError) {
            console.error('PDF validation failed:', pdfError)
            await showAlert({
              type: 'error',
              message: pdfError instanceof Error ? pdfError.message : 'Failed to validate PDF file. Please try again.',
              title: 'Export Failed'
            })
            return
          }
        } else {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          const downloadExtension = exportFormat
          a.href = url
          a.download = `${downloadNameBase}.${downloadExtension}`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
        
        // Refresh usage stats after successful export
        await refreshUsage()
      } else {
        let errorMessage = `Export failed (${response.status})`
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : errorData.detail.message || errorData.detail.error || JSON.stringify(errorData.detail)
          } else {
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData)
          }
        } catch {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }
        console.error('Export failed:', response.status, errorMessage)
        await showAlert({
          type: 'error',
          message: errorMessage,
          title: 'Export Failed'
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
        if (errorMessage.includes('fetch')) {
          errorMessage = 'Failed to connect to server. Please check your internet connection and ensure the backend is running.'
        }
      }
      await showAlert({
        type: 'error',
        message: `Export failed: ${errorMessage}`,
        title: 'Export Failed'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportOption = async (option: 'pdf' | 'docx' | 'cover-letter') => {
    if (option === 'pdf') {
      await handleExport('pdf')
    } else if (option === 'docx') {
      await handleExport('docx')
    } else {
      await handleExport('cover-letter-pdf')
    }
  }

  const handleSelectJobDescriptionId = useCallback((jobId: number | null) => {
    setActiveJobDescriptionId(jobId)
    // Save to localStorage for persistence
    if (typeof window !== 'undefined' && jobId !== null) {
      localStorage.setItem('activeJobDescriptionId', jobId.toString())
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('activeJobDescriptionId')
      localStorage.removeItem('deepLinkedJD')
      localStorage.removeItem('extractedKeywords')
      localStorage.removeItem('currentJDKeywords')
      localStorage.removeItem('currentMatchResult')
    }
  }, [])

  const handleSaveResume = useCallback(async () => {
    if (!resumeData.name && !resumeData.sections?.length) {
      await showAlert({
        type: 'warning',
        message: 'Please add some content to your resume before saving',
        title: 'Content Required'
      })
      return
    }

    if (!user?.email) {
      await showAlert({
        type: 'warning',
        message: 'Unable to determine your account email. Please sign in again.',
        title: 'Authentication Required'
      })
      return
    }

    // Prompt for display name (for the app only - doesn't appear in resume)
    const displayName = prompt(
      'Enter a display name for this resume (shown in your resume list, not on the resume):',
      resumeData.name || 'My Resume'
    )
    if (!displayName) {
      return
    }

    // Document name is what appears in the actual resume - always use resumeData.name
    const documentName = resumeData.name || ''

    try {
      const cleanedSections = resumeData.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        bullets: section.bullets.map((bullet: any) => ({
          id: bullet.id,
          text: bullet.text,
          params: {},
        })),
      }))

      // Sort sections by default order before saving
      const sortedSections = sortSectionsByDefaultOrder(cleanedSections)

      const response = await fetch(
        `${config.apiBase}/api/resume/save?user_email=${encodeURIComponent(user.email)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: displayName, // Display name for the app
            document_name: documentName, // Name that appears in the resume document
            title: resumeData.title || '',
            email: resumeData.email || '',
            phone: resumeData.phone || '',
            location: resumeData.location || '',
            summary: resumeData.summary || '',
            sections: sortedSections,
            template: selectedTemplate,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Save failed')
      }

      setCurrentResumeId(result.resume_id)

      if (typeof document !== 'undefined') {
        const notification = document.createElement('div')
        notification.className =
          'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md'
        notification.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="text-2xl">✅</div>
            <div>
              <div class="font-bold text-lg">Resume Saved!</div>
              <div class="text-sm mt-1">${displayName}</div>
              <div class="text-xs mt-1 text-green-100">Saved to Master Resumes</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
          </div>
        `
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 5000)
      }
    } catch (error) {
      console.error('Failed to save resume:', error)
      await showAlert({
        type: 'error',
        message: `Failed to save resume: ${error instanceof Error ? error.message : 'Unknown error'}`,
        title: 'Error'
      })
    }
  }, [resumeData, selectedTemplate, setCurrentResumeId, user])

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
    skipHistoryRef.current = true
    setResumeData(newResumeData)
    undoRedo.setState(newResumeData, true)
    setPreviewKey(prev => prev + 1)
    setTimeout(() => {
      skipHistoryRef.current = false
    }, 0)
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

  const handleWorkExperienceUpdate = async (newContent: any) => {
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
              const finalCompanyName = (content.companyName || companyName || '').trim() || 'New Company'
              const finalJobTitle = (content.jobTitle || jobTitle || '').trim() || 'New Role'
              const finalDateRange = (content.dateRange || dateRange || '').trim() || 'Date Range'
              return {
                ...bullet,
                text: `**${finalCompanyName} / Location / ${finalJobTitle} / ${finalDateRange}**`
              }
            }
            return bullet
          })
          
          // Clean and add new bullet points after the company header
          const cleanBulletText = (text: string): string => {
            if (!text) return ""
            let cleaned = text.trim()
            // Remove surrounding quotes
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
              cleaned = cleaned.slice(1, -1)
            }
            // Remove any remaining quotes
            cleaned = cleaned.trim().replace(/^["']+|["']+$/g, '')
            // Remove bullet markers if present
            cleaned = cleaned.replace(/^[•\-\*]\s*/, '').trim()
            // Remove JSON escape characters
            cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'")
            return cleaned
          }

          if (content.bullets && content.bullets.length > 0) {
            const newBullets = content.bullets
              .map(cleanBulletText)
              .filter((text: string) => text.length > 0)
              .map((bulletText: string, index: number) => ({
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
      await showAlert({
        type: 'error',
        message: 'Failed to update work experience: ' + (error as Error).message,
        title: 'Error'
      })
    }
  }

  const handleBulletImprovement = async (newContent: any) => {
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
      await showAlert({
        type: 'error',
        message: 'Failed to improve bullet point: ' + (error as Error).message,
        title: 'Error'
      })
    }
  }

  const handleAddContent = async (newContent: any) => {
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
            // Add the new section to the beginning of sections array (immutably)
            const updatedSections = [targetSection, ...resumeData.sections]
            setResumeData({ ...resumeData, sections: updatedSections })
            // Update targetSection reference to the one in the new array
            targetSection = updatedSections[0]
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
      await showAlert({
        type: 'error',
        message: 'Failed to add content: ' + (error as Error).message,
        title: 'Error'
      })
    }
  }

  // Handler for Upload Resume button
  const handleUploadResume = () => {
    router.push('/upload')
  }

  // Handler for New Resume button
  const handleNewResume = () => {
    // Clear any cached resume data and JD data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('resumeData')
      localStorage.removeItem('deepLinkedJD')
      localStorage.removeItem('activeJobDescriptionId')
      localStorage.removeItem('extractedKeywords')
      localStorage.removeItem('currentJDKeywords')
      localStorage.removeItem('currentMatchResult')
      // Navigate to the new resume flow
      router.push('/editor?new=true')
    }
  }

  // Handler for AI Content Wizard from sidebar
  const handleAIContentWizard = (contentType: 'job' | 'project' | 'skill' | 'education') => {
    setAiWizardContext({ type: contentType })
    setActiveAction('ai-wizard')
    setShowActionsDrawer(true)
  }

  // Handler for Export (convert handleExportOption to match expected format)
  const handleExportForLayout = async (format: 'pdf' | 'docx' | 'cover-letter') => {
    await handleExportOption(format)
  }

  const headerElement = null

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-3xl animate-pulse">🛠️</div>
          <p className="text-sm font-semibold text-gray-600">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NewResumeWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  if (showTemplateDesignPage) {
    return (
      <TemplateDesignPage
        resumeData={resumeData}
        currentTemplate={mapTemplateId(selectedTemplate)}
        templateConfig={templateConfig}
        onTemplateChange={handleTemplateChange}
        onTemplateConfigUpdate={handleTemplateConfigUpdate}
        onClose={() => {
          setShowTemplateDesignPage(false)
          const url = new URL(window.location.href)
          url.searchParams.delete('view')
          window.history.pushState({}, '', url.toString())
        }}
      />
    )
  }

  return (
    <>
      <div className="editor-shell min-h-screen bg-body-gradient text-text-primary">
        {headerElement}
        <div className="fixed inset-0 overflow-hidden">
      {/* Export Upgrade Prompt */}
      {showExportUpgradePrompt && exportUpgradeData && (
        <UpgradePrompt
          isOpen={showExportUpgradePrompt}
          onClose={() => {
            setShowExportUpgradePrompt(false)
            setExportUpgradeData(null)
          }}
          featureType="exports"
          currentUsage={exportUpgradeData.currentUsage}
          limit={exportUpgradeData.limit}
          period={exportUpgradeData.period}
        />
      )}

      <ModernEditorLayout
        resumeData={resumeData}
        onResumeUpdate={handleResumeDataChange}
        onViewChange={(view) => {
          setCurrentView(view)
          const url = new URL(window.location.href)
          if (view === 'editor') {
            url.searchParams.delete('view')
          } else {
            url.searchParams.set('view', view)
          }
          window.history.pushState({}, '', url.toString())
        }}
        currentView={currentView}
        template={selectedTemplate}
        templateConfig={templateConfig}
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
        deepLinkedJD={deepLinkedJD}
        activeJobDescriptionId={activeJobDescriptionId}
        onOpenCoverLetter={() => {
          setActiveAction('cover-letter')
          setShowActionsDrawer(true)
        }}
        onAIImprove={async (text: string) => {
          try {
            console.log('AI Improve requested for:', text)
            
            // Add timeout for bullet improvement
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for single bullet
            
            try {
              const response = await fetch(`${config.apiBase}/api/openai/improve-bullet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bullet: text, tone: 'professional' }),
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
              }
              
              const data = await response.json()
              console.log('AI Improve response:', data)
              
              let improved = data.improved || data.improved_bullet || text
              improved = improved.replace(/^["']|["']$/g, '')
              
              console.log('Final improved text:', improved)
              return improved
            } catch (fetchError: any) {
              clearTimeout(timeoutId)
              if (fetchError.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds. Please try again.')
              }
              throw fetchError
            }
          } catch (error: any) {
            console.error('AI improvement failed:', error)
            const errorMessage = error?.message || 'Unknown error occurred'
            if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('AbortError')) {
              await showAlert({
                type: 'warning',
                message: 'Request timed out. The AI service may be slow right now. Please try again in a moment.',
                title: 'Timeout'
              })
            } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
              await showAlert({
                type: 'error',
                message: 'AI service is temporarily unavailable. Please try again in a moment.',
                title: 'Service Unavailable'
              })
            } else {
              await showAlert({
                type: 'error',
                message: 'AI improvement failed: ' + errorMessage,
                title: 'Error'
              })
            }
            return text
          }
        }}
        onNewResume={handleNewResume}
        onSaveResume={handleSaveResume}
        onUploadResume={handleUploadResume}
        onExport={handleExportForLayout}
        isExporting={isExporting}
        hasCoverLetter={!!latestCoverLetter}
        userName={userName}
        isAuthenticated={isAuthenticated}
        onLogout={logout}
        onSignIn={() => setShowAuthModal(true)}
        onAIContentWizard={handleAIContentWizard}
        onTemplatesClick={handleTemplatesClick}
        onShareResume={() => {
          setActiveAction('share')
          setShowActionsDrawer(true)
        }}
        onActionsClick={() => {
          setActiveAction('ai-wizard')
          setShowActionsDrawer(true)
        }}
        onSelectJobDescriptionId={handleSelectJobDescriptionId}
      />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showActionsDrawer && (
        <ActionsDrawer
          isOpen={showActionsDrawer}
          onClose={() => {
            setShowActionsDrawer(false)
            setAiWizardContext(null)
          }}
          activeAction={activeAction}
          onActionChange={setActiveAction}
          resumeData={resumeData}
          currentResumeId={currentResumeId}
          aiWizardContext={aiWizardContext}
          onAddContent={handleAddContent}
          onCoverLetterChange={(letter: string | null) => {
            setLatestCoverLetter(letter)
            if (letter) {
              setShowActionsDrawer(false)
            }
          }}
          onVersionLoad={handleVersionLoad}
          onVersionSave={handleVersionSave}
          onCompareVersions={handleCompareVersions}
          onNewResume={handleNewResume}
          onUploadResume={handleUploadResume}
          onSaveResume={handleSaveResume}
          onExport={handleExportForLayout}
          isExporting={isExporting}
          hasCoverLetter={!!latestCoverLetter}
          hasResumeName={!!resumeData.name}
          isAuthenticated={isAuthenticated}
        />
      )}

      {showVersionComparison && comparisonVersions && (
        <VersionComparisonModal
          isOpen={showVersionComparison}
          onClose={() => setShowVersionComparison(false)}
          version1Id={comparisonVersions.version1Id}
          version2Id={comparisonVersions.version2Id}
        />
      )}

        </div>
      </div>
    </>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-3xl animate-pulse">🛠️</div>
            <p className="text-sm font-semibold text-gray-600">Loading editor…</p>
          </div>
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  )
}

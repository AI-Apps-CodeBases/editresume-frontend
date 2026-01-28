'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import config from '@/lib/config'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'
import UploadResume from './UploadResume'
import CoverLetterGenerator from '@/components/AI/CoverLetterGenerator'
import { BookmarkIcon, EditIcon, CalendarIcon, BriefcaseIcon, HandshakeIcon, CheckIcon, XIcon, MailIcon, DocumentIcon, ChartIcon, FileTextIcon } from '@/components/Icons'
import { StarRating } from '@/components/Shared/StarRating'
import { deduplicateSections, sortSectionsByDefaultOrder } from '@/utils/sectionDeduplication'
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/Shared/Skeleton'

type UnknownRecord = Record<string, unknown>
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

interface JobResumeSummary {
  id: number
  score: number
  resume_id?: number
  resume_name?: string | null
  resume_version_id?: number | null
  resume_version_label?: string | null
  keyword_coverage?: number | null
  matched_keywords?: string[]
  missing_keywords?: string[]
  created_at?: string | null
  updated_at?: string | null
}

interface JobCoverLetter {
  id: number
  job_description_id: number
  title: string
  content: string
  version_number: number
  created_at?: string | null
  updated_at?: string | null
}

interface JobDescription {
  id: number
  title: string
  company?: string
  source?: string
  url?: string
  easy_apply_url?: string
  location?: string
  work_type?: string
  job_type?: string
  content?: string
  max_salary?: number
  status?: string
  follow_up_date?: string
  importance?: number // 0-5 stars
  created_at?: string
  extracted_keywords?: unknown
  priority_keywords?: unknown
  high_frequency_keywords?: unknown
  ats_insights?: {
    score_snapshot?: {
      overall_score?: number
      keyword_coverage?: number
      estimated_keyword_score?: number
      matched_keywords_count?: number
      total_keywords?: number
      missing_keywords_sample?: string[]
      analysis_summary?: string
    } | null
    [key: string]: unknown
  } | null
  best_resume_version?: JobResumeSummary | null
  resume_versions?: JobResumeSummary[]
  cover_letters?: JobCoverLetter[]
}

interface Props {
  jobId: number
  onBack: () => void
  onUpdate?: () => void
}

const STATUS_OPTIONS = [
  { value: 'bookmarked', label: 'Bookmarked', icon: BookmarkIcon, color: 'bg-gray-100 text-gray-700' },
  { value: 'applied', label: 'Applied', icon: EditIcon, color: 'bg-primary-100 text-primary-700' },
  { value: 'interview_set', label: 'Interview Set', icon: CalendarIcon, color: 'bg-purple-100 text-purple-700' },
  { value: 'interviewing', label: 'Interviewing', icon: BriefcaseIcon, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiating', label: 'Negotiating', icon: HandshakeIcon, color: 'bg-orange-100 text-orange-700' },
  { value: 'accepted', label: 'Accepted', icon: CheckIcon, color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', icon: XIcon, color: 'bg-red-100 text-red-700' },
]

const resolveApplyLink = (easyApplyUrl?: string, jobUrl?: string) => {
  if (easyApplyUrl) {
    if (easyApplyUrl.includes('/jobs/apply/') && jobUrl && jobUrl.includes('/jobs/view/')) {
      return jobUrl
    }
    return easyApplyUrl
  }
  return jobUrl || ''
}


export default function JobDetailView({ jobId, onBack, onUpdate }: Props) {
  const { user, isAuthenticated } = useAuth()
  const { showAlert, showConfirm } = useModal()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Persist activeTab in localStorage to prevent reverting on remount
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resume' | 'analysis' | 'coverLetters'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`jobDetailTab_${jobId}`)
      if (saved && ['overview', 'notes', 'resume', 'analysis', 'coverLetters'].includes(saved)) {
        return saved as 'overview' | 'notes' | 'resume' | 'analysis' | 'coverLetters'
      }
    }
    return 'overview'
  })
  
  // Save activeTab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`jobDetailTab_${jobId}`, activeTab)
    }
  }, [activeTab, jobId])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [resumeOptions, setResumeOptions] = useState<Array<{ id: number; name: string }>>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | ''>('')
  const [loadingResumes, setLoadingResumes] = useState(false)
  const [coverLetters, setCoverLetters] = useState<JobCoverLetter[]>([])
  const [editingLetterId, setEditingLetterId] = useState<number | null>(null)
  const [editingLetterTitle, setEditingLetterTitle] = useState('')
  const [editingLetterContent, setEditingLetterContent] = useState('')
  const [showUploadResumeModal, setShowUploadResumeModal] = useState(false)
  const [showCoverLetterGenerator, setShowCoverLetterGenerator] = useState(false)
  const [resumeDataForCoverLetter, setResumeDataForCoverLetter] = useState<unknown>(null)
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | null>(null)

  const isJobCoverLetter = (value: unknown): value is JobCoverLetter =>
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'number'

  const fetchJobDetails = useCallback(async () => {
    if (!user?.email) return
    
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions/${jobId}?user_email=${encodeURIComponent(user.email)}`, {
        timeout: 15000,
      })
      if (res.ok) {
        const data = await res.json()
        setJob(data)
        
        if (data.notes) {
          setNotes(data.notes)
        }
        
        // Always fetch cover letters directly from the dedicated endpoint
        let letters: JobCoverLetter[] = []
        try {
          const coverLetterRes = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters`, {
            timeout: 15000,
          })
          if (coverLetterRes.ok) {
            const coverLetterData = await coverLetterRes.json()
            if (Array.isArray(coverLetterData)) {
              letters = coverLetterData.filter(isJobCoverLetter)
            }
          }
        } catch (e) {
          console.error('Failed to fetch cover letters:', e)
        }
        
        // Fallback to data.cover_letters if direct fetch failed
        if (letters.length === 0 && Array.isArray(data.cover_letters)) {
          letters = data.cover_letters.filter(isJobCoverLetter)
        }
        
        // Always update cover letters from fetch (only called on initial load or explicit refresh)
        setCoverLetters(letters)
        
        if (!selectedResumeId && data.best_resume_version?.resume_id) {
          setSelectedResumeId(data.best_resume_version.resume_id)
        }
      }
    } catch (e) {
      console.error('Failed to load job details:', e)
    } finally {
      setLoading(false)
    }
  }, [jobId, user?.email, selectedResumeId])

  useEffect(() => {
    if (jobId && isAuthenticated && user?.email) {
      fetchJobDetails()
    }
  }, [jobId, isAuthenticated, user?.email, fetchJobDetails])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchResumes()
    }
  }, [isAuthenticated, user?.email])

  // Listen for resume version save events and refresh job details
  useEffect(() => {
    const handleResumeVersionSaved = (event: CustomEvent) => {
      const eventJobId = event.detail?.jobId
      if (eventJobId && eventJobId === jobId) {
        fetchJobDetails()
        if (onUpdate) {
          onUpdate()
        }
      }
    }

    const handleJobSaved = () => {
      fetchJobDetails()
      if (onUpdate) {
        onUpdate()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resumeVersionSaved', handleResumeVersionSaved as EventListener)
      window.addEventListener('jobSaved', handleJobSaved)
      
      return () => {
        window.removeEventListener('resumeVersionSaved', handleResumeVersionSaved as EventListener)
        window.removeEventListener('jobSaved', handleJobSaved)
      }
    }
  }, [jobId, onUpdate, fetchJobDetails])

  const fetchResumes = async () => {
    if (!user?.email) return
    setLoadingResumes(true)
    try {
      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        setResumeOptions(data.resumes || [])
        if (!selectedResumeId && Array.isArray(data.resumes) && data.resumes.length > 0) {
          setSelectedResumeId(data.resumes[0].id)
        }
      }
    } catch (e) {
      console.error('Failed to load resumes:', e)
    } finally {
      setLoadingResumes(false)
    }
  }

  const sanitizeKeywordValue = useCallback((value: unknown): string | null => {
    if (!value) return null
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>
      if (typeof record.keyword === 'string') return record.keyword.trim()
      if (typeof record.name === 'string') return record.name.trim()
      if (Array.isArray(value)) {
        for (const entry of value) {
          const candidate = sanitizeKeywordValue(entry)
          if (candidate) return candidate
        }
      }
    }
    return null
  }, [])

  const formatKeywordDisplay = useCallback((keyword: string): string => {
    if (!keyword) return keyword
    if (keyword.length <= 3) return keyword.toUpperCase()
    return keyword
      .split(/[\s/-]+/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
      .replace(/([A-Za-z])([A-Z][a-z])/g, '$1 $2')
  }, [])

  const allTechnicalSkills = useMemo(() => {
    if (!job) return []
    const extracted = job.extracted_keywords
    const rawSkills: string[] = []
    if (isRecord(extracted) && Array.isArray(extracted.technical_keywords)) {
      rawSkills.push(...extracted.technical_keywords.filter((kw): kw is string => typeof kw === 'string'))
    }
    if (Array.isArray(job.priority_keywords)) {
      rawSkills.push(...job.priority_keywords)
    }
    const cleaned = rawSkills
      .map(sanitizeKeywordValue)
      .filter((value): value is string => !!value)
      .map((value) => value.toLowerCase())

    return Array.from(new Set(cleaned)).slice(0, 24)
  }, [job, sanitizeKeywordValue])

  const highlightedKeywords = useMemo(() => {
    if (!job) return []
    const extracted = job.extracted_keywords
    const rawKeywords: string[] = []
    if (isRecord(extracted) && Array.isArray(extracted.general_keywords)) {
      rawKeywords.push(...extracted.general_keywords.filter((kw): kw is string => typeof kw === 'string'))
    }
    if (Array.isArray(job.high_frequency_keywords)) {
      job.high_frequency_keywords.forEach((item: unknown) => {
        const keyword = sanitizeKeywordValue(item)
        if (keyword) rawKeywords.push(keyword)
      })
    }

    const cleaned = rawKeywords
      .map(sanitizeKeywordValue)
      .filter((value): value is string => !!value)
      .map((value) => value.toLowerCase())

    return Array.from(new Set(cleaned)).slice(0, 30)
  }, [job, sanitizeKeywordValue])

  const updateJobField = async (field: string, value: unknown) => {
    if (!user?.email || !job) return
    
    setSaving(true)
    try {
      const url = `${config.apiBase}/api/job-descriptions/${job.id}?user_email=${encodeURIComponent(user.email)}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      
      if (res.ok) {
        const updated = await res.json()
        setJob(updated)
        if (onUpdate) onUpdate()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to update' }))
        await showAlert({
          title: 'Update Failed',
          message: `Failed to update: ${error.detail || 'Unknown error'}`,
          type: 'error'
        })
      }
    } catch (e) {
      console.error('Failed to update job:', e)
      await showAlert({
        title: 'Update Failed',
        message: 'Failed to update job',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    await updateJobField('notes', notes)
  }

  const handleUpdateCoverLetter = async () => {
    if (!editingLetterId) return
    if (!editingLetterContent.trim()) {
      await showAlert({
        title: 'Invalid Content',
        message: 'Cover letter content cannot be empty.',
        type: 'warning'
      })
      return
    }
    try {
      const res = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${editingLetterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLetterTitle.trim(),
          content: editingLetterContent.trim()
        }),
        timeout: 15000,
      })
      if (res.ok) {
        const updated = await res.json()
        
        // Update state directly to avoid race condition
        setCoverLetters((prev) => prev.map((cl) => (cl.id === updated.id ? updated : cl)))
        
        // If this was the selected cover letter, update localStorage
        if (selectedCoverLetterId === updated.id) {
          handleSelectCoverLetter(updated)
        }
        
        setEditingLetterId(null)
        setEditingLetterTitle('')
        setEditingLetterContent('')
        if (onUpdate) onUpdate()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to update cover letter' }))
        await showAlert({
          title: 'Update Failed',
          message: error.detail || 'Failed to update cover letter',
          type: 'error'
        })
      }
    } catch (e) {
      console.error('Failed to update cover letter:', e)
      await showAlert({
        title: 'Update Failed',
        message: 'Failed to update cover letter',
        type: 'error'
      })
    }
  }

  const handleDeleteCoverLetter = async (letterId: number) => {
    try {
      const res = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${letterId}`, {
        method: 'DELETE',
        timeout: 15000,
      })
      if (res.ok) {
        
        // Update state directly to avoid race condition
        setCoverLetters((prev) => prev.filter((cl) => cl.id !== letterId))
        
        // Clear selection if deleted letter was selected
        if (selectedCoverLetterId === letterId) {
          setSelectedCoverLetterId(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedCoverLetter')
          }
        }
        
        if (onUpdate) onUpdate()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to delete cover letter' }))
        await showAlert({
          title: 'Delete Failed',
          message: error.detail || 'Failed to delete cover letter',
          type: 'error'
        })
      }
    } catch (e) {
      console.error('Failed to delete cover letter:', e)
      await showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete cover letter',
        type: 'error'
      })
    }
  }

  const handleOpenCoverLetterGenerator = async () => {
    if (!user?.email) return
    
    try {
      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        const resumes = data.resumes || []
        if (resumes.length > 0) {
          const latestResume = resumes[0]
          if (latestResume.latest_version_id) {
            const resumeVersionRes = await fetch(`${config.apiBase}/api/resume/version/${latestResume.latest_version_id}?user_email=${encodeURIComponent(user.email)}`)
            if (resumeVersionRes.ok) {
              const versionData = await resumeVersionRes.json()
              setResumeDataForCoverLetter(versionData.version?.resume_data || {
                name: '',
                title: '',
                email: '',
                phone: '',
                location: '',
                summary: '',
                sections: []
              })
              setShowCoverLetterGenerator(true)
            } else {
              setResumeDataForCoverLetter({
                name: '',
                title: '',
                email: '',
                phone: '',
                location: '',
                summary: '',
                sections: []
              })
              setShowCoverLetterGenerator(true)
            }
          } else {
            setResumeDataForCoverLetter({
              name: '',
              title: '',
              email: '',
              phone: '',
              location: '',
              summary: '',
              sections: []
            })
            setShowCoverLetterGenerator(true)
          }
        } else {
          setResumeDataForCoverLetter({
            name: '',
            title: '',
            email: '',
            phone: '',
            location: '',
            summary: '',
            sections: []
          })
          setShowCoverLetterGenerator(true)
        }
      } else {
        setResumeDataForCoverLetter({
          name: '',
          title: '',
          email: '',
          phone: '',
          location: '',
          summary: '',
          sections: []
        })
        setShowCoverLetterGenerator(true)
      }
    } catch (e) {
      console.error('Failed to load resume data:', e)
      setResumeDataForCoverLetter({
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        sections: []
      })
      setShowCoverLetterGenerator(true)
    }
  }

  const handleCoverLetterGenerated = async (coverLetter: string | null) => {
    // This is called when cover letter is generated in the modal
    // No action needed here as save success callback handles the state update
  }

  const handleSelectCoverLetter = (letter: JobCoverLetter) => {
    setSelectedCoverLetterId(letter.id)
    
    // Store in localStorage so editor can access it for export
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCoverLetter', JSON.stringify({
        id: letter.id,
        content: letter.content,
        title: letter.title,
        jobId: jobId,
        companyName: job?.company || '',
        positionTitle: job?.title || ''
      }))
      
      // Dispatch event to notify editor page
      window.dispatchEvent(new CustomEvent('coverLetterSelected', {
        detail: { content: letter.content, title: letter.title }
      }))
    }
  }

  const handleExportCoverLetter = async (letter: JobCoverLetter, format: 'pdf' | 'docx' = 'pdf') => {
    if (!user?.email) {
      await showAlert({
        title: 'Sign In Required',
        message: 'Please sign in to export cover letters',
        type: 'warning'
      })
      return
    }

    try {
      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (!res.ok) {
        throw new Error('Failed to load resume data')
      }

      const data = await res.json()
      const resumes = data.resumes || []
      
      let resumeData = {
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        sections: []
      }

      if (resumes.length > 0) {
        const latestResume = resumes[0]
        if (latestResume.latest_version_id) {
          const resumeVersionRes = await fetch(`${config.apiBase}/api/resume/version/${latestResume.latest_version_id}?user_email=${encodeURIComponent(user.email)}`)
          if (resumeVersionRes.ok) {
            const versionData = await resumeVersionRes.json()
            resumeData = versionData.version?.resume_data || resumeData
          }
        }
      }

      const response = await fetch(`${config.apiBase}/api/resume/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          title: '',
          email: '',
          phone: '',
          location: '',
          summary: '',
          sections: [],
          cover_letter: letter.content,
          company_name: job?.company || '',
          template: 'tech',
          two_column_left: [],
          two_column_right: [],
          two_column_left_width: 50
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const fileName = `${job?.company || 'Company'}_${letter.title.replace(/[^a-z0-9]/gi, '_')}.${format}`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        await showAlert({
          title: 'Export Failed',
          message: 'Export failed. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to export cover letter:', error)
      await showAlert({
        title: 'Export Failed',
        message: 'Export failed. Make sure backend is running.',
        type: 'error'
      })
    }
  }

  const handleUploadResumeForMatch = useCallback((data: unknown) => {
     if (!job) {
       return
     }
 
     // Use professional deduplication utility
     const record = (typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null)
     const sections = Array.isArray(record?.sections) ? record.sections : []
     const deduplicatedSections = deduplicateSections(sections)
     const sortedSections = sortSectionsByDefaultOrder(deduplicatedSections)
     
 
     const normalizedResume = {
       name: typeof record?.name === 'string' ? record.name : '',
       title: typeof record?.title === 'string' ? record.title : '',
       email: typeof record?.email === 'string' ? record.email : '',
       phone: typeof record?.phone === 'string' ? record.phone : '',
       location: typeof record?.location === 'string' ? record.location : '',
       summary: typeof record?.summary === 'string' ? record.summary : '',
       sections: sortedSections
     }
 
     if (typeof window !== 'undefined') {
       try {
         window.localStorage.setItem('activeJobDescriptionId', String(job.id))
         if (job.content) {
           window.localStorage.setItem('deepLinkedJD', job.content)
         }
         // Clear ALL cached resume data before uploading
         window.localStorage.removeItem('currentResumeId')
         window.localStorage.removeItem('currentResumeVersionId')
         window.localStorage.removeItem('resumeData') // Clear cached resume
         window.localStorage.removeItem('selectedTemplate') // Clear cached template

         const uploadToken = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
         const payload = {
           resume: normalizedResume,
           template: typeof record?.template === 'string' ? record.template : 'tech'
         }
         window.sessionStorage.setItem(`uploadedResume:${uploadToken}`, JSON.stringify(payload))

         const redirectUrl = new URL('/editor', window.location.origin)
         redirectUrl.searchParams.set('jdId', String(job.id))
         redirectUrl.searchParams.set('resumeUpload', '1')
         redirectUrl.searchParams.set('uploadToken', uploadToken)

         setShowUploadResumeModal(false)
         window.location.href = redirectUrl.toString()
         return
       } catch (err) {
         console.error('Failed to cache uploaded resume for matching:', err)
       }
 
       setShowUploadResumeModal(false)
       window.location.href = `/editor?jdId=${job.id}`
     }
   }, [job])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
        <div className="bg-white border-b shadow-sm sticky top-0 z-20">
          <div className="w-full px-6 py-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-3">
                <Skeleton variant="rounded" height={36} width="60%" />
                <Skeleton variant="rounded" height={20} width="40%" />
              </div>
              <Skeleton variant="circular" width={40} height={40} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 m-6">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <XIcon size={64} color="#ef4444" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Job Not Found</h2>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const bestMatch: JobResumeSummary | null = job.best_resume_version
    || (job.resume_versions && job.resume_versions.length > 0 ? job.resume_versions[0] : null)

  const scoreSnapshot = job.ats_insights?.score_snapshot ?? null

  const overallScore =
    (bestMatch?.score ?? null) !== null
      ? bestMatch?.score ?? null
      : (typeof scoreSnapshot?.overall_score === 'number' ? scoreSnapshot.overall_score : null)

  const keywordCoverageSnapshot =
    typeof scoreSnapshot?.keyword_coverage === 'number' ? scoreSnapshot.keyword_coverage : null

  const estimatedKeywordScore =
    typeof scoreSnapshot?.estimated_keyword_score === 'number'
      ? scoreSnapshot.estimated_keyword_score
      : null

  const matchedKeywordsCount =
    typeof scoreSnapshot?.matched_keywords_count === 'number'
      ? scoreSnapshot.matched_keywords_count
      : Array.isArray(bestMatch?.matched_keywords)
        ? bestMatch.matched_keywords.length
        : null

  const totalKeywordsCount =
    typeof scoreSnapshot?.total_keywords === 'number'
      ? scoreSnapshot.total_keywords
      : matchedKeywordsCount !== null
        ? matchedKeywordsCount +
          (Array.isArray(bestMatch?.missing_keywords) ? bestMatch.missing_keywords.length : 0)
        : null

  const missingKeywordsSample: string[] =
    Array.isArray(scoreSnapshot?.missing_keywords_sample)
      ? scoreSnapshot.missing_keywords_sample
      : Array.isArray(bestMatch?.missing_keywords)
        ? bestMatch.missing_keywords.slice(0, 5)
        : []

  const matchSummary =
    (typeof scoreSnapshot?.analysis_summary === 'string' && scoreSnapshot.analysis_summary.trim().length > 0
      ? scoreSnapshot.analysis_summary
      : null) ||
    null

  const getScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreRing = (score?: number | null) => {
    const safeScore = Number.isFinite(score) && score !== null ? Math.max(0, Math.min(100, score!)) : 0
    return {
      strokeClass: getScoreColor(score).replace('text-', 'stroke-'),
      safeScore
    }
  }

  const isKeywordMatched = (
    keyword: string,
    matchedKeywords?: string[],
    missingKeywords?: string[]
  ): boolean | null => {
    if (!matchedKeywords && !missingKeywords) return null
    const lowerKeyword = keyword.toLowerCase()
    if (matchedKeywords && matchedKeywords.some((k) => k.toLowerCase() === lowerKeyword)) {
      return true
    }
    if (missingKeywords && missingKeywords.some((k) => k.toLowerCase() === lowerKeyword)) {
      return false
    }
    return null
  }

  const buildHighFrequencyList = (data: unknown): Array<{ keyword: string; count: number }> => {
    if (!data) return []
    if (Array.isArray(data)) {
      return data
        .map((item: unknown) => {
          if (!item) return null
          if (typeof item === 'string') return { keyword: item, count: 1 }
          if (Array.isArray(item)) return { keyword: item[0], count: item[1] ?? 1 }
          if (typeof item === 'object') {
            const rec = item as Record<string, unknown>
            return {
              keyword: (typeof rec.keyword === 'string' ? rec.keyword : typeof rec.term === 'string' ? rec.term : '') ?? '',
              count:
                typeof rec.frequency === 'number'
                  ? rec.frequency
                  : typeof rec.count === 'number'
                    ? rec.count
                    : 1
            }
          }
          return null
        })
        .filter((entry): entry is { keyword: string; count: number } => !!entry && !!entry.keyword)
    }
    if (typeof data === 'object') {
      return Object.entries(data as Record<string, unknown>).map(([keyword, count]) => ({
        keyword,
        count: typeof count === 'number' ? count : 1
      }))
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return buildHighFrequencyList(parsed)
      } catch {
        return []
      }
    }
    return []
  }

  const buildPriorityKeywords = (data: unknown): string[] => {
    if (!data) return []
    if (Array.isArray(data)) return data.filter((v): v is string => typeof v === 'string')
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    if (typeof data === 'object') {
      return Object.values(data as Record<string, unknown>).flatMap((value) =>
        Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
      )
    }
    return []
  }

  const highFrequencyList = buildHighFrequencyList(job?.high_frequency_keywords)
  const priorityKeywordsList = buildPriorityKeywords(job?.priority_keywords)
  const applyLink = resolveApplyLink(job?.easy_apply_url, job?.url)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="w-full px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-black text-slate-900">
                      {job.title}
                    </h1>
                    {job.max_salary && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">${job.max_salary.toLocaleString()}/yr</div>
                        <div className="text-sm text-gray-500">Max Salary</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {job.company && (
                      <span className="text-base text-gray-700 font-medium">{job.company}</span>
                    )}
                    {job.location && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-base text-gray-600">{job.location}</span>
                      </>
                    )}
                    {applyLink && (
                      <>
                        <span className="text-gray-400">•</span>
                        <a
                          href={applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {job.easy_apply_url ? 'Apply on LinkedIn' : 'View Job Posting'}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 px-11 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                  <select
                    value={job.status || 'bookmarked'}
                    onChange={(e) => updateJobField('status', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="h-6 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Importance</span>
                  <StarRating
                    rating={job.importance || 0}
                    onRatingChange={(rating) => updateJobField('importance', rating)}
                    interactive={true}
                    size="sm"
                  />
                </div>
                
                <div className="h-6 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Follow Up</span>
                  <input
                    type="date"
                    value={job.follow_up_date ? new Date(job.follow_up_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => updateJobField('follow_up_date', e.target.value || null)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-1">
              {(
                [
                  { id: 'overview', label: 'Overview', icon: DocumentIcon },
                  { id: 'notes', label: 'Notes', icon: EditIcon },
                  { id: 'resume', label: 'Resume Versions', icon: FileTextIcon },
                  { id: 'analysis', label: 'Analysis', icon: ChartIcon },
                  { id: 'coverLetters', label: 'Cover Letters', icon: MailIcon },
                ] as const
              ).map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent size={16} color="currentColor" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                    )}
                  </button>
                )
              })}
            </div>
            {(job.source || job.created_at) && (
              <div className="text-xs text-gray-400">
                {job.source && `Saved from ${job.source}`}
                {job.source && job.created_at && ' • '}
                {job.created_at && new Date(job.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Job Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Company</label>
                      <p className="text-gray-900">{job.company || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Location</label>
                      <p className="text-gray-900">{job.location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Work Type</label>
                      <p className="text-gray-900">{job.work_type || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Job Type</label>
                      <p className="text-gray-900">{job.job_type || 'N/A'}</p>
                    </div>
                    {(applyLink || job.url) && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          {applyLink ? 'Apply Link' : 'Job URL'}
                        </label>
                        <div className="flex flex-col gap-2 mt-1">
                          {applyLink && (
                            <a
                              href={applyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Apply on LinkedIn
                            </a>
                          )}
                          {job.url && job.url !== applyLink && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Original Posting
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Match Dashboard</h3>
                  {overallScore !== null ? (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20 mb-3">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                              <circle
                                className="text-gray-200"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                cx="18"
                                cy="18"
                                r="15"
                              />
                              {(() => {
                                const ring = getScoreRing(overallScore)
                                return (
                                  <circle
                                    className={ring.strokeClass.replace('stroke-', 'text-')}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeDasharray={`${(overallScore / 100) * 94.2}, 94.2`}
                                    cx="18"
                                    cy="18"
                                    r="15"
                                  />
                                )
                              })()}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>
                                {overallScore}%
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                              ATS Score
                            </div>
                            <p className="text-xs text-gray-600">
                              {overallScore >= 80
                                ? 'Excellent'
                                : overallScore >= 60
                                  ? 'Strong'
                                  : overallScore >= 40
                                    ? 'Fair'
                                    : 'Needs Work'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20 mb-3">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                              <circle
                                className="text-gray-200"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                cx="18"
                                cy="18"
                                r="15"
                              />
                              {(() => {
                                const coverage = keywordCoverageSnapshot !== null
                                  ? keywordCoverageSnapshot
                                  : bestMatch?.keyword_coverage !== undefined && bestMatch?.keyword_coverage !== null
                                    ? bestMatch.keyword_coverage
                                    : 0
                                return (
                                  <circle
                                    className="text-blue-500"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeDasharray={`${(coverage / 100) * 94.2}, 94.2`}
                                    cx="18"
                                    cy="18"
                                    r="15"
                                  />
                                )
                              })()}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-blue-600">
                                {keywordCoverageSnapshot !== null
                                  ? Math.round(keywordCoverageSnapshot)
                                  : bestMatch?.keyword_coverage !== undefined && bestMatch?.keyword_coverage !== null
                                    ? Math.round(bestMatch.keyword_coverage)
                                    : '—'}%
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                              Keyword Coverage
                            </div>
                            {(matchedKeywordsCount !== null || totalKeywordsCount !== null) && (
                              <p className="text-xs text-gray-600">
                                {matchedKeywordsCount ?? '—'}/{totalKeywordsCount ?? '—'} keywords
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20 mb-3">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                              <circle
                                className="text-gray-200"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                cx="18"
                                cy="18"
                                r="15"
                              />
                              {estimatedKeywordScore !== null && (
                                <circle
                                  className="text-purple-500"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={`${(estimatedKeywordScore / 100) * 94.2}, 94.2`}
                                  cx="18"
                                  cy="18"
                                  r="15"
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-purple-600">
                                {estimatedKeywordScore !== null ? `${estimatedKeywordScore}%` : '—'}
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                              Keyword Fit
                            </div>
                            <p className="text-xs text-gray-600">Quick scan</p>
                          </div>
                        </div>
                      </div>

                      {missingKeywordsSample.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Next Keywords To Add
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {missingKeywordsSample.slice(0, 5).map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {bestMatch?.resume_name && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Matched Resume
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-900">
                            {bestMatch.resume_name}
                            {bestMatch.resume_version_label && (
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                ({bestMatch.resume_version_label})
                              </span>
                            )}
                          </div>
                          {bestMatch.resume_version_id && (
                            <a
                              href={`${config.apiBase}/api/resume/version/${bestMatch.resume_version_id}`}
                              target="_blank"
                              className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:underline"
                            >
                              View matched resume version
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No matches yet. Analyze this job with a resume to see ATS scores.</p>
                  )}
                </div>
              </div>

              {(allTechnicalSkills.length > 0 || highlightedKeywords.length > 0 || job.content) && (
                <div className="space-y-5">
                  {(allTechnicalSkills.length > 0 || highlightedKeywords.length > 0) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-black text-slate-900 mb-4">Keyword Analysis</h3>
                      <div className="space-y-5">
                        {(() => {
                          const extracted = job.extracted_keywords
                          const softSkills: string[] = []
                          if (isRecord(extracted) && Array.isArray(extracted.soft_skills)) {
                            softSkills.push(...extracted.soft_skills.map(sanitizeKeywordValue).filter((s): s is string => typeof s === 'string').map((s) => s.toLowerCase()))
                          }
                          const uniqueSoftSkills = Array.from(new Set(softSkills)).slice(0, 15)
                          
                          const getChipStyles = (category: 'hard-skill' | 'tool' | 'soft-skill') => {
                            switch (category) {
                              case 'hard-skill':
                                return 'bg-blue-50 text-blue-700 border-blue-200'
                              case 'tool':
                                return 'bg-purple-50 text-purple-700 border-purple-200'
                              case 'soft-skill':
                                return 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              default:
                                return 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          }

                          const renderKeywordChip = (keyword: string, category: 'hard-skill' | 'tool' | 'soft-skill') => {
                            const isMatched = isKeywordMatched(keyword, bestMatch?.matched_keywords, bestMatch?.missing_keywords)
                            const chipStyles = getChipStyles(category)
                            
                            return (
                              <span
                                key={keyword}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${chipStyles} inline-flex items-center gap-1.5`}
                              >
                                {isMatched === true && (
                                  <CheckIcon size={12} color="currentColor" className="flex-shrink-0" />
                                )}
                                {isMatched === false && (
                                  <XIcon size={12} color="currentColor" className="flex-shrink-0" />
                                )}
                                {formatKeywordDisplay(keyword)}
                              </span>
                            )
                          }

                          return (
                            <>
                              {allTechnicalSkills.length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-base">⚙️</span>
                                    Hard Skills
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {allTechnicalSkills.map((skill) => 
                                      renderKeywordChip(skill, 'hard-skill')
                                    )}
                                  </div>
                                </div>
                              )}

                              {uniqueSoftSkills.length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-base">💬</span>
                                    Soft Skills
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {uniqueSoftSkills.map((skill) => 
                                      renderKeywordChip(skill, 'soft-skill')
                                    )}
                                  </div>
                                </div>
                              )}

                              {highlightedKeywords.length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-base">🛠️</span>
                                    Tools & Software
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {highlightedKeywords.slice(0, 20).map((keyword) => 
                                      renderKeywordChip(keyword, 'tool')
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {job.content && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-black text-slate-900">Job Description</h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[420px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.content}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes about this job..."
                className="w-full h-64 p-4 border rounded-lg resize-none"
              />
              <button
                onClick={saveNotes}
                disabled={saving}
                className="px-6 py-2 border border-indigo-600 text-indigo-600 bg-transparent rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 mb-2">Match This Job With a Resume</h3>
                    <p className="text-sm text-gray-600">
                      Choose one of your master resumes to open the editor with this job description loaded on the right.
                    </p>
                  </div>
                  {bestMatch && (
                    <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                      Best ATS Score: {bestMatch.score}%
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">Select Resume</label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loadingResumes || resumeOptions.length === 0}
                      className="px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white font-medium"
                    >
                      <option value="">{loadingResumes ? 'Loading resumes...' : 'Select a resume'}</option>
                      {resumeOptions.map((resume, index) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.name}{index === 0 ? ' (Master Resume)' : ''}
                        </option>
                      ))}
                    </select>
                    {resumeOptions.length > 0 && resumeOptions[0] && selectedResumeId === resumeOptions[0].id && (
                      <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold w-fit">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Master Resume
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center gap-3 py-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <DocumentIcon size={24} color="#0f62fe" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Master Resume</span>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <BriefcaseIcon size={24} color="#9333ea" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Job-Specific Version</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={async () => {
                        if (!selectedResumeId) {
                          await showAlert({
                            title: 'Selection Required',
                            message: 'Please select a resume to continue.',
                            type: 'warning'
                          })
                          return
                        }
                        window.location.href = `/editor?resumeId=${selectedResumeId}&jdId=${job.id}`
                      }}
                      className="flex-1 min-w-[200px] px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-all"
                      disabled={!selectedResumeId}
                    >
                      Optimize for Job Description
                    </button>
                    <button
                      onClick={() => setShowUploadResumeModal(true)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 bg-transparent rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    >
                      Upload Resume to Match
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">Saved Matches</h3>
                  {bestMatch && (
                    <span className="text-xs text-gray-500">
                      Highest score recorded on {bestMatch.updated_at ? new Date(bestMatch.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                </div>

                {job.resume_versions && job.resume_versions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                            Resume Version
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                            ATS Score
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                            Keywords
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                            Date Saved
                          </th>
                          <th className="px-4 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {job.resume_versions.map((match) => {
                          const resolveNumeric = (...values: Array<number | null | undefined>) => {
                            for (const value of values) {
                              if (typeof value === 'number' && Number.isFinite(value)) {
                                return Math.round(value)
                              }
                            }
                            return null
                          }

                          const matchRecord = match as unknown as Record<string, unknown>
                          const matchAnalysis =
                            typeof matchRecord.match_analysis === 'object' && matchRecord.match_analysis !== null
                              ? (matchRecord.match_analysis as Record<string, unknown>)
                              : null
                          const scoreSnapshot =
                            typeof matchRecord.score_snapshot === 'object' && matchRecord.score_snapshot !== null
                              ? (matchRecord.score_snapshot as Record<string, unknown>)
                              : null

                          const matchScore = resolveNumeric(
                            match.score,
                            typeof matchAnalysis?.similarity_score === 'number' ? matchAnalysis.similarity_score : null,
                            typeof scoreSnapshot?.overall_score === 'number' ? scoreSnapshot.overall_score : null
                          )

                          const keywordCoverageValue = resolveNumeric(
                            match.keyword_coverage,
                            typeof matchAnalysis?.keyword_coverage === 'number' ? matchAnalysis.keyword_coverage : null,
                            typeof scoreSnapshot?.keyword_coverage === 'number' ? scoreSnapshot.keyword_coverage : null
                          )

                          const getScoreColor = (score: number | null) => {
                            if (score === null) return { ring: 'text-gray-300', text: 'text-gray-600' }
                            if (score >= 80) return { ring: 'text-green-500', text: 'text-gray-900' }
                            return { ring: 'text-gray-300', text: 'text-gray-600' }
                          }

                          const scoreColors = getScoreColor(matchScore)

                          return (
                            <tr 
                              key={match.id}
                              className="hover:bg-gray-50/50 transition-colors group"
                            >
                              <td className="px-4 py-6">
                                <div>
                                  <div className="font-semibold text-text-primary text-sm leading-tight">
                                    {match.resume_name || 'Resume'}
                                  </div>
                                  {match.resume_version_label && (
                                    <div className="text-xs text-text-muted mt-0.5">
                                      {match.resume_version_label}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-6">
                                {matchScore !== null ? (
                                  <div className="flex items-center">
                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                        <circle
                                          className="text-gray-200"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          fill="none"
                                          cx="18"
                                          cy="18"
                                          r="15"
                                        />
                                        <circle
                                          className={scoreColors.ring}
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          fill="none"
                                          strokeLinecap="round"
                                          strokeDasharray={`${(matchScore / 100) * 94.2}, 94.2`}
                                          cx="18"
                                          cy="18"
                                          r="15"
                                        />
                                      </svg>
                                      <span className={`absolute text-sm font-bold ${scoreColors.text}`}>
                                        {matchScore}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">—</span>
                                )}
                              </td>
                              <td className="px-4 py-6">
                                <div className="space-y-1">
                                  {keywordCoverageValue !== null && (
                                    <div className="text-xs text-text-muted">
                                      Coverage: {keywordCoverageValue}%
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {match.matched_keywords && match.matched_keywords.length > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                        {match.matched_keywords.length} matched
                                      </span>
                                    )}
                                    {match.missing_keywords && match.missing_keywords.length > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded">
                                        {match.missing_keywords.length} missing
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-6 text-sm text-text-muted">
                                {match.updated_at 
                                  ? new Date(match.updated_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  : match.created_at
                                    ? new Date(match.created_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : '-'}
                              </td>
                              <td className="px-4 py-6">
                                <div className="flex items-center justify-end gap-2">
                                  {match.resume_id && (
                                    <button
                                      onClick={() => {
                                        const versionQuery = match.resume_version_id ? `&resumeVersionId=${match.resume_version_id}` : ''
                                        window.location.href = `/editor?resumeId=${match.resume_id}${versionQuery}&jdId=${job.id}`
                                      }}
                                      className="text-xs px-4 py-2 border border-gray-300 text-gray-700 bg-transparent rounded-lg font-medium hover:bg-gray-50 transition-all"
                                    >
                                      Open in Editor
                                    </button>
                                  )}
                                  {match.resume_version_id && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          if (!isAuthenticated || !user?.email) {
                                            showAlert({
                                              type: 'error',
                                              message: 'Please sign in to export resumes',
                                              title: 'Authentication Required'
                                            })
                                            return
                                          }

                                          const userEmail = user.email
                                          
                                          const versionRes = await fetch(`${config.apiBase}/api/resume/version/${match.resume_version_id}?user_email=${encodeURIComponent(userEmail)}`)
                                          if (!versionRes.ok) {
                                            throw new Error('Failed to fetch version data')
                                          }
                                          
                                          const versionData = await versionRes.json()
                                          const resumeData = versionData.version.resume_data
                                          
                                          const exportUrl = `${config.apiBase}/api/resume/export/pdf?user_email=${encodeURIComponent(userEmail)}`
                                          const exportResponse = await fetch(exportUrl, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              name: resumeData.personalInfo?.name || resumeData.name || 'Resume',
                                              title: resumeData.personalInfo?.title || resumeData.title || '',
                                              email: resumeData.personalInfo?.email || resumeData.email || '',
                                              phone: resumeData.personalInfo?.phone || resumeData.phone || '',
                                              location: resumeData.personalInfo?.location || resumeData.location || '',
                                              summary: resumeData.summary || '',
                                              sections: resumeData.sections || [],
                                              replacements: {},
                                              template: resumeData.template || 'tech',
                                              two_column_left: [],
                                              two_column_right: [],
                                              two_column_left_width: 50
                                            })
                                          })
                                          
                                          if (exportResponse.ok) {
                                            const blob = await exportResponse.blob()
                                            const url = window.URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            const versionLabel = match.resume_version_label || `v${versionData.version.version_number}`
                                            a.download = `Resume_${versionLabel}.pdf`
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                            window.URL.revokeObjectURL(url)
                                          } else {
                                            throw new Error(`Export failed: ${exportResponse.status}`)
                                          }
                                        } catch (error) {
                                          console.error('Failed to export version:', error)
                                          showAlert({
                                            type: 'error',
                                            message: `Failed to export version: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                            title: 'Export Failed'
                                          })
                                        }
                                      }}
                                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                      title="Export PDF"
                                    >
                                      <FileTextIcon size={18} color="currentColor" />
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      const confirmed = await showConfirm({
                                        title: 'Delete Resume Version',
                                        message: `Are you sure you want to delete this resume version match? This action cannot be undone.`,
                                        confirmText: 'Delete',
                                        cancelText: 'Cancel',
                                        type: 'danger'
                                      })

                                      if (!confirmed) return

                                      try {
                                        if (!isAuthenticated || !user?.email) {
                                          showAlert({
                                            type: 'error',
                                            message: 'Please sign in to delete resume versions',
                                            title: 'Authentication Required'
                                          })
                                          return
                                        }

                                        const userEmail = user.email
                                        const deleteUrl = `${config.apiBase}/api/job-descriptions/${job.id}/resume-versions/${match.id}?user_email=${encodeURIComponent(userEmail)}`
                                        
                                        const deleteResponse = await fetch(deleteUrl, {
                                          method: 'DELETE',
                                          headers: { 'Content-Type': 'application/json' }
                                        })

                                        if (deleteResponse.ok) {
                                          showAlert({
                                            type: 'success',
                                            message: 'Resume version match deleted successfully',
                                            title: 'Deleted'
                                          })
                                          fetchJobDetails()
                                          if (onUpdate) {
                                            onUpdate()
                                          }
                                        } else {
                                          const errorData = await deleteResponse.json().catch(() => ({ detail: 'Failed to delete resume version match' }))
                                          throw new Error(errorData.detail || `HTTP ${deleteResponse.status}`)
                                        }
                                      } catch (error) {
                                        console.error('Failed to delete resume version:', error)
                                        showAlert({
                                          type: 'error',
                                          message: `Failed to delete resume version: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                          title: 'Delete Failed'
                                        })
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete this resume version match"
                                  >
                                    <XIcon size={18} color="currentColor" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                        <BriefcaseIcon size={40} color="#6b7280" />
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">No saved matches yet</h4>
                    <p className="text-sm text-gray-600 mb-6">Select a resume above to create a job-specific version and see your ATS score.</p>
                    <button
                      onClick={() => {
                        const firstResume = resumeOptions[0]
                        if (firstResume) {
                          setSelectedResumeId(firstResume.id)
                        }
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md transition-all"
                    >
                      Start Matching
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-900">ATS Analysis & Keywords</h3>
              
              {bestMatch && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                  <h4 className="text-lg font-black text-slate-900 mb-4">Top Match Score: {bestMatch.score}%</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Matched Resume</label>
                      <p className="text-gray-900">
                        {bestMatch.resume_name || 'N/A'}
                        {bestMatch.resume_version_label && <span className="text-gray-500 ml-1">({bestMatch.resume_version_label})</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Match Date</label>
                      <p className="text-gray-900">
                        {bestMatch.updated_at ? new Date(bestMatch.updated_at).toLocaleString() : bestMatch.created_at ? new Date(bestMatch.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {highFrequencyList.length > 0 && (
                <div>
                  <h4 className="text-md font-black text-slate-900 mb-4">High Frequency Keywords</h4>
                  <div className="space-y-2">
                    {highFrequencyList
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 20)
                      .map(({ keyword, count }) => {
                        const maxCount = Math.max(...highFrequencyList.map(item => item.count))
                        const percentage = (count / maxCount) * 100
                        return (
                          <div key={keyword} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 truncate">{formatKeywordDisplay(keyword)}</span>
                                <span className="text-xs text-gray-500 ml-2">{count}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {priorityKeywordsList.length > 0 && (
                <div>
                  <h4 className="text-md font-black text-slate-900 mb-3">Priority Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {priorityKeywordsList.map((keyword: string) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.resume_versions && job.resume_versions.length > 0 && (
                <div>
                  <h4 className="text-md font-black text-slate-900 mb-3">All Matched Versions ({job.resume_versions.length})</h4>
                  <div className="space-y-3">
                    {job.resume_versions.map((match, idx) => (
                      <div key={match.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Version {match.resume_version_label || idx + 1}</span>
                            <span className={`px-3 py-1 rounded text-sm font-bold ${
                              (match.score || 0) >= 80 ? 'bg-green-100 text-green-700' :
                              (match.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {match.score}%
                            </span>
                          </div>
                          {match.resume_name && <div className="text-gray-600 text-sm mt-1">{match.resume_name}</div>}
                          <div className="text-xs text-gray-500 mt-1">
                            {match.updated_at ? new Date(match.updated_at).toLocaleString() : match.created_at ? new Date(match.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.resume_version_id && (
                            <a
                              href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                              target="_blank"
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          )}
                          {match.resume_id && (
                            <button
                              onClick={() => {
                                const versionQuery = match.resume_version_id ? `&resumeVersionId=${match.resume_version_id}` : ''
                                window.location.href = `/editor?resumeId=${match.resume_id}${versionQuery}&jdId=${job.id}`
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Improve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'coverLetters' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MailIcon size={28} color="#0f62fe" />
                      <h2 className="text-2xl font-black text-slate-900">Cover Letters</h2>
                    </div>
                    <p className="text-gray-600">
                      Generate cover letters using AI or manage your saved versions. Each version is saved separately and can be exported.
                  </p>
                </div>
                  <button
                    onClick={handleOpenCoverLetterGenerator}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md transition-all text-lg"
                  >
                    <span>🤖</span>
                    <span>Generate Cover Letter with AI</span>
                  </button>
                </div>
                  </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg" style={{ minHeight: '200px' }}>
                <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <DocumentIcon size={24} color="#0f62fe" />
                      <span>Saved Cover Letters</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Click on any cover letter to select it for export</p>
                  </div>
                  <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-lg">
                    {coverLetters.length} {coverLetters.length === 1 ? 'Version' : 'Versions'}
                </div>
              </div>

                {/* Cover Letters List */}
              <div className="space-y-3">
                  {!coverLetters || !Array.isArray(coverLetters) || coverLetters.length === 0 ? (
                    <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                      <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                          <MailIcon size={48} color="#0f62fe" />
                        </div>
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">No cover letters saved yet</h4>
                      <p className="text-sm text-gray-600 mb-8">Generate your first cover letter using AI to get started.</p>
                      <button
                        onClick={handleOpenCoverLetterGenerator}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md transition-all inline-flex items-center gap-2"
                      >
                        <span>🤖</span>
                        <span>Generate Cover Letter with AI</span>
                      </button>
                  </div>
                ) : (
                    coverLetters.map((letter, index) => {
                      if (!letter || !letter.id) {
                        return null
                      }
                      return (
                      <div 
                        key={`cover-letter-${letter.id}-${index}`}
                        onClick={() => handleSelectCoverLetter(letter)}
                        className={`group border border-gray-200 rounded-lg p-4 cursor-pointer transition-all bg-white hover:border-gray-300 hover:shadow-sm ${
                          selectedCoverLetterId === letter.id 
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{letter.title}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">v{letter.version_number}</span>
                              {selectedCoverLetterId === letter.id && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold">Selected</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated {letter.updated_at ? new Date(letter.updated_at).toLocaleString() : letter.created_at ? new Date(letter.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleExportCoverLetter(letter, 'pdf')}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Export as PDF"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (navigator?.clipboard?.writeText) {
                                  try {
                                    await navigator.clipboard.writeText(letter.content || '')
                                    await showAlert({
                                      title: 'Success',
                                      message: 'Cover letter copied to clipboard',
                                      type: 'success',
                                      icon: '✅'
                                    })
                                  } catch {
                                    await showAlert({
                                      title: 'Error',
                                      message: 'Failed to copy cover letter',
                                      type: 'error'
                                    })
                                  }
                                } else {
                                  await showAlert({
                                    title: 'Not Available',
                                    message: 'Clipboard access is not available in this browser.',
                                    type: 'warning'
                                  })
                                }
                              }}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copy to clipboard"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingLetterId(letter.id)
                                setEditingLetterTitle(letter.title)
                                setEditingLetterContent(letter.content)
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit cover letter"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const confirmed = await showConfirm({
                                  title: 'Delete Cover Letter',
                                  message: `Are you sure you want to delete "${letter.title}"? This action cannot be undone.`,
                                  confirmText: 'Delete',
                                  cancelText: 'Cancel',
                                  type: 'danger',
                                  icon: '🗑️'
                                })
                                if (confirmed) {
                                  handleDeleteCoverLetter(letter.id)
                                }
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete cover letter"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {editingLetterId === letter.id && (
                          <div className="space-y-2 border-t border-gray-200 pt-3 mt-3">
                            <input
                              value={editingLetterTitle}
                              onChange={(e) => setEditingLetterTitle(e.target.value)}
                              className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Cover letter title"
                            />
                            <textarea
                              value={editingLetterContent}
                              onChange={(e) => setEditingLetterContent(e.target.value)}
                              className="px-3 py-2 border rounded-lg w-full min-h-[500px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-sm leading-relaxed"
                              placeholder="Cover letter content"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdateCoverLetter}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLetterId(null)
                                  setEditingLetterContent('')
                                  setEditingLetterTitle('')
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      )
                    })
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showUploadResumeModal && job && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10010] flex items-center justify-center p-4"
          onClick={() => setShowUploadResumeModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-black text-slate-900">Upload Resume to Match</h2>
                <p className="text-sm text-gray-500">We will parse your resume and open the editor with this job loaded.</p>
              </div>
              <button
                onClick={() => setShowUploadResumeModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close upload resume modal"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-6">
              <UploadResume variant="modal" onUploadSuccess={handleUploadResumeForMatch} />
            </div>
          </div>
        </div>
      )}

      {showCoverLetterGenerator && resumeDataForCoverLetter && isRecord(resumeDataForCoverLetter) && 
        typeof resumeDataForCoverLetter.name === 'string' &&
        typeof resumeDataForCoverLetter.title === 'string' &&
        Array.isArray(resumeDataForCoverLetter.sections) ? (
        <CoverLetterGenerator
          resumeData={{
            name: resumeDataForCoverLetter.name,
            title: resumeDataForCoverLetter.title,
            email: typeof resumeDataForCoverLetter.email === 'string' ? resumeDataForCoverLetter.email : undefined,
            phone: typeof resumeDataForCoverLetter.phone === 'string' ? resumeDataForCoverLetter.phone : undefined,
            location: typeof resumeDataForCoverLetter.location === 'string' ? resumeDataForCoverLetter.location : undefined,
            summary: typeof resumeDataForCoverLetter.summary === 'string' ? resumeDataForCoverLetter.summary : undefined,
            sections: resumeDataForCoverLetter.sections.map((s: unknown) => {
              if (!isRecord(s) || typeof s.id !== 'string' || typeof s.title !== 'string' || !Array.isArray(s.bullets)) {
                return { id: '', title: '', bullets: [] };
              }
              return {
                id: s.id,
                title: s.title,
                bullets: s.bullets.map((b: unknown) => {
                  if (!isRecord(b) || typeof b.id !== 'string' || typeof b.text !== 'string') {
                    return { id: '', text: '', params: undefined };
                  }
                  return {
                    id: b.id,
                    text: b.text,
                    params: isRecord(b.params) ? b.params as Record<string, unknown> : undefined
                  };
                }),
                params: isRecord(s.params) ? s.params as Record<string, unknown> : undefined
              };
            }),
            fieldsVisible: isRecord(resumeDataForCoverLetter.fieldsVisible) ? resumeDataForCoverLetter.fieldsVisible as Record<string, boolean> : undefined
          }}
          onClose={() => setShowCoverLetterGenerator(false)}
          onCoverLetterChange={handleCoverLetterGenerated}
          initialJobDescription={job?.content || ''}
          initialCompanyName={job?.company || ''}
          initialPositionTitle={job?.title || ''}
          jobId={jobId}
          onSaveSuccess={(savedLetter) => {
            setShowCoverLetterGenerator(false)
            
            if (savedLetter && savedLetter.id) {
              setCoverLetters((prev) => {
                const exists = prev.find(cl => cl.id === savedLetter.id)
                if (exists) {
                  return prev.map(cl => cl.id === savedLetter.id ? savedLetter : cl)
                } else {
                  return [savedLetter, ...prev]
                }
              })
              
              handleSelectCoverLetter(savedLetter)
            } else {
              setTimeout(() => {
                fetchJobDetails()
              }, 500)
            }
            
            if (onUpdate) onUpdate()
          }}
        />
      ) : null}
    </div>
  )
}

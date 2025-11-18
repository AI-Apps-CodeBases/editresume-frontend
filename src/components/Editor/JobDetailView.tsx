'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import config from '@/lib/config'
import UploadResume from './UploadResume'
import CoverLetterGenerator from '@/components/AI/CoverLetterGenerator'

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
  location?: string
  work_type?: string
  job_type?: string
  content?: string
  max_salary?: number
  status?: string
  follow_up_date?: string
  important_emoji?: string
  created_at?: string
  extracted_keywords?: any
  priority_keywords?: any
  high_frequency_keywords?: any
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
  { value: 'bookmarked', label: '📌 Bookmarked', color: 'bg-gray-100 text-gray-700' },
  { value: 'applied', label: '📝 Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'interview_set', label: '📅 Interview Set', color: 'bg-purple-100 text-purple-700' },
  { value: 'interviewing', label: '💼 Interviewing', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiating', label: '🤝 Negotiating', color: 'bg-orange-100 text-orange-700' },
  { value: 'accepted', label: '✅ Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '❌ Rejected', color: 'bg-red-100 text-red-700' },
]

const EMOJI_OPTIONS = ['⭐', '🔥', '💎', '🚀', '💼', '🎯', '✨', '🏆', '💪', '🎉']

export default function JobDetailView({ jobId, onBack, onUpdate }: Props) {
  const { user, isAuthenticated } = useAuth()
  const { showAlert, showConfirm } = useModal()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resume' | 'analysis' | 'coverLetters'>('overview')
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
  const [resumeDataForCoverLetter, setResumeDataForCoverLetter] = useState<any>(null)
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | null>(null)

  useEffect(() => {
    if (jobId && isAuthenticated && user?.email) {
      fetchJobDetails()
    }
  }, [jobId, isAuthenticated, user?.email])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchResumes()
    }
  }, [isAuthenticated, user?.email])

  const fetchJobDetails = async () => {
    if (!user?.email) return
    
    setLoading(true)
    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        setJob(data)
        
        if (data.notes) {
          setNotes(data.notes)
        }
        
        // Always fetch cover letters directly from the dedicated endpoint
        let letters: JobCoverLetter[] = []
        try {
          const coverLetterRes = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters`)
          if (coverLetterRes.ok) {
            const coverLetterData = await coverLetterRes.json()
            if (coverLetterData && Array.isArray(coverLetterData)) {
              letters = coverLetterData.filter((l: any) => l && l.id)
            }
          }
        } catch (e) {
          console.error('Failed to fetch cover letters:', e)
        }
        
        // Fallback to data.cover_letters if direct fetch failed
        if (letters.length === 0 && data.cover_letters && Array.isArray(data.cover_letters)) {
          letters = data.cover_letters.filter((l: any) => l && l.id)
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
  }

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

  const sanitizeKeywordValue = useCallback((value: any): string | null => {
    if (!value) return null
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'object' && value !== null) {
      if (typeof value.keyword === 'string') return value.keyword.trim()
      if (typeof value.name === 'string') return value.name.trim()
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
    if (extracted && Array.isArray(extracted.technical_keywords)) {
      rawSkills.push(...extracted.technical_keywords)
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
    if (extracted && Array.isArray(extracted.general_keywords)) {
      rawKeywords.push(...extracted.general_keywords)
    }
    if (Array.isArray(job.high_frequency_keywords)) {
      job.high_frequency_keywords.forEach((item: any) => {
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

  const updateJobField = async (field: string, value: any) => {
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
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${editingLetterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLetterTitle.trim(),
          content: editingLetterContent.trim()
        })
      })
      if (res.ok) {
        const updated = await res.json()
        console.log('Cover letter updated:', updated)
        
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
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${letterId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        console.log('Cover letter deleted successfully:', letterId)
        
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
          const resumeVersionRes = await fetch(`${config.apiBase}/api/resumes/${latestResume.id}/versions/latest`)
          if (resumeVersionRes.ok) {
            const versionData = await resumeVersionRes.json()
            setResumeDataForCoverLetter(versionData.resume_data || {
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
        jobId: jobId
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
        const resumeVersionRes = await fetch(`${config.apiBase}/api/resumes/${latestResume.id}/versions/latest`)
        if (resumeVersionRes.ok) {
          const versionData = await resumeVersionRes.json()
          resumeData = versionData.resume_data || resumeData
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

  const handleUploadResumeForMatch = useCallback((data: any) => {
     if (!job) {
       return
     }
 
     // Deduplicate sections by title (case-insensitive) - keep first occurrence
     const sections = Array.isArray(data?.sections) ? data.sections : []
     const seenTitles = new Map<string, number>() // Map to track first occurrence index
     const deduplicatedSections = sections.filter((section: any, index: number) => {
       if (!section || !section.title) return false
       const titleLower = section.title.toLowerCase().trim()
       if (seenTitles.has(titleLower)) {
         const firstIndex = seenTitles.get(titleLower)!
         console.warn(`⚠️ Removing duplicate section "${section.title}" during upload (job match) - keeping first occurrence at index ${firstIndex}`)
         return false
       }
       seenTitles.set(titleLower, index)
       return true
     })
     
     console.log(`📋 Deduplicated sections during upload (job match): ${sections.length} → ${deduplicatedSections.length}`)
 
     const normalizedResume = {
       name: data?.name || '',
       title: data?.title || '',
       email: data?.email || '',
       phone: data?.phone || '',
       location: data?.location || '',
       summary: data?.summary || '',
       sections: deduplicatedSections
     }
 
     if (typeof window !== 'undefined') {
       try {
         window.localStorage.setItem('activeJobDescriptionId', String(job.id))
         if (job.content) {
           window.localStorage.setItem('deepLinkedJD', job.content)
         }
         // Clear ALL cached resume data before uploading
         console.log('🧹 Clearing all cached resume data before upload (from job match)')
         window.localStorage.removeItem('currentResumeId')
         window.localStorage.removeItem('currentResumeVersionId')
         window.localStorage.removeItem('resumeData') // Clear cached resume
         window.localStorage.removeItem('selectedTemplate') // Clear cached template

         const uploadToken = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
         const payload = {
           resume: normalizedResume,
           template: data?.template || 'tech'
         }
         console.log('💾 Storing uploaded resume in sessionStorage:', uploadToken)
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
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
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

  const scoreSnapshot =
    job.ats_insights && typeof job.ats_insights === 'object'
      ? (job.ats_insights as any).score_snapshot ?? null
      : null

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

  const buildHighFrequencyList = (data: any): Array<{ keyword: string; count: number }> => {
    if (!data) return []
    if (Array.isArray(data)) {
      return data
        .map((item: any) => {
          if (!item) return null
          if (typeof item === 'string') return { keyword: item, count: 1 }
          if (Array.isArray(item)) return { keyword: item[0], count: item[1] ?? 1 }
          if (typeof item === 'object') {
            return {
              keyword: item.keyword ?? item.term ?? '',
              count: item.frequency ?? item.count ?? 1
            }
          }
          return null
        })
        .filter((entry): entry is { keyword: string; count: number } => !!entry && !!entry.keyword)
    }
    if (typeof data === 'object') {
      return Object.entries(data).map(([keyword, count]) => ({
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

  const buildPriorityKeywords = (data: any): string[] => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    if (typeof data === 'object') {
      return Object.values(data).flatMap((value) => (Array.isArray(value) ? value : []))
    }
    return []
  }

  const highFrequencyList = buildHighFrequencyList(job?.high_frequency_keywords)
  const priorityKeywordsList = buildPriorityKeywords(job?.priority_keywords)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {job.important_emoji && <span className="text-3xl">{job.important_emoji}</span>}
                  {job.title}
                </h1>
                <p className="text-gray-600 mt-1">
                  {job.company} {job.location && `• ${job.location}`}
                  {job.source && ` • Saved from ${job.source}`}
                  {job.created_at && ` • ${new Date(job.created_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            {job.max_salary && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">${job.max_salary.toLocaleString()}/yr</div>
                <div className="text-sm text-gray-500">Max Salary</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <select
              value={job.status || 'bookmarked'}
              onChange={(e) => updateJobField('status', e.target.value)}
              className="px-4 py-2 border rounded-lg font-semibold"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Important:</span>
              <div className="flex gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => updateJobField('important_emoji', job.important_emoji === emoji ? null : emoji)}
                    className={`text-2xl p-1 rounded ${job.important_emoji === emoji ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'hover:bg-gray-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Follow Up:</span>
              <input
                type="date"
                value={job.follow_up_date ? new Date(job.follow_up_date).toISOString().split('T')[0] : ''}
                onChange={(e) => updateJobField('follow_up_date', e.target.value || null)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {[
              { id: 'overview', label: '📋 Overview' },
              { id: 'notes', label: '📝 Notes' },
              { id: 'resume', label: '📄 Resume' },
              { id: 'analysis', label: '📊 Analysis' },
              { id: 'coverLetters', label: '✉️ Cover Letters' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Job Information</h3>
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
                    {job.url && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Job URL</label>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Original Posting
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Match Information</h3>
                  {overallScore !== null ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="relative inline-flex h-24 w-24 items-center justify-center">
                          <svg viewBox="0 0 36 36" className="h-24 w-24">
                            <path
                              className="text-gray-200"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                            />
                            {(() => {
                              const ring = getScoreRing(overallScore)
                              return (
                                <path
                                  className={ring.strokeClass}
                                  strokeLinecap="round"
                                  strokeWidth="4"
                                  fill="none"
                                  strokeDasharray={`${ring.safeScore}, 100`}
                                  d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                />
                              )
                            })()}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                              {overallScore}%
                            </span>
                            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              ATS Score
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Best ATS Snapshot
                          </div>
                          <p className="mt-2 text-sm font-semibold text-gray-700">
                            {overallScore >= 80
                              ? 'Excellent alignment'
                              : overallScore >= 60
                                ? 'Strong alignment'
                                : overallScore >= 40
                                  ? 'Fair alignment'
                                  : 'Needs attention'}
                          </p>
                          {matchSummary && (
                            <p className="mt-1 text-xs text-gray-500">{matchSummary}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Keyword Coverage
                          </div>
                          <div className="mt-2 text-xl font-semibold text-gray-900">
                            {keywordCoverageSnapshot !== null
                              ? `${Math.round(keywordCoverageSnapshot)}%`
                              : bestMatch?.keyword_coverage !== undefined && bestMatch?.keyword_coverage !== null
                                ? `${Math.round(bestMatch.keyword_coverage)}%`
                                : '—'}
                          </div>
                          {(matchedKeywordsCount !== null || totalKeywordsCount !== null) && (
                            <p className="mt-1 text-xs text-gray-500">
                              {matchedKeywordsCount ?? '—'}/{totalKeywordsCount ?? '—'} JD keywords covered.
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Estimated Keyword Fit
                          </div>
                          <div className="mt-2 text-xl font-semibold text-blue-700">
                            {estimatedKeywordScore !== null ? `${estimatedKeywordScore}%` : '—'}
                          </div>
                          <p className="mt-1 text-xs text-blue-700/70">
                            Quick keyword scan saved from the match panel.
                          </p>
                        </div>
                      </div>

                      {missingKeywordsSample.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Next Keywords To Add
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
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
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
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
                    </div>
                  ) : (
                    <p className="text-gray-500">No matches yet. Analyze this job with a resume to see ATS scores.</p>
                  )}
                </div>
              </div>

              {(allTechnicalSkills.length > 0 || highlightedKeywords.length > 0 || job.content) && (
                <div className="space-y-5">
                  {(allTechnicalSkills.length > 0 || highlightedKeywords.length > 0) && (
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                      <div className="grid gap-5 md:grid-cols-2">
                        {allTechnicalSkills.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2 flex items-center gap-2">
                              <span className="text-base">⚙️</span>
                              Technical Skills
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {allTechnicalSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm"
                                >
                                  {formatKeywordDisplay(skill)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {highlightedKeywords.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2 flex items-center gap-2">
                              <span className="text-base">📊</span>
                              Top Keywords
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {highlightedKeywords.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm"
                                >
                                  {formatKeywordDisplay(keyword)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {job.content && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Job Description</h3>
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
              <h3 className="text-lg font-bold text-gray-900">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes about this job..."
                className="w-full h-64 p-4 border rounded-lg resize-none"
              />
              <button
                onClick={saveNotes}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Match This Job With a Resume</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose one of your master resumes to open the editor with this job description loaded on the right.
                    </p>
                  </div>
                  {bestMatch && (
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Best ATS Score: {bestMatch.score}%
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col min-w-[220px]">
                    <label className="text-sm font-semibold text-gray-600 mb-1">Select resume</label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loadingResumes || resumeOptions.length === 0}
                      className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{loadingResumes ? 'Loading resumes...' : 'Select a resume'}</option>
                      {resumeOptions.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    disabled={!selectedResumeId}
                  >
                    Open in Editor
                  </button>
                  <button
                    onClick={() => setShowUploadResumeModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                  >
                    Upload Resume to Match
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Tip: After uploading and refining the resume in the editor, click “Save Match” to store the new ATS score here.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Saved Matches</h3>
                  {bestMatch && (
                    <span className="text-xs text-gray-500">
                      Highest score recorded on {bestMatch.updated_at ? new Date(bestMatch.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                </div>

                {job.resume_versions && job.resume_versions.length > 0 ? (
                  <div className="space-y-3">
                    {job.resume_versions.map((match) => {
                      const resolveNumeric = (...values: Array<number | null | undefined>) => {
                        for (const value of values) {
                          if (typeof value === 'number' && Number.isFinite(value)) {
                            return Math.round(value)
                          }
                        }
                        return null
                      }

                      const matchScore = resolveNumeric(
                        match.score,
                        (match as any)?.match_analysis?.similarity_score,
                        (match as any)?.score_snapshot?.overall_score
                      )

                      const keywordCoverageValue = resolveNumeric(
                        match.keyword_coverage,
                        (match as any)?.match_analysis?.keyword_coverage,
                        (match as any)?.score_snapshot?.keyword_coverage
                      )

                      const scoreClass = matchScore === null
                        ? 'bg-gray-100 text-gray-500'
                        : matchScore >= 80
                          ? 'bg-green-100 text-green-700'
                          : matchScore >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-orange-100 text-orange-700'

                      return (
                        <div
                          key={match.id}
                          className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${scoreClass}`}>
                                ATS: {matchScore !== null ? `${matchScore}%` : '—'}
                              </span>
                              {keywordCoverageValue !== null && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                Keywords {keywordCoverageValue}%
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {match.updated_at ? new Date(match.updated_at).toLocaleString() : match.created_at ? new Date(match.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700">
                              {match.resume_name || 'Resume'}
                              {match.resume_version_label && <span className="text-gray-400 ml-1">({match.resume_version_label})</span>}
                            </div>
                            {(match.matched_keywords?.length || match.missing_keywords?.length) && (
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
                                {match.matched_keywords && match.matched_keywords.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-green-600 mb-1">Matched Keywords ({match.matched_keywords.length})</div>
                                    <div className="flex flex-wrap gap-1 text-[11px]">
                                      {match.matched_keywords.slice(0, 15).map((kw) => (
                                        <span key={kw} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {match.missing_keywords && match.missing_keywords.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-red-600 mb-1">Improve These ({match.missing_keywords.length})</div>
                                    <div className="flex flex-wrap gap-1 text-[11px]">
                                      {match.missing_keywords.slice(0, 15).map((kw) => (
                                        <span key={kw} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {match.resume_id && (
                              <button
                                onClick={() => {
                                  const versionQuery = match.resume_version_id ? `&resumeVersionId=${match.resume_version_id}` : ''
                                  window.location.href = `/editor?resumeId=${match.resume_id}${versionQuery}&jdId=${job.id}`
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Improve in Editor
                              </button>
                            )}
                            {match.resume_id && (
                              <button
                                onClick={() => {
                                  const versionQuery = match.resume_version_id ? `&resumeVersionId=${match.resume_version_id}` : ''
                                  window.location.href = `/editor?resumeId=${match.resume_id}${versionQuery}&jdId=${job.id}`
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Improve in Editor
                              </button>
                            )}
                            {match.resume_version_id && (
                              <a
                                href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                                target="_blank"
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                                rel="noopener noreferrer"
                              >
                                Download Version
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
                    No saved matches yet. Select a resume above to start matching.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">ATS Analysis & Keywords</h3>
              
              {bestMatch && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Top Match Score: {bestMatch.score}%</h4>
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
                  <h4 className="text-md font-bold text-gray-900 mb-3">High Frequency Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {highFrequencyList.map(({ keyword, count }) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {keyword} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {priorityKeywordsList.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">Priority Keywords</h4>
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
                  <h4 className="text-md font-bold text-gray-900 mb-3">All Matched Versions ({job.resume_versions.length})</h4>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">✉️ Cover Letters</h2>
                    <p className="text-gray-600">
                      Generate cover letters using AI or manage your saved versions. Each version is saved separately and can be exported.
                  </p>
                </div>
                  <button
                    onClick={handleOpenCoverLetterGenerator}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg text-lg"
                  >
                    <span>🤖</span>
                    <span>Generate Cover Letter with AI</span>
                  </button>
                </div>
                  </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg" style={{ minHeight: '200px' }}>
                <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span>📋</span>
                      <span>Saved Cover Letters</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Click on any cover letter to select it for export</p>
                  </div>
                  <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-lg">
                    {coverLetters.length} {coverLetters.length === 1 ? 'Version' : 'Versions'}
                </div>
              </div>

                {/* Cover Letters List */}
              <div className="space-y-4">
                  {!coverLetters || !Array.isArray(coverLetters) || coverLetters.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-gray-600 font-semibold text-lg mb-1">No cover letters saved yet</p>
                      <p className="text-sm text-gray-500 mt-1">Click "Generate Cover Letter with AI" above to create your first cover letter</p>
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
                        className={`border-2 rounded-xl p-5 space-y-3 cursor-pointer transition-all bg-white ${
                          selectedCoverLetterId === letter.id 
                            ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                        }`}
                        style={{ 
                          display: 'block', 
                          visibility: 'visible', 
                          opacity: 1, 
                          minHeight: '150px',
                          marginBottom: '16px',
                          width: '100%',
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-semibold text-gray-900">{letter.title}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">v{letter.version_number}</span>
                              {selectedCoverLetterId === letter.id && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold">Selected</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Updated {letter.updated_at ? new Date(letter.updated_at).toLocaleString() : letter.created_at ? new Date(letter.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleExportCoverLetter(letter, 'pdf')}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 font-semibold"
                              title="Export as PDF"
                            >
                              📄 PDF
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
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => {
                                setEditingLetterId(letter.id)
                                setEditingLetterTitle(letter.title)
                                setEditingLetterContent(letter.content)
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              Edit
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
                              className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold shadow-sm"
                              title="Delete this cover letter"
                            >
                              🗑️ Delete
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
                              className="px-3 py-2 border rounded-lg min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <h2 className="text-xl font-bold text-gray-900">Upload Resume to Match</h2>
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

      {showCoverLetterGenerator && resumeDataForCoverLetter && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10010] flex items-center justify-center p-4"
          onClick={() => setShowCoverLetterGenerator(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">AI Cover Letter Generator</h2>
              <button
                onClick={() => setShowCoverLetterGenerator(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <CoverLetterGenerator
                resumeData={resumeDataForCoverLetter}
                onClose={() => setShowCoverLetterGenerator(false)}
                onCoverLetterChange={handleCoverLetterGenerated}
                initialJobDescription={job?.content || ''}
                initialCompanyName={job?.company || ''}
                initialPositionTitle={job?.title || ''}
                jobId={jobId}
                onSaveSuccess={(savedLetter) => {
                  console.log('Cover letter saved successfully:', savedLetter)
                  // Close modal
                  setShowCoverLetterGenerator(false)
                  
                  // Update state directly instead of refetching to avoid race condition
                  if (savedLetter && savedLetter.id) {
                    setCoverLetters((prev) => {
                      // Check if letter already exists (update) or add new
                      const exists = prev.find(cl => cl.id === savedLetter.id)
                      if (exists) {
                        return prev.map(cl => cl.id === savedLetter.id ? savedLetter : cl)
                      } else {
                        return [savedLetter, ...prev]
                      }
                    })
                    
                    // Auto-select the newly saved letter
                    handleSelectCoverLetter(savedLetter)
                  } else {
                    // If no savedLetter provided, refresh after a delay
                    setTimeout(() => {
                  fetchJobDetails()
                    }, 500)
                  }
                  
                  if (onUpdate) onUpdate()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


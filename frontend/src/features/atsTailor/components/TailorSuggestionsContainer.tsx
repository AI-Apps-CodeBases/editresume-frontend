'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import { resumeDataSchema, type ResumeData } from '../types/tailorResume'
import { fetchTailorResumeSuggestions, type TailorResumeSuggestionsResponse } from '../api/tailorResumeSuggestions'
import ProgressSteps from '@/components/Tailor/ProgressSteps'
import MatchRateGauge from '@/components/Tailor/MatchRateGauge'
import OptimizationCategories from '@/components/Tailor/OptimizationCategories'
import DetailedFeedback from '@/components/Tailor/DetailedFeedback'
import { useModal } from '@/contexts/ModalContext'

type ResumeTemplate =
  | 'clean'
  | 'two-column'
  | 'compact'
  | 'minimal'
  | 'modern'
  | 'tech'
  | 'modern-one'
  | 'classic-one'
  | 'minimal-one'
  | 'executive-one'
  | 'classic'
  | 'creative'
  | 'ats-friendly'
  | 'executive'

type LoadedState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'needs_jd'; resume: ResumeData; template: ResumeTemplate }
  | { status: 'ready'; resume: ResumeData; template: ResumeTemplate; jobDescription: string; jobDescriptionId?: number }

function coerceSections(input: unknown): Array<{ id: string; title: string; bullets: Array<{ id: string; text: string; params?: Record<string, unknown> }> }> {
  if (!Array.isArray(input)) return []
  return input.map((s, sIdx) => {
    const sectionObj = typeof s === 'object' && s !== null ? (s as Record<string, unknown>) : {}
    const id = typeof sectionObj.id === 'string' ? sectionObj.id : String(sectionObj.id ?? `section-${sIdx}`)
    const title = typeof sectionObj.title === 'string' ? sectionObj.title : 'Section'
    const bulletsRaw = sectionObj.bullets
    const bullets = Array.isArray(bulletsRaw)
      ? bulletsRaw.map((b, bIdx) => {
          const bulletObj = typeof b === 'object' && b !== null ? (b as Record<string, unknown>) : {}
          const bulletId = typeof bulletObj.id === 'string' ? bulletObj.id : String(bulletObj.id ?? `${id}-bullet-${bIdx}`)
          const text = typeof bulletObj.text === 'string' ? bulletObj.text : String(bulletObj.text ?? '')
          const params = typeof bulletObj.params === 'object' && bulletObj.params !== null
            ? (bulletObj.params as Record<string, unknown>)
            : undefined
          return { id: bulletId, text, params }
        })
      : []
    return { id, title, bullets }
  })
}

function normalizeUploadedResume(payload: unknown): { resume: ResumeData; template: ResumeTemplate } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid upload payload')
  }
  const obj = payload as { resume?: unknown; template?: unknown }
  const parsedResume = resumeDataSchema.parse(obj.resume)
  const template = (typeof obj.template === 'string' ? obj.template : 'tech') as ResumeTemplate
  return { resume: parsedResume, template }
}

type ResumeMeta = { id?: number; name?: string; title?: string; template?: string }

function mapVersionToResumeData(versionPayload: unknown, resumeMeta?: ResumeMeta | null): ResumeData {
  const versionPayloadObj = typeof versionPayload === 'object' && versionPayload !== null ? (versionPayload as Record<string, unknown>) : {}
  const personalInfo =
    typeof versionPayloadObj.personalInfo === 'object' && versionPayloadObj.personalInfo !== null ? (versionPayloadObj.personalInfo as Record<string, unknown>) : {}
  const normalizedSections = coerceSections(versionPayloadObj.sections)

  return resumeDataSchema.parse({
    name: (typeof personalInfo.name === 'string' ? personalInfo.name : '') || resumeMeta?.name || '',
    title:
      (resumeMeta?.title || '') || (typeof personalInfo.title === 'string' ? personalInfo.title : '') || '',
    email: typeof personalInfo.email === 'string' ? personalInfo.email : '',
    phone: typeof personalInfo.phone === 'string' ? personalInfo.phone : '',
    location: typeof personalInfo.location === 'string' ? personalInfo.location : '',
    summary: typeof versionPayloadObj.summary === 'string' ? versionPayloadObj.summary : '',
    sections: normalizedSections,
  })
}

export default function TailorSuggestionsContainer() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const { showAlert } = useModal()

  const resumeId = useMemo(() => {
    const v = params.get('resumeId')
    return v ? Number(v) : null
  }, [params])

  const jobId = useMemo(() => {
    const v = params.get('jdId')
    return v ? Number(v) : null
  }, [params])

  const uploadToken = params.get('uploadToken')
  const resumeUpload = params.get('resumeUpload') === '1'

  const [state, setState] = useState<LoadedState>({ status: 'loading' })
  const [suggestionsData, setSuggestionsData] = useState<TailorResumeSuggestionsResponse | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Array<{ id: number; title: string; company?: string }>>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [jobDescriptionDraft, setJobDescriptionDraft] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        let resume: ResumeData | null = null
        let template: ResumeTemplate = 'tech'

        if (resumeUpload && uploadToken && typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(`uploadedResume:${uploadToken}`)
          if (!raw) throw new Error('Uploaded resume payload not found')
          const parsed = JSON.parse(raw) as unknown
          const normalized = normalizeUploadedResume(parsed)
          resume = normalized.resume
          template = normalized.template
        } else if (resumeId && isAuthenticated && user?.email) {
          const headers = await getAuthHeadersAsync()
          const metaRes = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`, { headers })
          const metaJson: unknown = metaRes.ok ? await metaRes.json().catch(() => ({})) : {}
          const metaObj = typeof metaJson === 'object' && metaJson !== null ? (metaJson as Record<string, unknown>) : {}
          const resumesRaw = metaObj['resumes']
          const resumes: ResumeMeta[] = Array.isArray(resumesRaw) ? (resumesRaw as ResumeMeta[]) : []
          const resumeMeta = resumes.find((r) => r?.id === resumeId) ?? null

          const versionsRes = await fetch(`${config.apiBase}/api/resume/${resumeId}/versions?user_email=${encodeURIComponent(user.email)}`, {
            headers,
          })
          if (!versionsRes.ok) throw new Error(`Failed to load resume versions (HTTP ${versionsRes.status})`)
          const versionsJson = await versionsRes.json()
          const versionId = (versionsJson?.versions || [])[0]?.id
          if (!versionId) throw new Error('No resume version found')

          const versionRes = await fetch(`${config.apiBase}/api/resume/version/${versionId}?user_email=${encodeURIComponent(user.email)}`, {
            headers,
          })
          if (!versionRes.ok) throw new Error(`Failed to load resume version (HTTP ${versionRes.status})`)
          const versionJson = await versionRes.json()
          const payload: unknown = versionJson?.version?.resume_data || {}
          resume = mapVersionToResumeData(payload, resumeMeta)
          template = ((resumeMeta?.template || 'tech') as ResumeTemplate)
        } else {
          throw new Error('Please upload a resume or select a saved resume.')
        }

        let jobDescription = ''
        let resolvedJobId: number | undefined = undefined

        if (jobId) {
          resolvedJobId = jobId
          const jdUrl = `${config.apiBase}/api/job-descriptions/${jobId}${
            user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''
          }`
          const jobData = await fetch(jdUrl, {
            headers: { 'Content-Type': 'application/json' },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)

          const description = (jobData?.content as string | undefined) ?? ''
          jobDescription = description
        }

        if (cancelled) return

        if (!jobDescription.trim()) {
          setState({
            status: 'needs_jd',
            resume,
            template,
          })
          return
        }

        setState({
          status: 'ready',
          resume,
          template,
          jobDescription,
          jobDescriptionId: resolvedJobId,
        })
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : 'Failed to load suggestions workspace'
        setState({ status: 'error', error: message })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [resumeUpload, uploadToken, resumeId, isAuthenticated, user?.email, jobId])

  useEffect(() => {
    if (state.status === 'needs_jd' && isAuthenticated && user?.email) {
      setLoadingJobs(true)
      ;(async () => {
        try {
          let headers: HeadersInit = { 'Content-Type': 'application/json' }
          try {
            const authHeaders = await getAuthHeadersAsync()
            headers = { ...headers, ...authHeaders }
          } catch (authError) {
            console.warn('Auth headers not available, proceeding without auth:', authError)
          }

          const res = await fetch(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`, { 
            headers,
            signal: AbortSignal.timeout(15000)
          })
          
          if (res.ok) {
            const data = await res.json()
            const jobs = Array.isArray(data) ? data : (data.results || data.jobs || [])
            console.log('Loaded saved jobs:', jobs.length)
            setSavedJobs(
              jobs.map((j: { id: number; title?: string; company?: string }) => ({
                id: j.id,
                title: typeof j.title === 'string' ? j.title : 'Untitled',
                company: typeof j.company === 'string' ? j.company : undefined,
              }))
            )
          } else {
            console.error('Failed to load saved jobs, status:', res.status)
            const errorText = await res.text().catch(() => 'Unknown error')
            console.error('Error response:', errorText)
          }
        } catch (e) {
          console.error('Failed to load saved jobs:', e)
          // Show error to user but don't block the UI
          if (e instanceof Error && !e.message.includes('aborted')) {
            showAlert({
              title: 'Warning',
              message: 'Failed to load saved job descriptions. You can still paste a job description manually.',
              type: 'warning'
            }).catch(() => {})
          }
        } finally {
          setLoadingJobs(false)
        }
      })()
    } else if (state.status === 'needs_jd') {
      // If not authenticated, just set loading to false
      setLoadingJobs(false)
    }
  }, [state.status, isAuthenticated, user?.email, showAlert])

  useEffect(() => {
    if (state.status === 'ready') {
      setLoadingSuggestions(true)
      ;(async () => {
        try {
          const data = await fetchTailorResumeSuggestions({
            resume_data: state.resume,
            job_description: state.jobDescription,
          })
          setSuggestionsData(data)
        } catch (e) {
          console.error('Failed to load suggestions:', e)
          await showAlert({
            title: 'Error',
            message: e instanceof Error ? e.message : 'Failed to load suggestions',
            type: 'error',
          })
        } finally {
          setLoadingSuggestions(false)
        }
      })()
    }
  }, [state])

  const handleOptimize = useCallback(() => {
    if (state.status !== 'ready') return

    const params = new URLSearchParams()
    if (resumeUpload && uploadToken) {
      params.set('resumeUpload', '1')
      params.set('uploadToken', uploadToken)
    } else if (resumeId) {
      params.set('resumeId', String(resumeId))
    }
    if (state.jobDescriptionId) {
      params.set('jdId', String(state.jobDescriptionId))
    }

    router.push(`/tailor?${params.toString()}`)
  }, [state, resumeUpload, uploadToken, resumeId, router])

  if (state.status === 'loading' || loadingSuggestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 text-3xl animate-pulse">📊</div>
          <p className="text-sm font-semibold text-slate-600">Analyzing resume...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">Error</div>
          <div className="mt-2 text-sm text-slate-600">{state.error}</div>
          <button
            onClick={() => router.push('/tailor-select-resume')}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'needs_jd') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900 mb-1">Select a job description</div>
          <p className="text-sm text-slate-600 mb-6">Choose from your saved jobs or paste a new one to see optimization suggestions.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isAuthenticated && (
              <div>
                <h3 className="text-md font-semibold text-slate-800 mb-3">Saved Job Descriptions</h3>
                {loadingJobs ? (
                  <div className="text-sm text-slate-500">Loading saved jobs...</div>
                ) : savedJobs.length > 0 ? (
                  <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {savedJobs.map((job) => (
                      <li key={job.id}>
                        <button
                          onClick={() => {
                            const url = new URL(window.location.href)
                            url.searchParams.set('jdId', String(job.id))
                            router.push(url.toString())
                          }}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm"
                        >
                          <div className="font-semibold text-slate-800">{job.title}</div>
                          {job.company && <div className="text-xs text-slate-600">{job.company}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">No saved job descriptions.</div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-md font-semibold text-slate-800 mb-3">Paste New Job Description</h3>
              <textarea
                value={jobDescriptionDraft}
                onChange={(e) => setJobDescriptionDraft(e.target.value)}
                className="w-full h-40 rounded-lg border border-slate-200 p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste the job description here…"
              />
              <button
                onClick={() => {
                  if (jobDescriptionDraft.trim() && state.status === 'needs_jd') {
                    setState({
                      status: 'ready',
                      resume: state.resume,
                      template: state.template,
                      jobDescription: jobDescriptionDraft,
                      jobDescriptionId: undefined,
                    })
                  }
                }}
                disabled={!jobDescriptionDraft.trim()}
                className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Continue with pasted JD
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/tailor-select-resume')}
              className="text-sm text-slate-600 hover:text-slate-800 hover:underline"
            >
              ← Change resume
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state.status !== 'ready' || !suggestionsData) {
    return null
  }

  const feedbackItems = suggestionsData.improvements.slice(0, 10).map((imp) => ({
    title: imp.title,
    status: imp.priority === 'high' ? 'issue' as const : 'good' as const,
    description: imp.description,
    suggestion: imp.specific_suggestion,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-primary-50/20">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <ProgressSteps
            currentStep={2}
            steps={[
              { label: 'Upload Resume', number: 1 },
              { label: 'Add Job', number: 2 },
              { label: 'View Results', number: 3 },
            ]}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Resume Scan Results</h1>
          <p className="text-slate-600">Review suggestions to optimize your resume</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Match Rate */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <MatchRateGauge score={suggestionsData.current_score} label="ATS Score" size="lg" />
              {suggestionsData.current_score !== null && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-slate-600 mb-1">Current Score</div>
                  <div className={`text-lg font-bold ${
                    suggestionsData.current_score >= 80 ? 'text-green-600' :
                    suggestionsData.current_score >= 60 ? 'text-blue-600' :
                    suggestionsData.current_score >= 40 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {Math.round(suggestionsData.current_score)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Categories and Feedback */}
          <div className="lg:col-span-2 space-y-6">
            {/* Optimization Categories */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Optimization Areas</h2>
              <OptimizationCategories
                categories={suggestionsData.categories}
                expandedCategory={expandedCategory}
                onCategoryClick={(cat) => setExpandedCategory(expandedCategory === cat ? null : cat)}
              />
            </div>

            {/* Detailed Feedback */}
            {feedbackItems.length > 0 && (
              <DetailedFeedback items={feedbackItems} title="Key Improvements" />
            )}

            {/* Missing Keywords */}
            {suggestionsData.missing_keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestionsData.missing_keywords.slice(0, 15).map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleOptimize}
            className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Optimize Resume
          </button>
        </div>
      </div>
    </div>
  )
}


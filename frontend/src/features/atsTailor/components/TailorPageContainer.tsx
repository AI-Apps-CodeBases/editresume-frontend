'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import TailorWorkspace from './TailorWorkspace'
import { resumeDataSchema, type ResumeData } from '../types/tailorResume'

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
  const vp = typeof versionPayload === 'object' && versionPayload !== null ? (versionPayload as Record<string, unknown>) : {}
  const personalInfo =
    typeof vp.personalInfo === 'object' && vp.personalInfo !== null ? (vp.personalInfo as Record<string, unknown>) : {}
  const normalizedSections = coerceSections(vp.sections)

  return resumeDataSchema.parse({
    name: (typeof personalInfo.name === 'string' ? personalInfo.name : '') || resumeMeta?.name || '',
    title:
      (resumeMeta?.title || '') || (typeof personalInfo.title === 'string' ? personalInfo.title : '') || '',
    email: typeof personalInfo.email === 'string' ? personalInfo.email : '',
    phone: typeof personalInfo.phone === 'string' ? personalInfo.phone : '',
    location: typeof personalInfo.location === 'string' ? personalInfo.location : '',
    summary: typeof vp.summary === 'string' ? vp.summary : '',
    sections: normalizedSections,
  })
}

export default function TailorPageContainer() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, isAuthenticated } = useAuth()

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

  const [jobDescriptionDraft, setJobDescriptionDraft] = useState<string>('')
  const [state, setState] = useState<LoadedState>({ status: 'loading' })
  const [savedJobs, setSavedJobs] = useState<Array<{ id: number; title: string; company?: string }>>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

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

        let jobDescription = jobDescriptionDraft
        let resolvedJobId: number | undefined = undefined

        if (jobId) {
          resolvedJobId = jobId
          const jdUrl = `${config.apiBase}/api/job-descriptions/${jobId}${
            user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''
          }`
          const legacyJob = await fetch(jdUrl, {
            headers: { 'Content-Type': 'application/json' },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)

          const description = (legacyJob?.content as string | undefined) ?? ''
          jobDescription = description || jobDescriptionDraft
        }

        if (!jobDescription.trim()) {
          jobDescription = jobDescriptionDraft
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
        const message = e instanceof Error ? e.message : 'Failed to load tailor workspace'
        setState({ status: 'error', error: message })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [resumeUpload, uploadToken, resumeId, isAuthenticated, user?.email, jobId, jobDescriptionDraft])

  useEffect(() => {
    if (state.status === 'needs_jd' && isAuthenticated && user?.email) {
      setLoadingJobs(true)
      ;(async () => {
        try {
          const headers = await getAuthHeadersAsync()
          const res = await fetch(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`, { headers })
          if (res.ok) {
            const data = await res.json()
            const jobs = Array.isArray(data) ? data : data.results || []
            setSavedJobs(
              jobs.map((j: { id: number; title?: string; company?: string }) => ({
                id: j.id,
                title: typeof j.title === 'string' ? j.title : 'Untitled',
                company: typeof j.company === 'string' ? j.company : undefined,
              }))
            )
          }
        } catch (e) {
          console.error('Failed to load saved jobs:', e)
        } finally {
          setLoadingJobs(false)
        }
      })()
    }
  }, [state.status, isAuthenticated, user?.email])

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading tailor workspace…</div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">Tailor setup</div>
          <div className="mt-2 text-sm text-slate-600">{state.error}</div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700">Job description</label>
            <textarea
              value={jobDescriptionDraft}
              onChange={(e) => setJobDescriptionDraft(e.target.value)}
              className="mt-2 w-full h-40 rounded-lg border border-slate-200 p-3 text-sm"
              placeholder="Paste the job description here…"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setState({ status: 'loading' })}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Continue
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Upload a resume
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state.status === 'needs_jd') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900 mb-1">Select a job description</div>
          <div className="text-sm text-slate-600 mb-6">Choose a saved job or paste a job description to tailor your resume.</div>

          {isAuthenticated ? (
            <>
              {savedJobs.length > 0 && (
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Saved jobs</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {savedJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          const url = new URL(window.location.href)
                          url.searchParams.set('jdId', String(job.id))
                          router.push(url.toString())
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="font-medium text-slate-900">{job.title}</div>
                        {job.company && <div className="text-xs text-slate-500 mt-1">{job.company}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {loadingJobs && <div className="text-sm text-slate-500 mb-4">Loading saved jobs…</div>}
            </>
          ) : (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Please sign in to see saved jobs.
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">Or paste job description</label>
            <textarea
              value={jobDescriptionDraft}
              onChange={(e) => setJobDescriptionDraft(e.target.value)}
              className="w-full h-40 rounded-lg border border-slate-200 p-3 text-sm"
              placeholder="Paste the job description here…"
            />
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                if (jobDescriptionDraft.trim()) {
                  setState({ status: 'loading' })
                }
              }}
              disabled={!jobDescriptionDraft.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with pasted JD
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to upload
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TailorWorkspace
      baseResume={state.resume}
      baseTemplate={state.template}
      jobDescription={state.jobDescription}
      jobDescriptionId={state.jobDescriptionId}
      onOpenEditor={({ resume, template, jobDescription, jobDescriptionId }) => {
        if (typeof window !== 'undefined') {
          const token = `tailor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
          window.sessionStorage.setItem(`uploadedResume:${token}`, JSON.stringify({ resume, template }))
          window.localStorage.setItem('deepLinkedJD', jobDescription)
          if (jobDescriptionId) {
            window.localStorage.setItem('activeJobDescriptionId', String(jobDescriptionId))
          } else {
            window.localStorage.removeItem('activeJobDescriptionId')
          }
          const jdQuery = jobDescriptionId ? `&jdId=${jobDescriptionId}` : ''
          router.push(`/editor?resumeUpload=1&uploadToken=${token}${jdQuery}`)
        }
      }}
    />
  )
}



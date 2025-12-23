"use client"

import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import type {
  AutoGenerateRequest,
  AutoGenerateResponse,
  GeneratedResume,
  GeneratedVersion,
  ATSScore,
  ExtractedJobKeywords,
  ParsedResumeData,
} from '../types'

const baseUrl = config.apiBase

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (body?.detail) {
        message = Array.isArray(body.detail)
          ? body.detail.map((item: any) => item.msg || item).join(', ')
          : body.detail
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

export async function autoGenerateResume(
  payload: AutoGenerateRequest
): Promise<AutoGenerateResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, await getAuthHeadersAsync())

  const url = new URL('/api/resumes/auto-generate', baseUrl)
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      job_id: payload.jobId,
      source_resume_ids: payload.sourceResumeIds,
    }),
  })
  return handleResponse<AutoGenerateResponse>(response)
}

export type { AutoGenerateResponse, GeneratedResume, GeneratedVersion, ATSScore }

export async function extractJobKeywords(
  jobDescription: string
): Promise<ExtractedJobKeywords> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, await getAuthHeadersAsync())

  const response = await fetch(`${baseUrl}/api/ai/extract_job_keywords`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ job_description: jobDescription }),
  })
  return handleResponse<ExtractedJobKeywords>(response)
}

export interface ParseResumeResponse {
  data: ParsedResumeData
  success: boolean
  error?: string
}

export async function parseResumeText(text: string): Promise<ParsedResumeData> {
  const response = await fetch(`${baseUrl}/api/resume/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const parsed = await handleResponse<ParseResumeResponse>(response)
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to parse resume text')
  }
  return parsed.data
}

export async function parseResumeFile(file: File): Promise<ParsedResumeData> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${baseUrl}/api/resume/parse-file`, {
    method: 'POST',
    body: formData,
  })
  const parsed = await handleResponse<ParseResumeResponse>(response)
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to parse resume file')
  }
  return parsed.data
}

export async function saveParsedResume(
  data: ParsedResumeData,
  userEmail: string
): Promise<{ resume_id: number; version_id: number }> {
  if (!userEmail) {
    throw new Error('User email is required to save resumes')
  }

  const newId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const sections = (data.sections || []).map((section) => ({
    id: section.id ?? newId(),
    title: section.title,
    bullets: (section.bullets || []).map((bullet) => ({
      id: bullet.id ?? newId(),
      text: bullet.text,
      params: bullet.params ?? {},
    })),
  }))

  const payload = {
    name: data.name || data.title || 'Tailored Resume',
    title: data.title || data.name || 'Tailored Resume',
    email: data.email ?? '',
    phone: data.phone ?? '',
    location: data.location ?? '',
    summary: data.summary ?? '',
    sections,
    template: data.template ?? 'tech',
  }

  const response = await fetch(
    `${baseUrl}/api/resume/save?user_email=${encodeURIComponent(userEmail)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  const result = await handleResponse<{
    success: boolean
    resume_id: number
    version_id: number
    message?: string
  }>(response)

  if (!result.success) {
    throw new Error(result.message || 'Failed to save parsed resume')
  }

  return {
    resume_id: result.resume_id,
    version_id: result.version_id,
  }
}

interface ResumeListItem {
  id: number
  name: string
  title?: string | null
  summary?: string | null
  updated_at?: string | null
}

export async function fetchUserResumes(): Promise<ResumeListItem[]> {
  if (typeof window === 'undefined') {
    return []
  }
  const user = localStorage.getItem('user')
  if (!user) {
    throw new Error('You need to be signed in to access resumes.')
  }
  const parsed = JSON.parse(user)
  if (!parsed?.email) {
    throw new Error('Unable to determine user email.')
  }
  const url = new URL('/api/resumes', baseUrl)
  url.searchParams.set('user_email', parsed.email)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, await getAuthHeadersAsync())

  const response = await fetch(url.toString(), {
    headers,
    credentials: 'include',
  })

  const data = await handleResponse<{ resumes: ResumeListItem[] }>(response)
  const items = data.resumes ?? []
  return items.map((item) => ({
    id: Number(item.id),
    name: item.name,
    title: item.title ?? null,
    summary: item.summary ?? null,
    updated_at: item.updated_at ?? null,
  }))
}


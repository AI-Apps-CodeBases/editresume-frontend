"use client"

import config from '@/lib/config'
import type {
  AutoGenerateRequest,
  AutoGenerateResponse,
  GeneratedResume,
  GeneratedVersion,
  ATSScore,
} from '../types'

const baseUrl = config.apiBase

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
  Object.assign(headers, getAuthHeaders())

  const response = await fetch(`${baseUrl}/api/resumes/auto-generate`, {
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
  Object.assign(headers, getAuthHeaders())

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


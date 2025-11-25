"use client"

import config from '@/lib/config'
import type { CreateJobPayload, Job } from '../types'

const baseUrl = config.apiBase

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null
  const userRaw = localStorage.getItem('user')
  if (!userRaw) return null
  try {
    const parsed = JSON.parse(userRaw)
    return typeof parsed?.email === 'string' ? parsed.email : null
  } catch {
    return null
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export async function fetchSavedJobs(): Promise<Job[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  const response = await fetch(`${baseUrl}/api/jobs`, {
    headers,
    credentials: 'include',
  })
  if (response.status === 404) {
    return []
  }
  return handleResponse<Job[]>(response)
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  const response = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      skills: payload.skills ?? [],
    }),
    credentials: 'include',
  })
  return handleResponse<Job>(response)
}

export async function deleteJob(jobId: number): Promise<void> {
  const headers = getAuthHeaders()

  const response = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    credentials: 'include',
  })
  await handleResponse<void>(response)
}

export async function fetchLegacyJobDescriptions(): Promise<Job[]> {
  const email = getUserEmail()
  if (!email) {
    return []
  }

  const url = new URL('/api/job-descriptions', baseUrl)
  url.searchParams.set('user_email', email)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  const response = await fetch(url.toString(), {
    headers,
    credentials: 'include',
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Legacy job descriptions request failed with ${response.status}`)
  }

  const raw = await response.json()
  const items: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.results)
    ? raw.results
    : []

  const normaliseSkills = (item: any): string[] => {
    const buckets = [
      item?.skills,
      item?.extracted_keywords,
      item?.priority_keywords,
      item?.high_frequency_keywords,
      item?.soft_skills,
    ]
    const collected = buckets
      .flat()
      .filter(Boolean)
      .map((value: unknown) => (typeof value === 'string' ? value : null))
      .filter((value: string | null): value is string => Boolean(value))
    return Array.from(new Set(collected.map((skill) => skill.trim()))).slice(0, 12)
  }

  return items.map((item) => ({
    id: Number(item?.id) || Math.floor(Math.random() * 10_000_000),
    user_id: Number(item?.user_id) || 0,
    title: item?.title || 'Untitled Role',
    company: item?.company ?? null,
    description: item?.content || '',
    url: item?.url ?? null,
    skills: normaliseSkills(item),
    created_at: item?.created_at || new Date().toISOString(),
  }))
}


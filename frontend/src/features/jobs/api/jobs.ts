"use client"

import config from '@/lib/config'
import { getAuthHeaders } from '@/lib/auth'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'
import type { CreateJobPayload, Job } from '../types'

const baseUrl = config.apiBase

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

async function fetchWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const isTimeout = lastError.message.includes('timeout') || lastError.message.includes('timed out')
      const isLastAttempt = attempt === maxRetries - 1
      
      if (!isTimeout || isLastAttempt) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

export async function fetchSavedJobs(): Promise<Job[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  return fetchWithRetry(async (attempt) => {
    const timeout = attempt === 0 ? 30000 : 15000
    
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/jobs`, {
        headers,
        credentials: 'include',
        timeout,
      })
      if (response.status === 404) {
        return []
      }
      return handleResponse<Job[]>(response)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Cannot connect to API server at ${baseUrl}. Please ensure the backend is running.`)
        throw new Error(`Cannot connect to API server. Please ensure the backend is running at ${baseUrl}`)
      }
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Request timed out. The server may be experiencing issues.')
      }
      throw error
    }
  })
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  const response = await fetchWithTimeout(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      skills: payload.skills ?? [],
    }),
    credentials: 'include',
    timeout: 15000,
  })
  return handleResponse<Job>(response)
}

export async function fetchJob(jobId: number): Promise<Job> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  Object.assign(headers, getAuthHeaders())

  const response = await fetchWithTimeout(`${baseUrl}/api/jobs/${jobId}`, {
    headers,
    credentials: 'include',
    timeout: 15000,
  })
  return handleResponse<Job>(response)
}

export async function deleteJob(jobId: number): Promise<void> {
  const headers = getAuthHeaders()

  const response = await fetchWithTimeout(`${baseUrl}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    credentials: 'include',
    timeout: 15000,
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

  return fetchWithRetry(async (attempt) => {
    const timeout = attempt === 0 ? 30000 : 15000
    
    const response = await fetchWithTimeout(url.toString(), {
      headers,
      credentials: 'include',
      timeout,
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
  })
}


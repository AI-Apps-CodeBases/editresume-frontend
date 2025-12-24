import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import {
  type ResumeData,
  type TailorOptions,
  tailorResumeResponseSchema,
  type TailorResumeResponse,
} from '../types/tailorResume'

export type TailorResumeRequest = {
  resume_data: ResumeData
  job_description: string
  options?: TailorOptions
}

export async function tailorResume(request: TailorResumeRequest): Promise<TailorResumeResponse> {
  const headers = await getAuthHeadersAsync()
  headers['Content-Type'] = 'application/json'

  const res = await fetch(`${config.apiBase}/api/ai/tailor_resume`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  const json: unknown = await res.json()
  return tailorResumeResponseSchema.parse(json)
}



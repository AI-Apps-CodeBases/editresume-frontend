import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'

export interface TailorResumeSuggestionsRequest {
  resume_data: {
    name: string
    title: string
    email?: string
    phone?: string
    location?: string
    summary: string
    sections: Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params?: Record<string, any>
      }>
    }>
  }
  job_description: string
}

export interface OptimizationCategory {
  count: number
  items: Array<{
    title: string
    description: string
    priority: string
    impact_score: number
    specific_suggestion: string
    example?: string
  }>
}

export interface TailorResumeSuggestionsResponse {
  success: boolean
  current_score: number | null
  missing_keywords: string[]
  categories: Record<string, OptimizationCategory>
  total_issues: number
  improvements: Array<{
    category: string
    title: string
    description: string
    priority: string
    impact_score: number
    specific_suggestion: string
    example?: string
  }>
  error?: string
}

export async function fetchTailorResumeSuggestions(
  requestData: TailorResumeSuggestionsRequest
): Promise<TailorResumeSuggestionsResponse> {
  // This endpoint doesn't require auth, so don't block on it
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  // Try to get auth headers but don't wait if it fails
  try {
    const authHeaders = await Promise.race([
      getAuthHeadersAsync(),
      new Promise<Record<string, string>>((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 2000)
      )
    ])
    Object.assign(headers, authHeaders)
  } catch (e) {
    // Continue without auth if it times out or fails
    console.warn('Auth headers not available for suggestions, proceeding without:', e)
  }

  const response = await fetch(`${config.apiBase}/api/ai/tailor_resume_suggestions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestData),
    signal: AbortSignal.timeout(60000), // 60-second timeout for suggestions
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data
}


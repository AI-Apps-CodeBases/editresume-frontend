import config from '@/lib/config'

export interface LinkedInAuthResponse {
  auth_url: string
  state: string
}

export interface LinkedInStatus {
  connected: boolean
  profile_url?: string
}

export interface LinkedInProfile {
  connected: boolean
  profile_url?: string
  profile_data?: {
    profile?: {
      sub?: string
      email?: string
      name?: string
    }
    person?: {
      id?: string
      firstName?: {
        localized?: Record<string, string>
      }
      lastName?: {
        localized?: Record<string, string>
      }
    }
    positions?: any
    education?: any
  }
}

class LinkedInService {
  private baseUrl: string

  constructor() {
    this.baseUrl = config.apiBase
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('authToken')
    return token
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getAuthUrl(): Promise<LinkedInAuthResponse> {
    const token = await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(
      `${this.baseUrl}/api/linkedin/auth/url?authorization=Bearer ${token}`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getStatus(): Promise<LinkedInStatus> {
    return this.makeRequest<LinkedInStatus>('/api/linkedin/status')
  }

  async getProfile(): Promise<LinkedInProfile> {
    return this.makeRequest<LinkedInProfile>('/api/linkedin/profile')
  }

  async shareToLinkedIn(text: string, shareUrl?: string): Promise<{ success: boolean; post_id?: string }> {
    const url = new URL('/api/linkedin/share', this.baseUrl)
    url.searchParams.set('text', text)
    if (shareUrl) {
      url.searchParams.set('share_url', shareUrl)
    }

    return this.makeRequest(url.toString().replace(this.baseUrl, ''), {
      method: 'POST',
    })
  }
}

export const linkedinService = new LinkedInService()


import { useState, useCallback } from 'react'
import { linkedinService, LinkedInStatus, LinkedInProfile } from '@/lib/services/linkedin'

export function useLinkedIn() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<LinkedInStatus | null>(null)

  const connectLinkedIn = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { auth_url } = await linkedinService.getAuthUrl()
      window.location.href = auth_url
    } catch (err: any) {
      setError(err.message || 'Failed to initiate LinkedIn connection')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const checkStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statusData = await linkedinService.getStatus()
      setStatus(statusData)
      return statusData
    } catch (err: any) {
      setError(err.message || 'Failed to check LinkedIn status')
      return { connected: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const getProfile = useCallback(async (): Promise<LinkedInProfile | null> => {
    setLoading(true)
    setError(null)
    try {
      const profile = await linkedinService.getProfile()
      return profile
    } catch (err: any) {
      setError(err.message || 'Failed to fetch LinkedIn profile')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const shareToLinkedIn = useCallback(
    async (text: string, shareUrl?: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await linkedinService.shareToLinkedIn(text, shareUrl)
        return result
      } catch (err: any) {
        setError(err.message || 'Failed to share to LinkedIn')
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    status,
    connectLinkedIn,
    checkStatus,
    getProfile,
    shareToLinkedIn,
  }
}


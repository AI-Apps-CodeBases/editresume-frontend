'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { auth } from '@/lib/firebaseClient'
import { isPremiumModeEnabled } from '@/lib/usageLimits'

interface TrialStatus {
  has_trial: boolean
  is_active: boolean
  expires_at: string | null
  started_at: string | null
}

export function useTrial() {
  const { user, isAuthenticated } = useAuth()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrialStatus = useCallback(async () => {
    if (!isAuthenticated || !isPremiumModeEnabled()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const currentUser = auth.currentUser
      if (!currentUser) {
        setLoading(false)
        return
      }

      const token = await currentUser.getIdToken()
      const response = await fetch(`${config.apiBase}/api/usage/trial/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data: TrialStatus = await response.json()
        setTrialStatus(data)
      } else {
        setError('Failed to fetch trial status')
      }
    } catch (err) {
      console.error('Error fetching trial status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchTrialStatus()
  }, [fetchTrialStatus])

  const startTrial = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Please sign in to start a trial' }
    }

    if (!isPremiumModeEnabled()) {
      return { success: false, message: 'Trial is not available' }
    }

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return { success: false, message: 'Please sign in to start a trial' }
      }

      const token = await currentUser.getIdToken()
      const response = await fetch(`${config.apiBase}/api/usage/trial/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchTrialStatus()
        return { success: true, message: data.message || 'Trial started successfully!' }
      } else {
        return { success: false, message: data.message || 'Failed to start trial' }
      }
    } catch (err) {
      console.error('Error starting trial:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to start trial' }
    }
  }, [isAuthenticated, fetchTrialStatus])

  const checkTrialEligibility = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !isPremiumModeEnabled()) {
      return false
    }

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return false
      }

      const token = await currentUser.getIdToken()
      const response = await fetch(`${config.apiBase}/api/usage/limits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.trial_eligible === true
      }
    } catch (err) {
      console.error('Error checking trial eligibility:', err)
    }

    return false
  }, [isAuthenticated])

  const isTrialActive = trialStatus?.is_active || false
  const daysRemaining = trialStatus?.expires_at 
    ? Math.ceil((new Date(trialStatus.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    trialStatus,
    loading,
    error,
    startTrial,
    checkTrialEligibility,
    isTrialActive,
    daysRemaining: isTrialActive ? daysRemaining : 0,
    refreshTrialStatus: fetchTrialStatus,
  }
}


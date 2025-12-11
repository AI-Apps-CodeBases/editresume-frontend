'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { auth } from '@/lib/firebaseClient'
import { isPremiumModeEnabled, type FeatureType, type PlanTier } from '@/lib/usageLimits'

interface UsageStats {
  plan_tier: PlanTier
  is_premium_mode: boolean
  features: Record<string, {
    current_usage: number
    limit: number | null
    period: string
    unlimited: boolean
  }>
  exports?: {
    current_usage: number
    limit: number | null
    period: string
    unlimited: boolean
  }
  trial_active?: boolean
}

interface UsageLimits {
  plan_tier: PlanTier
  is_premium_mode: boolean
  limits: Record<string, any>
  trial_eligible: boolean
  trial_active: boolean
}

export function useUsageTracking() {
  const { user, isAuthenticated } = useAuth()
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageStats = useCallback(async () => {
    if (!isPremiumModeEnabled()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const currentUser = auth.currentUser
      let headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (currentUser) {
        const token = await currentUser.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }

      const sessionId = typeof window !== 'undefined' 
        ? localStorage.getItem('guestSessionId') || undefined
        : undefined

      const url = new URL(`${config.apiBase}/api/usage/stats`)
      if (sessionId) {
        url.searchParams.set('session_id', sessionId)
      }

      const response = await fetch(url.toString(), { headers })
      
      if (response.ok) {
        const data: UsageStats = await response.json()
        setUsageStats(data)
      } else {
        setError('Failed to fetch usage stats')
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchUsageLimits = useCallback(async () => {
    if (!isPremiumModeEnabled()) {
      setLoading(false)
      return
    }

    try {
      const currentUser = auth.currentUser
      let headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (currentUser) {
        const token = await currentUser.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }

      const sessionId = typeof window !== 'undefined' 
        ? localStorage.getItem('guestSessionId') || undefined
        : undefined

      const url = new URL(`${config.apiBase}/api/usage/limits`)
      if (sessionId) {
        url.searchParams.set('session_id', sessionId)
      }

      const response = await fetch(url.toString(), { headers })
      
      if (response.ok) {
        const data: UsageLimits = await response.json()
        setUsageLimits(data)
      }
    } catch (err) {
      console.error('Error fetching usage limits:', err)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchUsageStats()
    fetchUsageLimits()
  }, [fetchUsageStats, fetchUsageLimits])

  const checkFeatureAvailability = useCallback((featureType: FeatureType): {
    allowed: boolean
    currentUsage: number
    limit: number | null
    period: string
    message?: string
  } => {
    if (!isPremiumModeEnabled()) {
      return { allowed: true, currentUsage: 0, limit: null, period: 'unlimited' }
    }

    if (!usageStats) {
      return { allowed: false, currentUsage: 0, limit: 0, period: 'unknown', message: 'Loading usage data...' }
    }

    const featureKey = featureType === 'exports' ? 'exports' : featureType
    const feature = usageStats.features[featureKey] || usageStats.exports

    if (!feature) {
      return { allowed: true, currentUsage: 0, limit: null, period: 'unlimited' }
    }

    if (feature.unlimited || feature.limit === null) {
      return { allowed: true, currentUsage: feature.current_usage, limit: null, period: 'unlimited' }
    }

    const allowed = feature.current_usage < feature.limit
    const remaining = feature.limit - feature.current_usage

    return {
      allowed,
      currentUsage: feature.current_usage,
      limit: feature.limit,
      period: feature.period,
      message: allowed 
        ? `${remaining} ${feature.period === 'monthly' ? 'this month' : feature.period === 'daily' ? 'today' : 'this session'}`
        : `Limit reached. Upgrade for unlimited ${featureType}.`
    }
  }, [usageStats])

  const refreshUsage = useCallback(() => {
    fetchUsageStats()
    fetchUsageLimits()
  }, [fetchUsageStats, fetchUsageLimits])

  return {
    usageStats,
    usageLimits,
    loading,
    error,
    checkFeatureAvailability,
    refreshUsage,
    planTier: usageStats?.plan_tier || (user?.planTier || 'free'),
    isPremiumMode: isPremiumModeEnabled(),
    trialActive: usageStats?.trial_active || false,
  }
}


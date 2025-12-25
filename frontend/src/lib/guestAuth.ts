'use client'

import { isPremiumModeEnabled } from './usageLimits'

export type GuestAction = 'exportResume' | 'saveResume' | 'saveJobDescription' | 'aiImprovement' | 'aiATS' | 'aiCoverLetter'

const ACTION_LIMITS: Record<GuestAction, number> = {
  exportResume: 1,
  saveResume: 1,
  saveJobDescription: 1,
  aiImprovement: 3,
  aiATS: 0,
  aiCoverLetter: 0,
}

const STORAGE_PREFIX = 'guestAction:'
const SESSION_ID_KEY = 'guestSessionId'

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const getOrCreateGuestSessionId = (): string => {
  if (!isBrowser()) return ''
  
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

export const shouldPromptAuthentication = (action: GuestAction, isAuthenticated: boolean): boolean => {
  if (isAuthenticated || !isBrowser()) return false
  
  // If premium mode is disabled, don't enforce limits
  if (!isPremiumModeEnabled()) return false

  const storageKey = STORAGE_PREFIX + action
  const rawValue = window.localStorage.getItem(storageKey)
  const currentCount = rawValue ? Number.parseInt(rawValue, 10) || 0 : 0
  const limit = ACTION_LIMITS[action] ?? 1

  if (currentCount >= limit) {
    return true
  }

  window.localStorage.setItem(storageKey, String(currentCount + 1))
  return false
}

export const trackGuestAIUsage = (featureType: 'improvement' | 'ats' | 'cover_letter'): void => {
  if (!isBrowser() || !isPremiumModeEnabled()) return
  
  const actionMap: Record<string, GuestAction> = {
    improvement: 'aiImprovement',
    ats: 'aiATS',
    cover_letter: 'aiCoverLetter',
  }
  
  const action = actionMap[featureType]
  if (action) {
    const storageKey = STORAGE_PREFIX + action
    const rawValue = window.localStorage.getItem(storageKey)
    const currentCount = rawValue ? Number.parseInt(rawValue, 10) || 0 : 0
    window.localStorage.setItem(storageKey, String(currentCount + 1))
  }
}

export const getGuestUsageCount = (action: GuestAction): number => {
  if (!isBrowser()) return 0
  const storageKey = STORAGE_PREFIX + action
  const rawValue = window.localStorage.getItem(storageKey)
  return rawValue ? Number.parseInt(rawValue, 10) || 0 : 0
}

export const resetGuestActionCounters = () => {
  if (!isBrowser()) return
  Object.keys(ACTION_LIMITS).forEach((action) => {
    window.localStorage.removeItem(STORAGE_PREFIX + action)
  })
  localStorage.removeItem(SESSION_ID_KEY)
}


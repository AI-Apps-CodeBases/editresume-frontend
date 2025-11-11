'use client'

export type GuestAction = 'exportResume' | 'saveResume' | 'saveJobDescription'

const ACTION_LIMITS: Record<GuestAction, number> = {
  exportResume: 1,
  saveResume: 1,
  saveJobDescription: 1
}

const STORAGE_PREFIX = 'guestAction:'

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const shouldPromptAuthentication = (action: GuestAction, isAuthenticated: boolean): boolean => {
  if (isAuthenticated || !isBrowser()) return false

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

export const resetGuestActionCounters = () => {
  if (!isBrowser()) return
  Object.keys(ACTION_LIMITS).forEach((action) => {
    window.localStorage.removeItem(STORAGE_PREFIX + action)
  })
}


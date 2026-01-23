'use client'
import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback, useRef } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebaseClient'
import { resetGuestActionCounters } from '@/lib/guestAuth'
import { DEFAULT_PLAN, FeatureFlag, isFeatureEnabledForPlan, PlanTier } from '@/lib/planFeatures'

export interface User {
  uid: string
  email: string
  name: string
  isPremium: boolean
  createdAt?: string
  planTier: PlanTier
  trialActive?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  planTier: PlanTier
  signIn: (email: string, password: string) => Promise<void>
  signUp: (options: { email: string; password: string; name?: string }) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  checkPremiumAccess: () => boolean
  canUseFeature: (feature: FeatureFlag) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getDisplayName = (email?: string | null, displayName?: string | null) => {
  if (displayName && displayName.trim().length > 0) return displayName
  if (email) return email.split('@')[0]
  return 'User'
}

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
  const firstSessionSentRef = useRef(false)

  const resolvePlanTier = useCallback((hasPremiumClaim: boolean): PlanTier => {
    if (!premiumMode) {
      return DEFAULT_PLAN
    }
    return hasPremiumClaim ? 'premium' : 'free'
  }, [premiumMode])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult()
          const isPremiumClaim = Boolean(tokenResult?.claims?.premium)
          const planTier = resolvePlanTier(isPremiumClaim)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
            isPremium: isPremiumClaim,
            createdAt: firebaseUser.metadata?.creationTime ?? undefined,
            planTier
          })
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
              isPremium: isPremiumClaim,
              createdAt: firebaseUser.metadata?.creationTime ?? undefined,
              planTier
            }))
            const token = await firebaseUser.getIdToken()
            localStorage.setItem('authToken', token)
          }
        } catch (error) {
          console.error('Failed to hydrate user session from Firebase:', error)
          const fallbackPlan = resolvePlanTier(false)
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
            isPremium: false,
            createdAt: firebaseUser.metadata?.creationTime ?? undefined,
            planTier: fallbackPlan
          }
          setUser(fallbackUser)
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(fallbackUser))
          }
        }
      } else {
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user')
          localStorage.removeItem('authToken')
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      resetGuestActionCounters()
      
      // Check trial status if premium mode is enabled
      if (premiumMode && !user.isPremium) {
        const checkTrialStatus = async () => {
          try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return
            
            const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/$/, '')
            const response = await fetch(`${apiBase}/api/usage/trial/status`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.is_active) {
                setUser(prev => prev ? { ...prev, trialActive: true, planTier: 'trial' } : null)
              }
            }
          } catch (error) {
            console.error('Failed to check trial status:', error)
          }
        }
        
        checkTrialStatus()
      }
    }
  }, [user?.uid, premiumMode])

  useEffect(() => {
    if (!user || typeof window === 'undefined') return
    if (firstSessionSentRef.current) return

    const sendFirstSessionEvent = async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/$/, '')
        const payload = {
          referrer: document.referrer || undefined,
          landing_path: window.location.pathname || undefined,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined
        }

        const response = await fetch(`${apiBase}/api/events/first-session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          firstSessionSentRef.current = true
        }
      } catch (error) {
        console.error('Failed to send first session event:', error)
      }
    }

    sendFirstSessionEvent()
  }, [user?.uid])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const MESSAGE_SOURCE = 'editresume-extension'
    const TOKEN_REQUEST = 'EDITRESUME_EXTENSION_TOKEN_REQUEST'
    const TOKEN_RESPONSE = 'EDITRESUME_EXTENSION_TOKEN_RESPONSE'

    const handleExtensionTokenRequest = async (event: MessageEvent) => {
      if (!event?.data || typeof event.data !== 'object') return
      if (event.origin !== window.location.origin) return
      const { type, source } = event.data as { type?: string; source?: string }
      if (type !== TOKEN_REQUEST || source !== MESSAGE_SOURCE) return

      const reply = (payload: Record<string, unknown>) => {
        try {
          const target = event.source
          if (!target || typeof (target as Window).postMessage !== 'function') return
          ;(target as Window).postMessage(
            {
              type: TOKEN_RESPONSE,
              source: MESSAGE_SOURCE,
              ...payload
            },
            event.origin
          )
        } catch (err) {
          console.error('Failed to postMessage back to extension:', err)
        }
      }

      const waitForAuth = async (maxWait = 5000): Promise<boolean> => {
        if (auth.currentUser) return true
        return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe()
            resolve(!!user)
          })
          setTimeout(() => {
            unsubscribe()
            resolve(false)
          }, maxWait)
        })
      }

      const isAuthenticated = await waitForAuth()
      if (!isAuthenticated || !auth.currentUser) {
        reply({ ok: false, error: 'not_authenticated' })
        return
      }

      try {
        const token = await auth.currentUser.getIdToken(true)
        reply({ ok: true, token })
      } catch (error) {
        console.error('Failed to fetch Firebase ID token for extension:', error)
        reply({ ok: false, error: 'token_error' })
      }
    }

    window.addEventListener('message', handleExtensionTokenRequest)
    return () => window.removeEventListener('message', handleExtensionTokenRequest)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signUp = useCallback(async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (name) {
      await updateProfile(credential.user, { displayName: name }).catch(() => undefined)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload()
    }
  }, [])

  const checkPremiumAccess = useCallback(() => {
    if (!premiumMode) return true
    // Trial users have premium access
    if (user?.trialActive) return true
    return user?.planTier === 'premium'
  }, [user?.planTier, user?.trialActive, premiumMode])

  const canUseFeature = useCallback((feature: FeatureFlag) => {
    if (!premiumMode) return true
    // Check if user has active trial
    if (user?.trialActive) {
      return isFeatureEnabledForPlan('trial', feature)
    }
    const tier = user?.planTier ?? 'free'
    return isFeatureEnabledForPlan(tier, feature)
  }, [user?.planTier, user?.trialActive, premiumMode])

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    planTier: user?.planTier ?? DEFAULT_PLAN,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
    checkPremiumAccess,
    canUseFeature,
    refreshUser
  }), [user, loading, signIn, signUp, signInWithGoogle, resetPassword, logout, checkPremiumAccess, canUseFeature, refreshUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

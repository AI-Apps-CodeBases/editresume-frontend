'use client'
import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react'
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
    }
  }, [user?.uid])

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
    return user?.planTier === 'premium'
  }, [user?.planTier, premiumMode])

  const canUseFeature = useCallback((feature: FeatureFlag) => {
    if (!premiumMode) return true
    const tier = user?.planTier ?? 'free'
    return isFeatureEnabledForPlan(tier, feature)
  }, [user?.planTier, premiumMode])

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

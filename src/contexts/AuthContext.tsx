'use client'
import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebaseClient'

export interface User {
  uid: string
  email: string
  name: string
  isPremium: boolean
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (options: { email: string; password: string; name?: string }) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  checkPremiumAccess: () => boolean
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult()
          const isPremiumClaim = Boolean(tokenResult?.claims?.premium)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
            isPremium: isPremiumClaim,
            createdAt: firebaseUser.metadata?.creationTime ?? undefined
          })
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
              isPremium: isPremiumClaim,
              createdAt: firebaseUser.metadata?.creationTime ?? undefined
            }))
            const token = await firebaseUser.getIdToken()
            localStorage.setItem('authToken', token)
          }
        } catch (error) {
          console.error('Failed to hydrate user session from Firebase:', error)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: getDisplayName(firebaseUser.email, firebaseUser.displayName),
            isPremium: false,
            createdAt: firebaseUser.metadata?.creationTime ?? undefined
          })
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
    const premiumEnabled = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
    if (!premiumEnabled) return true
    return user?.isPremium ?? false
  }, [user?.isPremium])

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
    checkPremiumAccess,
    refreshUser
  }), [user, loading, signIn, signUp, signInWithGoogle, resetPassword, logout, checkPremiumAccess, refreshUser])

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

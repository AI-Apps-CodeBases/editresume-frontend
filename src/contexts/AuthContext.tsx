'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  email: string
  name: string
  isPremium: boolean
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  checkPremiumAccess: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
  }

  const checkPremiumAccess = () => {
    const premiumEnabled = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
    if (!premiumEnabled) return true
    return user?.isPremium || false
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      checkPremiumAccess
    }}>
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


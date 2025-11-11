'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  fallbackPath?: string
}

export default function ProtectedRoute({ children, fallbackPath = '/auth/login' }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const next = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/'
      const redirectUrl = next && next !== '/' ? `${fallbackPath}?next=${encodeURIComponent(next)}` : fallbackPath
      router.replace(redirectUrl)
    }
  }, [loading, isAuthenticated, router, fallbackPath])

  if (loading || (!isAuthenticated && typeof window !== 'undefined')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary via-blue-600 to-purple-600 text-white">
        <div className="text-center">
          <div className="mb-6 text-4xl">🔒</div>
          <p className="text-lg font-semibold">Checking your session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}



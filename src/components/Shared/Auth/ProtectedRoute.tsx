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
      <div className="flex min-h-screen flex-col items-center justify-center bg-body-gradient text-text-primary">
        <div className="rounded-[28px] border border-border-subtle bg-surface-500/85 px-12 py-10 text-center shadow-card">
          <div className="mb-4 text-4xl">🔒</div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-text-secondary">Hang tight</p>
          <p className="mt-3 text-base text-text-secondary">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}



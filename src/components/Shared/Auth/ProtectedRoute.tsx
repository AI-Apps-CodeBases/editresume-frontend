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
      const extensionAuth = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('extensionAuth')
        : null
      const params = new URLSearchParams()
      if (next && next !== '/') {
        params.set('next', next)
      }
      if (extensionAuth === '1') {
        params.set('extensionAuth', '1')
      }
      const redirectUrl = params.toString() 
        ? `${fallbackPath}?${params.toString()}`
        : fallbackPath
      router.replace(redirectUrl)
    }
  }, [loading, isAuthenticated, router, fallbackPath])

  if (loading || (!isAuthenticated && typeof window !== 'undefined')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-body-gradient text-text-primary">
        <div className="rounded-[28px] border border-border-subtle bg-white px-12 py-10 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-4 text-4xl">🔒</div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-text-muted">Hang tight</p>
          <p className="mt-3 text-base text-text-muted">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}



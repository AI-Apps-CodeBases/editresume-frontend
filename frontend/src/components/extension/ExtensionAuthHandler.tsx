'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const EXTENSION_AUTH_KEY = 'extensionAuth'

export default function ExtensionAuthHandler() {
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const urlExtensionAuth = searchParams.get('extensionAuth')
  
  const extensionAuth = urlExtensionAuth || 
    (typeof window !== 'undefined' ? sessionStorage.getItem(EXTENSION_AUTH_KEY) : null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (urlExtensionAuth === '1') {
      sessionStorage.setItem(EXTENSION_AUTH_KEY, '1')
    }

    if (extensionAuth !== '1' || !isAuthenticated || !user) return

    const notifyExtension = () => {
      window.postMessage(
        {
          type: 'EDITRESUME_EXTENSION_AUTH_READY',
          source: 'editresume-app'
        },
        window.location.origin
      )
      sessionStorage.removeItem(EXTENSION_AUTH_KEY)
    }

    const timeoutId = setTimeout(notifyExtension, 1000)
    return () => clearTimeout(timeoutId)
  }, [extensionAuth, isAuthenticated, user, urlExtensionAuth])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      sessionStorage.removeItem(EXTENSION_AUTH_KEY)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return null
}


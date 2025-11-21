'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function ExtensionAuthHandler() {
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const extensionAuth = searchParams.get('extensionAuth')

  useEffect(() => {
    if (extensionAuth !== '1' || !isAuthenticated || !user) return

    const notifyExtension = () => {
      window.postMessage(
        {
          type: 'EDITRESUME_EXTENSION_AUTH_READY',
          source: 'editresume-app'
        },
        window.location.origin
      )
    }

    const timeoutId = setTimeout(notifyExtension, 1000)
    return () => clearTimeout(timeoutId)
  }, [extensionAuth, isAuthenticated, user])

  return null
}


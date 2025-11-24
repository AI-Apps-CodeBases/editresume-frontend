'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type ResumeAction = 'upload' | 'new'
type AuthMode = 'login' | 'signup'

export function useResumeAccess() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [pendingAction, setPendingAction] = useState<ResumeAction | null>(null)
  const [navigateAction, setNavigateAction] = useState<ResumeAction | null>(null)

  const launchEditor = useCallback(
    (action: ResumeAction) => {
      const target = action === 'upload' ? '/editor?upload=true' : '/editor?new=true'
      router.push(target)
    },
    [router]
  )

  const promptLogin = useCallback(() => {
    setPendingAction(null)
    setAuthMode('login')
    setModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setPendingAction((action) => {
      if (action && isAuthenticated) {
        setNavigateAction(action)
      }
      return null
    })
  }, [isAuthenticated])

  useEffect(() => {
    if (!navigateAction) return
    const target = navigateAction === 'upload' ? '/editor?upload=true' : '/editor?new=true'
    router.push(target)
    setNavigateAction(null)
  }, [navigateAction, router])

  const authModalProps = useMemo(
    () => ({
      isOpen: modalOpen,
      onClose: handleClose,
      mode: authMode as AuthMode
    }),
    [modalOpen, handleClose, authMode]
  )

  const authModalKey = `${authMode}-${pendingAction ?? 'none'}`

  return {
    launchEditor,
    promptLogin,
    authModalProps,
    authModalKey
  }
}


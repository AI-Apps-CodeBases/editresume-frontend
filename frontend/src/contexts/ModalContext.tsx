'use client'
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react'
import AlertModal from '@/components/Shared/AlertModal'
import ConfirmModal from '@/components/Shared/ConfirmModal'
import { setModalContext } from '@/lib/modals'

interface AlertOptions {
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  icon?: string
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  icon?: string
}

interface ModalContextType {
  showAlert: (options: AlertOptions) => Promise<void>
  showConfirm: (options: ConfirmOptions) => Promise<boolean>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions & { isOpen: boolean }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  const [confirmState, setConfirmState] = useState<ConfirmOptions & { isOpen: boolean; resolve?: (value: boolean) => void }>({
    isOpen: false,
    message: '',
    type: 'warning'
  })

  const alertResolveRef = useRef<(() => void) | null>(null)

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({ ...options, isOpen: true })
      alertResolveRef.current = resolve
    })
  }, [])

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ 
        ...options, 
        isOpen: true,
        resolve 
      })
    })
  }, [])

  const handleAlertClose = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }))
    if (alertResolveRef.current) {
      alertResolveRef.current()
      alertResolveRef.current = null
    }
  }, [])

  const handleConfirmClose = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false)
    }
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: undefined }))
  }, [confirmState.resolve])

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true)
    }
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: undefined }))
  }, [confirmState.resolve])

  useEffect(() => {
    setModalContext({ showAlert, showConfirm })
  }, [showAlert, showConfirm])

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={handleAlertClose}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        icon={alertState.icon}
      />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        icon={confirmState.icon}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

// Helper functions for easy replacement of alert/confirm
export const alert = (message: string, options?: Omit<AlertOptions, 'message'>) => {
  // This will be called from components, but we need to access the context
  // For now, we'll need to call it from within components
  throw new Error('Use useModal().showAlert() hook instead of global alert()')
}

export const confirm = (message: string, options?: Omit<ConfirmOptions, 'message'>) => {
  // This will be called from components, but we need to access the context
  throw new Error('Use useModal().showConfirm() hook instead of global confirm()')
}


'use client'
import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  icon?: string
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = 'Confirm Action',
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  icon
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const typeConfig = {
    danger: {
      icon: icon || '🗑️',
      bgGradient: 'from-[#ef4444] to-[#dc2626]',
      textColor: 'text-[#ef4444]',
      bgLight: 'bg-[rgba(239,68,68,0.12)]',
      borderColor: 'border-[rgba(239,68,68,0.2)]',
      confirmBg: 'bg-gradient-to-r from-[#ef4444] to-[#dc2626]'
    },
    warning: {
      icon: icon || '⚠️',
      bgGradient: 'from-[#f59e0b] to-[#d97706]',
      textColor: 'text-[#f59e0b]',
      bgLight: 'bg-[rgba(245,158,11,0.12)]',
      borderColor: 'border-[rgba(245,158,11,0.2)]',
      confirmBg: 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]'
    },
    info: {
      icon: icon || 'ℹ️',
      bgGradient: 'from-[#0f62fe] to-[#23a6ff]',
      textColor: 'text-[#0f62fe]',
      bgLight: 'bg-[rgba(15,98,254,0.12)]',
      borderColor: 'border-[rgba(15,98,254,0.2)]',
      confirmBg: 'bg-gradient-to-r from-[#0f62fe] via-[#1b7fff] to-[#23a6ff]'
    }
  }

  const config = typeConfig[type]

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] border border-[rgba(15,23,42,0.08)] shadow-[0_22px_45px_rgba(15,23,42,0.08)] max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-[rgba(15,23,42,0.06)] flex items-center justify-center transition-all text-[#4b5563] hover:text-[#1f2937]"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h2 className={`text-2xl font-semibold bg-gradient-to-r ${config.bgGradient} bg-clip-text text-transparent mb-2`}>
            {title}
          </h2>
        </div>

        <div className={`${config.bgLight} ${config.borderColor} border rounded-[24px] p-5 mb-6`}>
          <p className="text-[#1f2937] text-center leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="relative inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-6 py-3 text-sm font-semibold tracking-wide text-[#0f172a] transition-all duration-200 hover:border-[rgba(15,23,42,0.16)] hover:shadow-[0_18px_32px_rgba(15,23,42,0.08)]"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide text-white outline-none transition-all duration-200 ${config.confirmBg} hover:shadow-[0_26px_40px_rgba(15,98,254,0.38)] hover:-translate-y-0.5`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}


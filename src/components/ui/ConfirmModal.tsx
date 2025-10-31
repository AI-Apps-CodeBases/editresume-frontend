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
      bgGradient: 'from-red-500 to-rose-600',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200',
      confirmBg: 'bg-gradient-to-r from-red-500 to-rose-600'
    },
    warning: {
      icon: icon || '⚠️',
      bgGradient: 'from-yellow-500 to-orange-600',
      textColor: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      confirmBg: 'bg-gradient-to-r from-yellow-500 to-orange-600'
    },
    info: {
      icon: icon || 'ℹ️',
      bgGradient: 'from-blue-500 to-purple-600',
      textColor: 'text-blue-700',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
      confirmBg: 'bg-gradient-to-r from-blue-500 to-purple-600'
    }
  }

  const config = typeConfig[type]

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h2 className={`text-2xl font-bold bg-gradient-to-r ${config.bgGradient} bg-clip-text text-transparent mb-2`}>
            {title}
          </h2>
        </div>

        <div className={`${config.bgLight} ${config.borderColor} border-2 rounded-xl p-4 mb-6`}>
          <p className="text-gray-700 text-center leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-3 ${config.confirmBg} text-white rounded-xl font-bold hover:shadow-lg transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}


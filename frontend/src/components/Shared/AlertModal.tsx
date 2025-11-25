'use client'
import { useEffect } from 'react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  icon?: string
}

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title,
  message, 
  type = 'info',
  icon 
}: AlertModalProps) {
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
    success: {
      icon: icon || '✅',
      bgGradient: 'from-[#0f9d58] to-[#0d8a4c]',
      textColor: 'text-[#0f9d58]',
      bgLight: 'bg-[rgba(15,157,88,0.12)]',
      borderColor: 'border-[rgba(15,157,88,0.2)]',
      buttonStyle: 'bg-gradient-to-r from-[#0f9d58] to-[#0d8a4c]'
    },
    error: {
      icon: icon || '❌',
      bgGradient: 'from-[#ef4444] to-[#dc2626]',
      textColor: 'text-[#ef4444]',
      bgLight: 'bg-[rgba(239,68,68,0.12)]',
      borderColor: 'border-[rgba(239,68,68,0.2)]',
      buttonStyle: 'bg-gradient-to-r from-[#ef4444] to-[#dc2626]'
    },
    warning: {
      icon: icon || '⚠️',
      bgGradient: 'from-[#f59e0b] to-[#d97706]',
      textColor: 'text-[#f59e0b]',
      bgLight: 'bg-[rgba(245,158,11,0.12)]',
      borderColor: 'border-[rgba(245,158,11,0.2)]',
      buttonStyle: 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]'
    },
    info: {
      icon: icon || 'ℹ️',
      bgGradient: 'from-[#0f62fe] to-[#23a6ff]',
      textColor: 'text-[#0f62fe]',
      bgLight: 'bg-[rgba(15,98,254,0.12)]',
      borderColor: 'border-[rgba(15,98,254,0.2)]',
      buttonStyle: 'bg-gradient-to-r from-[#0f62fe] via-[#1b7fff] to-[#23a6ff]'
    }
  }

  const config = typeConfig[type]

  // Parse message for markdown-style formatting
  const formatMessage = (msg: string) => {
    // Split by lines and format
    const lines = msg.split('\n')
    return lines.map((line, idx) => {
      // Check for headings
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-gray-900 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-bold text-gray-900 mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        )
      }
      // Check for numbered lists
      if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '')
        return (
          <div key={idx} className="ml-4 mt-2">
            <span className="font-semibold text-gray-900">{line.match(/^\d+\./)?.[0]} </span>
            <span className="text-gray-700">{text}</span>
          </div>
        )
      }
      // Check for bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={idx} className="ml-6 mt-1 text-gray-700">
            • {line.replace(/^[-•]\s*/, '')}
          </div>
        )
      }
      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={idx} className="text-gray-700 mt-2 leading-relaxed">
            {line}
          </p>
        )
      }
      return <br key={idx} />
    })
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] border border-[rgba(15,23,42,0.08)] shadow-[0_22px_45px_rgba(15,23,42,0.08)] max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-300"
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
          {title && (
            <h2 className={`text-2xl font-semibold bg-gradient-to-r ${config.bgGradient} bg-clip-text text-transparent mb-2`}>
              {title}
            </h2>
          )}
        </div>

        <div className={`${config.bgLight} ${config.borderColor} border rounded-[24px] p-5 max-h-[60vh] overflow-y-auto custom-scrollbar`}>
          <div className="text-left text-[#1f2937] leading-relaxed">
            {formatMessage(message)}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className={`relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold tracking-wide text-white outline-none transition-all duration-200 ${config.buttonStyle} hover:shadow-[0_26px_40px_rgba(15,98,254,0.38)] hover:-translate-y-0.5`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}


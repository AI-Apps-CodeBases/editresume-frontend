'use client'
import { useEffect } from 'react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  icon?: string
  onUpgrade?: () => void
}

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title,
  message, 
  type = 'info',
  icon,
  onUpgrade
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
  const formatMessage = (msg: string, isPremium: boolean = false) => {
    const textColor = isPremium ? 'text-gray-700' : 'text-[#1f2937]'
    const headingColor = isPremium ? 'text-gray-900' : 'text-gray-900'
    
    // Split by lines and format
    const lines = msg.split('\n')
    return lines.map((line, idx) => {
      // Check for headings
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className={`text-lg font-bold ${headingColor} mt-4 mb-2`}>
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className={`text-xl font-bold ${headingColor} mt-4 mb-2`}>
            {line.replace('## ', '')}
          </h2>
        )
      }
      // Check for numbered lists
      if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '')
        return (
          <div key={idx} className="ml-4 mt-2">
            <span className={`font-semibold ${headingColor}`}>{line.match(/^\d+\./)?.[0]} </span>
            <span className={textColor}>{text}</span>
          </div>
        )
      }
      // Check for bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={idx} className={`ml-6 mt-1 ${textColor}`}>
            • {line.replace(/^[-•]\s*/, '')}
          </div>
        )
      }
      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={idx} className={`${textColor} mt-2 leading-relaxed`}>
            {line}
          </p>
        )
      }
      return <br key={idx} />
    })
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          {onUpgrade && (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
          {!onUpgrade && <div className="text-5xl mb-4">{config.icon}</div>}
          {title && (
            <h2 className={`text-2xl font-bold ${onUpgrade ? 'text-gray-900' : `bg-gradient-to-r ${config.bgGradient} bg-clip-text text-transparent`} mb-2`}>
              {title}
            </h2>
          )}
        </div>

        <div className={`${onUpgrade ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' : `${config.bgLight} ${config.borderColor}`} border rounded-xl p-5 max-h-[60vh] overflow-y-auto custom-scrollbar mb-6`}>
          <div className="text-left leading-relaxed">
            {formatMessage(message, !!onUpgrade)}
          </div>
        </div>

        <div className={`flex ${onUpgrade ? 'flex-col-reverse gap-3' : 'justify-center'} items-stretch`}>
          {onUpgrade && (
            <button
              onClick={handleUpgrade}
              className="relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide text-white outline-none transition-all duration-200 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Upgrade to Premium
            </button>
          )}
          <button
            onClick={onClose}
            className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide outline-none transition-all duration-200 ${
              onUpgrade 
                ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400' 
                : `text-white ${config.buttonStyle} hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0`
            }`}
          >
            {onUpgrade ? 'Maybe Later' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}


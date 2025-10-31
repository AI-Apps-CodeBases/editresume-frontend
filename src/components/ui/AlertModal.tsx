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
      bgGradient: 'from-green-500 to-emerald-600',
      textColor: 'text-green-700',
      bgLight: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    error: {
      icon: icon || '❌',
      bgGradient: 'from-red-500 to-rose-600',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    warning: {
      icon: icon || '⚠️',
      bgGradient: 'from-yellow-500 to-orange-600',
      textColor: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    info: {
      icon: icon || 'ℹ️',
      bgGradient: 'from-blue-500 to-purple-600',
      textColor: 'text-blue-700',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200'
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-300"
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
          {title && (
            <h2 className={`text-2xl font-bold bg-gradient-to-r ${config.bgGradient} bg-clip-text text-transparent mb-2`}>
              {title}
            </h2>
          )}
        </div>

        <div className={`${config.bgLight} ${config.borderColor} border-2 rounded-xl p-4 max-h-[60vh] overflow-y-auto`}>
          <div className="text-left">
            {formatMessage(message)}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className={`px-8 py-3 bg-gradient-to-r ${config.bgGradient} text-white rounded-xl font-bold hover:shadow-lg transition-all`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}


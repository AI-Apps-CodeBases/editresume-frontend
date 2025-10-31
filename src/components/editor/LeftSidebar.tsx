'use client'
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '@/contexts/SettingsContext'
import AIWizard from './AIWizard'
import JobDescriptionMatcher from './JobDescriptionMatcher'
import CoverLetterGenerator from './CoverLetterGenerator'
import GrammarStylePanel from './GrammarStylePanel'
import EnhancedATSScoreWidget from './EnhancedATSScoreWidget'

interface Props {
  resumeData: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    summary: string
    sections: Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params: Record<string, string>
      }>
    }>
  }
  onResumeUpdate?: (updatedResume: any) => void
  onApplySuggestion?: (sectionId: string, bulletId: string, newText: string) => void
  onAIImprove?: (text: string, context?: string) => Promise<string>
  onAddContent?: (newContent: any) => void
}

export default function LeftSidebar({ resumeData, onResumeUpdate, onApplySuggestion, onAIImprove, onAddContent }: Props) {
  const { settings } = useSettings()
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  // Force close any popups and ensure clean state on mount
  React.useEffect(() => {
    setMounted(true)
    // Clear any persisted popup state
    setActivePopup(null)
    
    // Clear any localStorage that might be causing issues
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activePopup')
      sessionStorage.removeItem('activePopup')
      
      // Check for URL parameters that might be causing popup to open
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('popup') || urlParams.has('tool')) {
        // Remove any popup-related URL parameters
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('popup')
        newUrl.searchParams.delete('tool')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
    
    // Force close any popups that might be stuck
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopup(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Additional safety check - force close on any state change
  React.useEffect(() => {
    // Popup state management
  }, [activePopup])

  const sidebarItems = [
    {
      id: 'ai-wizard',
      title: 'AI Wizard',
      icon: '🧙‍♂️',
      description: 'AI-powered content generation',
      premium: true,
      enabled: settings.aiImprovements
    },
    {
      id: 'job-matcher',
      title: 'Job Matcher',
      icon: '🎯',
      description: 'Match your resume to job descriptions',
      premium: false,
      enabled: true
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter',
      icon: '📝',
      description: 'Generate tailored cover letters',
      premium: true,
      enabled: settings.aiImprovements
    },
    {
      id: 'grammar-check',
      title: 'Grammar Check',
      icon: '📚',
      description: 'Grammar and style analysis',
      premium: false,
      enabled: settings.grammarCheck
    },
    {
      id: 'ats-score',
      title: 'ATS Score',
      icon: '🎯',
      description: 'ATS analysis + AI improvements',
      premium: false,
      enabled: true
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      icon: '👥',
      description: 'Real-time collaboration tools',
      premium: true,
      enabled: settings.advancedFeatures
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: '💬',
      description: 'Add comments and feedback',
      premium: false,
      enabled: true
    }
  ]

  const handleItemClick = (itemId: string) => {
    if (activePopup === itemId) {
      setActivePopup(null)
    } else {
      setActivePopup(itemId)
    }
  }

  // Expose the close function globally for emergency use
  React.useEffect(() => {
    const forceCloseAllPopups = () => setActivePopup(null)
    ;(window as any).closeAllPopups = forceCloseAllPopups
    return () => {
      delete (window as any).closeAllPopups
    }
  }, [])

  const renderPopup = () => {
    if (!activePopup) {
      return null
    }
    if (!mounted) return null

    const commonProps = {
      onClose: () => setActivePopup(null),
      resumeData,
      onResumeUpdate
    }

    switch (activePopup) {
      case 'ai-wizard':
        return createPortal((
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" 
            onClick={() => setActivePopup(null)}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-[10001]" onClick={(e) => e.stopPropagation()}>
              <AIWizard {...commonProps} onAddContent={onAddContent} onClose={() => setActivePopup(null)} />
            </div>
          </div>
        ), document.body)
      case 'job-matcher':
        return createPortal((
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" 
            onClick={() => setActivePopup(null)}
            onKeyDown={(e) => e.key === 'Escape' && setActivePopup(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-[10001]" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  🎯 Job Description Matcher
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Press ESC to close</span>
                  <button
                    onClick={() => setActivePopup(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    title="Close popup"
                  >
                    ×
                  </button>
                </div>
              </div>
              <JobDescriptionMatcher {...commonProps} standalone={false} />
            </div>
          </div>
        ), document.body)
      case 'cover-letter':
        return createPortal(
          <CoverLetterGenerator {...commonProps} onClose={() => setActivePopup(null)} />,
          document.body
        )
      case 'grammar-check':
        return createPortal((
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-[10001]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  📚 Grammar & Style Checker
                </h2>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                <GrammarStylePanel
                  resumeData={resumeData}
                  onApplySuggestion={onApplySuggestion}
                />
              </div>
            </div>
          </div>
        ), document.body)
      case 'ats-score':
        return createPortal(
          <EnhancedATSScoreWidget resumeData={resumeData} onClose={() => setActivePopup(null)} />,
          document.body
        )
      case 'collaboration':
        return createPortal((
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full z-[10001]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  👥 Real-time Collaboration
                </h2>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon!</h3>
                  <p className="text-gray-600">
                    Real-time collaboration features are under development.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ), document.body)
      case 'comments':
        return createPortal((
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full z-[10001]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  💬 Comments & Feedback
                </h2>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Comments Feature</h3>
                  <p className="text-gray-600">
                    Add comments and feedback to your resume sections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ), document.body)
      default:
        return null
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Tools</h2>
              <p className="text-sm text-gray-600 mt-1">Enhance your resume</p>
            </div>
            {activePopup && (
              <button
                onClick={() => setActivePopup(null)}
                className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all duration-200"
                title="Close any open popup"
              >
                Close All
              </button>
            )}
          </div>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                disabled={!item.enabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                  activePopup === item.id
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-2 border-blue-200 shadow-md'
                    : item.enabled
                    ? 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 text-gray-700 hover:shadow-sm hover:border hover:border-gray-200'
                    : 'opacity-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="text-xl flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{item.title}</span>
                    {item.premium && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate leading-relaxed">{item.description}</p>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200 flex-shrink-0">
                  {activePopup === item.id ? '▼' : '▶'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="text-xs text-gray-500 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-medium">Grammar Check: {settings.grammarCheck ? 'On' : 'Off'}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.aiImprovements ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className="font-medium">AI Features: {settings.aiImprovements ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popup Overlays - Rendered in Portal */}
      {mounted && typeof window !== 'undefined' && (() => {
        const popup = renderPopup()
        return popup ? createPortal(popup, document.body) : null
      })()}
    </>
  )
}

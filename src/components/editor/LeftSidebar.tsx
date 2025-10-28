'use client'
import React, { useState } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import AIWizard from './AIWizard'
import JobDescriptionMatcher from './JobDescriptionMatcher'
import CoverLetterGenerator from './CoverLetterGenerator'
import GrammarStylePanel from './GrammarStylePanel'
import ATSScoreWidget from './ATSScoreWidget'
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
  onApplySuggestion?: (sectionId: string, bulletId: string, newText: string) => void
  onAIImprove?: (text: string, context?: string) => Promise<string>
  onAddContent?: (newContent: any) => void
}

export default function LeftSidebar({ resumeData, onApplySuggestion, onAIImprove, onAddContent }: Props) {
  const { settings } = useSettings()
  const [activePopup, setActivePopup] = useState<string | null>(null)

  // Force close any popups and ensure clean state on mount
  React.useEffect(() => {
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
    if (activePopup) {
      console.log('Popup opened:', activePopup)
    }
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
    console.log('Sidebar item clicked:', itemId, 'Current popup:', activePopup)
    if (activePopup === itemId) {
      setActivePopup(null)
    } else {
      setActivePopup(itemId)
    }
  }

  // Emergency close function - can be called from anywhere
  const forceCloseAllPopups = () => {
    setActivePopup(null)
  }

  // Expose the close function globally for emergency use
  React.useEffect(() => {
    (window as any).closeAllPopups = forceCloseAllPopups
    return () => {
      delete (window as any).closeAllPopups
    }
  }, [forceCloseAllPopups])

  const renderPopup = () => {
    if (!activePopup) {
      console.log('No active popup, returning null')
      return null
    }
    console.log('Rendering popup:', activePopup)

    const commonProps = {
      onClose: () => setActivePopup(null),
      resumeData
    }

    switch (activePopup) {
      case 'ai-wizard':
        return <AIWizard {...commonProps} onAddContent={onAddContent} />
      case 'job-matcher':
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
            onClick={() => setActivePopup(null)}
            onKeyDown={(e) => e.key === 'Escape' && setActivePopup(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" 
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
        )
      case 'cover-letter':
        return <CoverLetterGenerator {...commonProps} onClose={() => setActivePopup(null)} />
      case 'grammar-check':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
        )
      case 'ats-score':
        return <EnhancedATSScoreWidget resumeData={resumeData} onClose={() => setActivePopup(null)} />
      case 'collaboration':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
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
        )
      case 'comments':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setActivePopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
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
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div className="w-48 bg-white border-r border-gray-200 shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Tools</h2>
              <p className="text-sm text-gray-600">Enhance your resume</p>
            </div>
            {activePopup && (
              <button
                onClick={() => setActivePopup(null)}
                className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                title="Close any open popup"
              >
                Close All
              </button>
            )}
          </div>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                disabled={!item.enabled}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all group ${
                  activePopup === item.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : item.enabled
                    ? 'hover:bg-gray-50 text-gray-700'
                    : 'opacity-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="text-lg">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    {item.premium && (
                      <span className="px-1 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600">
                  {activePopup === item.id ? '▼' : '▶'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Grammar Check: {settings.grammarCheck ? 'On' : 'Off'}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.aiImprovements ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
              <span>AI Features: {settings.aiImprovements ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popup Overlays */}
      {renderPopup()}
    </>
  )
}

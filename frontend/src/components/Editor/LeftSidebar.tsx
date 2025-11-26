'use client'
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import CollaborationPanel from './CollaborationPanel'

interface Props {
  resumeData: any
  onResumeUpdate?: (updatedResume: any) => void
  roomId?: string | null
  onCreateRoom?: () => void
  onJoinRoom?: (roomId: string) => void
  onLeaveRoom?: () => void
  isConnected?: boolean
  activeUsers?: Array<{ user_id: string; name: string; joined_at: string }>
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  onOpenAIWizard?: () => void
  onOpenAIImprovements?: () => void
  onOpenCoverLetter?: () => void
  onShowMatchView?: () => void
  onShowAnalysisView?: () => void
  onOpenGrammarPanel?: () => void
  onOpenJobMatchAnalytics?: () => void
  previewMode?: 'live' | 'match' | 'analysis'
}

export default function LeftSidebar({ 
  resumeData, 
  onResumeUpdate,
  roomId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isConnected = false,
  activeUsers = [],
  onViewChange,
  onOpenAIWizard,
  onOpenAIImprovements,
  onOpenCoverLetter,
  onShowMatchView,
  onShowAnalysisView,
  onOpenGrammarPanel,
  onOpenJobMatchAnalytics,
  previewMode
}: Props) {
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState<'jobs' | 'resumes' | 'collaboration' | null>(null)
  const [savedJDs, setSavedJDs] = useState<Array<{
    id: number
    title: string
    company?: string
    source?: string
    url?: string
    created_at?: string
  }>>([])
  const [savedResumes, setSavedResumes] = useState<Array<{
    id: number
    name: string
    title?: string
    template?: string
    created_at?: string
    updated_at?: string
    version_count?: number
    latest_version_id?: number
  }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user?.email && activeSection) {
      loadSectionData()
    }
  }, [isAuthenticated, user?.email, activeSection])

  const loadSectionData = async () => {
    if (!user?.email) return
    setLoading(true)
    
    try {
      if (activeSection === 'jobs') {
        const { auth } = await import('@/lib/firebaseClient')
        const currentUser = auth.currentUser
        const token = currentUser ? await currentUser.getIdToken() : null
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await fetch(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`, {
          headers
        })
        if (res.ok) {
          const data = await res.json()
          setSavedJDs(Array.isArray(data) ? data : data.results || [])
        }
      } else if (activeSection === 'resumes') {
        const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setSavedResumes(data.resumes || [])
        }
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  const sidebarItems = [
    {
      id: 'jobs',
      title: 'Jobs',
      icon: '💼',
      description: 'Saved job descriptions',
      requiresAuth: true
    },
    {
      id: 'resumes',
      title: 'Resumes',
      icon: '📄',
      description: 'Master resumes',
      requiresAuth: true
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      icon: '🤝',
      description: 'Real-time collaboration',
      requiresAuth: false
    }
  ]

  const aiShortcuts: Array<{
    id: string
    title: string
    icon: string
    description: string
    onClick: () => void
    isActive?: boolean
  }> = []

  if (onOpenAIWizard) {
    aiShortcuts.push({
      id: 'ai-wizard',
      title: 'AI Content Wizard',
      icon: '🤖',
      description: 'Generate resume sections with guided prompts',
      onClick: onOpenAIWizard
    })
  }

  if (onOpenAIImprovements) {
    aiShortcuts.push({
      id: 'ai-improvements',
      title: 'AI Resume Improvements',
      icon: '✨',
      description: 'Analyze and upgrade your resume instantly',
      onClick: onOpenAIImprovements
    })
  }

  if (onShowMatchView) {
    aiShortcuts.push({
      id: 'job-match',
      title: 'Job Match Assistant',
      icon: '🎯',
      description: 'Compare your resume with job descriptions',
      onClick: onShowMatchView,
      isActive: previewMode === 'match'
    })
  }

  if (onShowAnalysisView) {
    aiShortcuts.push({
      id: 'ats-analysis',
      title: 'Enhanced ATS Analyzer',
      icon: '📊',
      description: 'Run our advanced ATS compatibility analysis',
      onClick: onShowAnalysisView,
      isActive: previewMode === 'analysis'
    })
  }

  if (onOpenCoverLetter) {
    aiShortcuts.push({
      id: 'cover-letter',
      title: 'Cover Letter Generator',
      icon: '✉️',
      description: 'Draft tailored cover letters in seconds',
      onClick: onOpenCoverLetter
    })
  }

  if (onOpenGrammarPanel) {
    aiShortcuts.push({
      id: 'grammar',
      title: 'Grammar & Style Review',
      icon: '📝',
      description: 'Polish writing with AI-powered grammar checks',
      onClick: onOpenGrammarPanel
    })
  }

  if (onOpenJobMatchAnalytics) {
    aiShortcuts.push({
      id: 'job-analytics',
      title: 'Job Match Analytics',
      icon: '📈',
      description: 'Review performance across job applications',
      onClick: onOpenJobMatchAnalytics
    })
  }

  const handleItemClick = (itemId: string) => {
    if (itemId === 'jobs' && onViewChange) {
      onViewChange('jobs')
      return
    }
    if (itemId === 'resumes' && onViewChange) {
      onViewChange('resumes')
      return
    }
    if (activeSection === itemId) {
      setActiveSection(null)
    } else {
      setActiveSection(itemId as 'jobs' | 'resumes' | 'collaboration')
    }
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-xl flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-bold text-gray-900">Tools</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your content</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {sidebarItems.map((item) => {
            const isDisabled = item.requiresAuth && !isAuthenticated
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-2 border-blue-200 shadow-md'
                    : isDisabled
                    ? 'opacity-50 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 text-gray-700 hover:shadow-sm hover:border hover:border-gray-200'
                }`}
              >
                <div className="text-xl flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{item.title}</div>
                  <p className="text-xs text-gray-500 truncate leading-relaxed">{item.description}</p>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200 flex-shrink-0">
                  {activeSection === item.id ? '▼' : '▶'}
                </div>
              </button>
            )
          })}
        </div>

        {aiShortcuts.length > 0 && (
          <div className="px-3 pb-4">
            <div className="px-1 pb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wide uppercase">AI Features</h3>
            </div>
            <div className="space-y-2">
              {aiShortcuts.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                    item.isActive
                      ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-2 border-purple-200 shadow-md'
                      : 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 text-gray-700 hover:shadow-sm hover:border hover:border-purple-200'
                  }`}
                >
                  <div className="text-xl flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{item.title}</div>
                    <p className="text-xs text-gray-500 truncate leading-relaxed">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            {activeSection === 'jobs' && (
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  Open the Jobs workspace to review saved job descriptions, update ATS matches, and manage cover letters.
                </p>
                <button
                  onClick={() => onViewChange?.('jobs')}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Go to Jobs
                </button>
              </div>
            )}

            {activeSection === 'resumes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Master Resumes</h3>
                  <button
                    onClick={loadSectionData}
                    className="text-xs text-blue-600 hover:text-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {!isAuthenticated ? (
                  <div className="text-center py-4 text-xs text-gray-500">
                    Sign in to view saved resumes
                  </div>
                ) : savedResumes.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">
                    No saved resumes yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {savedResumes.map((resume) => {
                      const versionQuery = resume.latest_version_id ? `&resumeVersionId=${resume.latest_version_id}` : ''
                      return (
                        <a
                          key={resume.id}
                          href={`/editor?resumeId=${resume.id}${versionQuery}`}
                          className="block p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                          <div className="font-semibold text-xs text-gray-900 truncate">{resume.name}</div>
                          {resume.title && (
                            <div className="text-xs text-gray-600 truncate">{resume.title}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {resume.version_count && (
                              <span className="text-[10px] text-gray-500">
                                {resume.version_count} version{resume.version_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {resume.template && (
                              <span className="text-[10px] text-gray-400">• {resume.template}</span>
                            )}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'collaboration' && (
              <div className="space-y-3">
                <CollaborationPanel
                  isConnected={isConnected}
                  activeUsers={activeUsers}
                  roomId={roomId || null}
                  onCreateRoom={onCreateRoom || (() => {})}
                  onJoinRoom={onJoinRoom || (() => {})}
                  onLeaveRoom={onLeaveRoom || (() => {})}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface ModernLeftSidebarProps {
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  currentView?: 'editor' | 'jobs' | 'resumes'
  onCollapseChange?: (collapsed: boolean) => void
  onAIContentWizard?: (contentType: 'job' | 'project' | 'skill' | 'education') => void
  onOpenCoverLetter?: () => void
  onTemplatesClick?: () => void
  userName?: string
  isAuthenticated?: boolean
  onLogout?: () => void
  onSignIn?: () => void
}

export default function ModernLeftSidebar({ 
  onViewChange, 
  currentView = 'editor', 
  onCollapseChange, 
  onAIContentWizard, 
  onOpenCoverLetter,
  onTemplatesClick,
  userName,
  isAuthenticated: isAuthenticatedProp,
  onLogout,
  onSignIn
}: ModernLeftSidebarProps) {
  const { user, isAuthenticated: authIsAuthenticated } = useAuth()
  const isAuthenticated = isAuthenticatedProp ?? authIsAuthenticated
  const [collapsed, setCollapsed] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleCollapseToggle = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  const mainItems = [
    {
      id: 'editor',
      title: 'Editor',
      icon: '📝',
      description: 'Resume builder',
      requiresAuth: false,
    },
    {
      id: 'jobs',
      title: 'Jobs',
      icon: '💼',
      description: 'Saved job descriptions',
      requiresAuth: true,
    },
    {
      id: 'resumes',
      title: 'Resumes',
      icon: '📄',
      description: 'Master resumes',
      requiresAuth: true,
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      icon: '🤝',
      description: 'Real-time collab',
      requiresAuth: false,
    },
  ]

  const aiTools = [
    {
      id: 'ai-work-experience',
      title: 'Work Experience',
      icon: '💼',
      description: 'Add a new job or position',
      contentType: 'job' as const,
    },
    {
      id: 'ai-project',
      title: 'Project',
      icon: '🚀',
      description: 'Add a project or achievement',
      contentType: 'project' as const,
    },
    {
      id: 'ai-skills',
      title: 'Skills',
      icon: '🛠️',
      description: 'Add technical or soft skills',
      contentType: 'skill' as const,
    },
    {
      id: 'ai-education',
      title: 'Education',
      icon: '🎓',
      description: 'Add education or certification',
      contentType: 'education' as const,
    },
    {
      id: 'ai-cover-letter',
      title: 'Cover Letter',
      icon: '✉️',
      description: 'Create cover letter with AI',
      isCoverLetter: true,
    },
  ]

  const secondaryItems = [
    { id: 'templates', title: 'Templates', icon: '🎨' },
    { id: 'design', title: 'Design', icon: '✨' },
    { id: 'settings', title: 'Settings', icon: '⚙️' },
  ]

  const handleItemClick = (itemId: string) => {
    if (itemId === 'editor') {
      onViewChange?.('editor')
    } else if (itemId === 'jobs' || itemId === 'resumes') {
      onViewChange?.(itemId as 'jobs' | 'resumes')
    } else if (itemId.startsWith('ai-')) {
      // Handle AI Content Wizard tools
      const aiTool = aiTools.find(tool => tool.id === itemId)
      if (aiTool) {
        if (aiTool.isCoverLetter && onOpenCoverLetter) {
          onOpenCoverLetter()
        } else if (aiTool.contentType && onAIContentWizard) {
          onAIContentWizard(aiTool.contentType)
        }
      }
    } else if (itemId === 'templates') {
      onTemplatesClick?.()
    }
  }

  if (collapsed) {
    return (
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="flex flex-col items-center py-4 gap-4 flex-1">
          <button
            onClick={handleCollapseToggle}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              title={item.title}
            >
              <span className="text-xl">{item.icon}</span>
            </button>
          ))}
          {aiTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleItemClick(tool.id)}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              title={tool.title}
            >
              <span className="text-xl">{tool.icon}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-200 p-2 relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full p-2 hover:bg-gray-50 rounded-lg transition-colors"
            title={userName || user?.email || 'Profile'}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold mx-auto">
              {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>
          {showProfileMenu && (
            <div className="absolute bottom-full left-full ml-2 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile Settings
                  </Link>
                  <Link href="/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Billing
                  </Link>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  )}
                </>
              ) : (
                onSignIn && (
                  <button
                    onClick={onSignIn}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tools</h2>
          <button
            onClick={handleCollapseToggle}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 space-y-1">
          {mainItems.map((item) => {
            const isDisabled = item.requiresAuth && !isAuthenticated
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                    : isDisabled
                    ? 'opacity-50 text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* AI Content Wizard Tools */}
        <div className="mt-6 px-3">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Content</p>
          </div>
          <div className="space-y-1">
            {aiTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleItemClick(tool.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-base">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{tool.title}</div>
                  <div className="text-xs text-gray-500">{tool.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Section */}
        <div className="mt-6 px-3">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More</p>
          </div>
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="border-t border-gray-200 p-3 bg-gray-50" ref={profileMenuRef}>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {userName || user?.email || 'Guest'}
              </div>
              <div className="text-xs text-gray-500">
                {user?.isPremium ? 'Pro Plan' : 'Free Plan'}
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProfileMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile Settings
                  </Link>
                  <Link href="/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Billing
                  </Link>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  )}
                </>
              ) : (
                onSignIn && (
                  <button
                    onClick={onSignIn}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


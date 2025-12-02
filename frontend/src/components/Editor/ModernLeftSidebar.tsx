'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Tooltip from '@/components/Shared/Tooltip'

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
  isMobileDrawer?: boolean
  onCloseDrawer?: () => void
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
  onSignIn,
  isMobileDrawer = false,
  onCloseDrawer
}: ModernLeftSidebarProps) {
  const { user, isAuthenticated: authIsAuthenticated } = useAuth()
  const isAuthenticated = isAuthenticatedProp ?? authIsAuthenticated
  const [collapsed, setCollapsed] = useState(false)

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
    {
      id: 'templates',
      title: 'Templates',
      icon: '🎨',
      description: 'Resume templates',
      requiresAuth: false,
    },
  ]



  const secondaryItems: Array<{ id: string; title: string; icon: string }> = []

  const handleItemClick = (itemId: string) => {
    if (itemId === 'editor') {
      onViewChange?.('editor')
    } else if (itemId === 'jobs' || itemId === 'resumes') {
      onViewChange?.(itemId as 'jobs' | 'resumes')

    } else if (itemId === 'templates') {
      onTemplatesClick?.()
    }
    if (isMobileDrawer) {
      onCloseDrawer?.()
    }
  }

  if (isMobileDrawer) {
    return (
      <div className="lg:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onCloseDrawer} />
        <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm shadow-xl">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Tooltip text="Close menu" color="gray" position="left">
                <button
                  onClick={onCloseDrawer}
                  className="p-2 hover:bg-gray-100 rounded-lg touch-target"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-1">
                {mainItems.map((item) => {
                  const isDisabled = item.requiresAuth && !isAuthenticated
                  const isActive = currentView === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && handleItemClick(item.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all touch-target ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : isDisabled
                          ? 'opacity-50 text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {secondaryItems.length > 0 && (
                <div className="mt-6 px-3">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More</p>
                  </div>
                  <div className="space-y-1">
                    {secondaryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors touch-target"
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-3">
              <Link href="/profile" className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {(userName || user?.name)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {userName || user?.name || user?.email || 'Guest'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.isPremium ? 'Pro Plan' : 'Free Plan'}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="hidden lg:flex w-16 border-r border-gray-200 flex flex-col h-full">
        <div className="flex flex-col items-center py-4 gap-4 flex-1">
          <Tooltip text="Expand sidebar" color="gray" position="right">
            <button
              onClick={handleCollapseToggle}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors touch-target"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Tooltip>
          {mainItems.map((item) => (
            <Tooltip key={item.id} text={`${item.title} - ${item.description}`} color="blue" position="right">
              <button
                onClick={() => handleItemClick(item.id)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
              </button>
            </Tooltip>
          ))}

        </div>
        <div className="border-t border-gray-200 p-2">
          <div className="w-full p-2" title={userName || user?.email || 'Profile'}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold mx-auto">
              {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex w-48 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tools</h2>
          <Tooltip text="Collapse sidebar" color="gray" position="bottom">
            <button
              onClick={handleCollapseToggle}
              className="p-1 hover:bg-gray-50 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Tooltip>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all touch-target ${
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



        {secondaryItems.length > 0 && (
          <div className="mt-6 px-3">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More</p>
            </div>
            <div className="space-y-1">
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors touch-target"
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <Link href="/profile" className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {(userName || user?.name)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {userName || user?.name || user?.email || 'Guest'}
            </div>
            <div className="text-xs text-gray-500">
              {user?.isPremium ? 'Pro Plan' : 'Free Plan'}
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}


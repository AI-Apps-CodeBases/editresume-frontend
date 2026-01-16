'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Tooltip from '@/components/Shared/Tooltip'
import { FileEdit, Briefcase, FileText, Palette, ChevronDown, ChevronRight, Hash } from 'lucide-react'

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
  resumeData?: {
    sections?: Array<{ id: string; title: string }>
    summary?: string
  }
  onSectionClick?: (sectionId: string) => void
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
  onCloseDrawer,
  resumeData,
  onSectionClick
}: ModernLeftSidebarProps) {
  const { user, isAuthenticated: authIsAuthenticated } = useAuth()
  const isAuthenticated = isAuthenticatedProp ?? authIsAuthenticated
  const [collapsed, setCollapsed] = useState(false)
  const [sectionsExpanded, setSectionsExpanded] = useState(true)

  const handleCollapseToggle = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  const workspaceItems = [
    {
      id: 'editor',
      title: 'Editor',
      icon: FileEdit,
      description: 'Resume builder',
      requiresAuth: false,
    },
  ]

  const libraryItems = [
    {
      id: 'jobs',
      title: 'Jobs',
      icon: Briefcase,
      description: 'Saved job descriptions',
      requiresAuth: true,
    },
    {
      id: 'resumes',
      title: 'Resumes',
      icon: FileText,
      description: 'Master resumes',
      requiresAuth: true,
    },
    {
      id: 'templates',
      title: 'Templates',
      icon: Palette,
      description: 'Resume templates',
      requiresAuth: false,
    },
  ]



  const secondaryItems: Array<{ id: string; title: string; icon: React.ComponentType<{ className?: string }> }> = []

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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseDrawer} />
        <div className="absolute left-0 top-0 bottom-0 w-[72vw] max-w-xs bg-white shadow-[0_12px_48px_rgba(15,23,42,0.15)]">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-transparent">
              <h2 className="text-lg font-semibold text-text-primary">Menu</h2>
              <Tooltip text="Close menu" color="gray" position="left">
                <button
                  onClick={onCloseDrawer}
                  className="p-2 hover:bg-primary-50/50 rounded-lg touch-target transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-1">
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Workspace</p>
                </div>
                {workspaceItems.map((item) => {
                  const isDisabled = item.requiresAuth && !isAuthenticated
                  const isActive = currentView === item.id
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && handleItemClick(item.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 touch-target ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500/10 to-primary-50/50 text-primary-700 border-l-4 border-primary-500 shadow-sm'
                          : isDisabled
                          ? 'opacity-50 text-text-muted cursor-not-allowed'
                          : 'text-text-secondary hover:bg-primary-50/50 hover:shadow-sm hover:-translate-y-0.5'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className={`text-xs ${isActive ? 'text-primary-600' : 'text-text-muted'}`}>{item.description}</div>
                      </div>
                    </button>
                  )
                })}
                <div className="px-3 pt-4 pb-1">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Library</p>
                </div>
                {libraryItems.map((item) => {
                  const isDisabled = item.requiresAuth && !isAuthenticated
                  const isActive = currentView === item.id
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && handleItemClick(item.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 touch-target ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500/10 to-primary-50/50 text-primary-700 border-l-4 border-primary-500 shadow-sm'
                          : isDisabled
                          ? 'opacity-50 text-text-muted cursor-not-allowed'
                          : 'text-text-secondary hover:bg-primary-50/50 hover:shadow-sm hover:-translate-y-0.5'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className={`text-xs ${isActive ? 'text-primary-600' : 'text-text-muted'}`}>{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {secondaryItems.length > 0 && (
                <div className="mt-6 px-3">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">More</p>
                  </div>
                  <div className="space-y-1">
                    {secondaryItems.map((item) => {
                      const IconComponent = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          className="w-full flex items-center gap-3 px-3 py-3 text-sm text-text-secondary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target hover:shadow-sm"
                        >
                          <IconComponent className="w-4 h-4 text-gray-500" />
                          <span>{item.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border-subtle p-3 space-y-2 bg-gradient-to-t from-primary-50/20 to-transparent">
              <Link href="/profile" className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50/50 rounded-lg transition-all duration-200 surface-card">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm" style={{ background: 'var(--gradient-accent)' }}>
                  {(userName || user?.name)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {userName || user?.name || user?.email || 'Guest'}
                  </div>
                  <div className="text-xs text-text-muted">
                    {user?.isPremium ? 'Pro Plan' : 'Free Plan'}
                  </div>
                </div>
              </Link>
              {isAuthenticated && onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 touch-target hover:shadow-sm"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="hidden lg:flex w-16 border-r border-border-subtle flex flex-col h-full bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center py-4 gap-4 flex-1">
          <Tooltip text="Expand sidebar" color="gray" position="right">
            <button
              onClick={handleCollapseToggle}
              className="p-2 hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target hover:shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Tooltip>
          {workspaceItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Tooltip key={item.id} text={`${item.title} - ${item.description}`} color="blue" position="right">
                <button
                  onClick={() => handleItemClick(item.id)}
                  className="p-2 hover:bg-primary-50/50 rounded-lg transition-all duration-200 hover:shadow-sm"
                >
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </button>
              </Tooltip>
            )
          })}
          {libraryItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Tooltip key={item.id} text={`${item.title} - ${item.description}`} color="blue" position="right">
                <button
                  onClick={() => handleItemClick(item.id)}
                  className="p-2 hover:bg-primary-50/50 rounded-lg transition-all duration-200 hover:shadow-sm"
                >
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </button>
              </Tooltip>
            )
          })}

        </div>
        <div className="border-t border-border-subtle p-2">
          <div className="w-full p-2" title={userName || user?.email || 'Profile'}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold mx-auto shadow-sm" style={{ background: 'var(--gradient-accent)' }}>
              {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex w-56 border-r border-border-subtle flex flex-col h-full bg-white/90 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle bg-gradient-to-r from-primary-50/20 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tools</h2>
          <Tooltip text="Collapse sidebar" color="gray" position="bottom">
            <button
              onClick={handleCollapseToggle}
              className="p-1 hover:bg-primary-50/50 rounded transition-all duration-200"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        <div className="px-3 space-y-1">
          <div className="px-2 pt-1 pb-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Workspace</p>
          </div>
          {workspaceItems.map((item) => {
            const isDisabled = item.requiresAuth && !isAuthenticated
            const isActive = currentView === item.id
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 touch-target ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500/10 to-primary-50/50 text-primary-700 border-l-4 border-primary-500 shadow-sm'
                    : isDisabled
                    ? 'opacity-50 text-text-muted cursor-not-allowed'
                    : 'text-text-secondary hover:bg-primary-50/50 hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className={`text-xs ${isActive ? 'text-primary-600' : 'text-text-muted'}`}>{item.description}</div>
                </div>
              </button>
            )
          })}

          {/* Resume Sections */}
          {currentView === 'editor' && resumeData && (
            <>
              <div className="px-2 pt-4 pb-2">
                <button
                  onClick={() => setSectionsExpanded(!sectionsExpanded)}
                  className="flex items-center gap-2 w-full text-[11px] font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
                >
                  {sectionsExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Sections</span>
                  {(resumeData.sections?.length || 0) > 0 && (
                    <span className="ml-auto text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
                      {resumeData.sections?.length || 0}
                    </span>
                  )}
                </button>
              </div>
              {sectionsExpanded && (
                <div className="space-y-0.5 pl-3">
                  {resumeData.summary && (
                    <button
                      onClick={() => onSectionClick?.('summary')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-secondary hover:bg-primary-50/50 hover:text-primary-700 transition-all duration-200 group"
                    >
                      <Hash className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                      <span className="truncate font-medium">Summary</span>
                    </button>
                  )}
                  {resumeData.sections?.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => onSectionClick?.(section.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-secondary hover:bg-primary-50/50 hover:text-primary-700 transition-all duration-200 group"
                    >
                      <Hash className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                      <span className="truncate font-medium">{section.title || 'Untitled'}</span>
                    </button>
                  ))}
                  {(!resumeData.sections || resumeData.sections.length === 0) && !resumeData.summary && (
                    <div className="px-2.5 py-2 text-xs text-text-muted italic">
                      No sections yet
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="px-2 pt-4 pb-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Library</p>
          </div>
          {libraryItems.map((item) => {
            const isDisabled = item.requiresAuth && !isAuthenticated
            const isActive = currentView === item.id
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 touch-target ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500/10 to-primary-50/50 text-primary-700 border-l-4 border-primary-500 shadow-sm'
                    : isDisabled
                    ? 'opacity-50 text-text-muted cursor-not-allowed'
                    : 'text-text-secondary hover:bg-primary-50/50 hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className={`text-xs ${isActive ? 'text-primary-600' : 'text-text-muted'}`}>{item.description}</div>
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
              {secondaryItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target hover:shadow-sm"
                  >
                    <IconComponent className="w-4 h-4 text-gray-500" />
                    <span>{item.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="border-t border-border-subtle p-3 bg-gradient-to-t from-primary-50/20 to-transparent space-y-2">
        <Link href="/profile" className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50/50 rounded-lg transition-all duration-200 surface-card">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm" style={{ background: 'var(--gradient-accent)' }}>
            {(userName || user?.name)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-text-primary truncate">
              {userName || user?.name || user?.email || 'Guest'}
            </div>
            <div className="text-xs text-text-muted">
              {user?.isPremium ? 'Pro Plan' : 'Free Plan'}
            </div>
          </div>
        </Link>
        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 touch-target hover:shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Logout</span>
          </button>
        )}
      </div>
    </div>
  )
}

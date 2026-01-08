'use client'
import React, { useState, useEffect } from 'react'
import TopNavigationBar from './TopNavigationBar'
import ModernLeftSidebar from './ModernLeftSidebar'
import VisualResumeEditor from './VisualResumeEditor'
import RightPanel from './RightPanel'
import JobsView from './JobsView'
import ResumesView from '@/components/Resume/ResumesView'
import Tooltip from '@/components/Shared/Tooltip'
import { Menu, Zap, Eye } from 'lucide-react'

interface ModernEditorLayoutProps {
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
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  currentView?: 'editor' | 'jobs' | 'resumes'
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech'
  templateConfig?: any
  onAIContentWizard?: (contentType: 'job' | 'project' | 'skill' | 'education') => void
  onOpenCoverLetter?: () => void
  onAddContent?: (content: any) => void
  roomId?: string | null
  onAddComment?: (text: string, targetType: string, targetId: string) => void
  onResolveComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
  onCreateRoom?: () => void
  onJoinRoom?: (roomId: string) => void
  onLeaveRoom?: () => void
  isConnected?: boolean
  activeUsers?: Array<{ user_id: string; name: string; joined_at: string }>
  onAIImprove?: (text: string) => Promise<string>
  onNewResume?: () => void
  onSaveResume?: () => void
  onUploadResume?: () => void
  onExport?: (format: 'pdf' | 'docx' | 'cover-letter') => void
  isExporting?: boolean
  hasCoverLetter?: boolean
  userName?: string
  isAuthenticated?: boolean
  onLogout?: () => void
  onSignIn?: () => void
  deepLinkedJD?: string | null
  activeJobDescriptionId?: number | null
  onTemplatesClick?: () => void
  onShareResume?: () => void
  onSelectJobDescriptionId?: (id: number | null) => void
  onActionsClick?: () => void
}

export default function ModernEditorLayout({
  resumeData,
  onResumeUpdate,
  onViewChange,
  currentView = 'editor',
  template = 'clean',
  templateConfig,
  onAddContent,
  roomId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isConnected = false,
  activeUsers = [],
  onAIImprove,
  onAIContentWizard,
  onOpenCoverLetter,
  onNewResume,
  onSaveResume,
  onUploadResume,
  onExport,
  isExporting = false,
  hasCoverLetter = false,
  userName,
  isAuthenticated,
  onLogout,
  onSignIn,
  deepLinkedJD,
  activeJobDescriptionId,
  onTemplatesClick,
  onShareResume,
  onSelectJobDescriptionId,
  onActionsClick,
}: ModernEditorLayoutProps) {
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'job-description'>('preview')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showLeftDrawer, setShowLeftDrawer] = useState(false)
  const [showRightDrawer, setShowRightDrawer] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [showStepper, setShowStepper] = useState(false)

  useEffect(() => {
    if (deepLinkedJD && activeRightTab !== 'job-description') {
      setActiveRightTab('job-description')
    }
  }, [deepLinkedJD])

  useEffect(() => {
    const navbar = document.querySelector('header')
    const footer = document.querySelector('footer')
    if (navbar) navbar.style.display = 'none'
    if (footer) footer.style.display = 'none'
    
    return () => {
      if (navbar) navbar.style.display = ''
      if (footer) footer.style.display = ''
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem('editorStepperSeen')
    if (!seen) {
      setShowStepper(true)
    }
  }, [])

  useEffect(() => {
    if (showLeftDrawer || showRightDrawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showLeftDrawer, showRightDrawer])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary-50/30 via-white to-primary-50/20">
      <TopNavigationBar 
        onSaveResume={onSaveResume}
        onUploadResume={onUploadResume}
        isAuthenticated={isAuthenticated}
        onMenuClick={() => setShowLeftDrawer(true)}
        onRightPanelClick={() => setShowRightDrawer(true)}
        onActionsClick={onActionsClick}
        focusMode={focusMode}
        onFocusModeToggle={() => setFocusMode(!focusMode)}
      />

      <div className="flex flex-1 overflow-hidden mt-14">
        <ModernLeftSidebar 
          onViewChange={onViewChange} 
          currentView={currentView}
          onCollapseChange={setLeftSidebarCollapsed}
          onAIContentWizard={onAIContentWizard}
          onOpenCoverLetter={onOpenCoverLetter}
          onTemplatesClick={onTemplatesClick}
          userName={userName}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          onSignIn={onSignIn}
          isMobileDrawer={showLeftDrawer}
          onCloseDrawer={() => setShowLeftDrawer(false)}
        />

        <div className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out h-full ${
          focusMode 
            ? 'flex justify-center' 
            : 'lg:flex-[55]'
        } ${leftSidebarCollapsed && !showLeftDrawer ? 'lg:ml-0' : ''}`}>
          <div className={`w-full h-full transition-all duration-300 ease-in-out ${
            focusMode ? 'max-w-[700px]' : ''
          }`}>
          {currentView === 'editor' ? (
            <div className="h-full overflow-y-auto bg-gradient-to-b from-primary-50/20 to-transparent pb-20 lg:pb-0">
              <div className="hidden lg:block sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-border-subtle">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Editor Actions
                  </div>
                  <div className="flex items-center gap-2">
                    {onExport && (
                      <button
                        onClick={() => onExport('pdf')}
                        disabled={!resumeData.name || isExporting}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-all"
                      >
                        Export PDF
                      </button>
                    )}
                    {onShareResume && (
                      <button
                        onClick={onShareResume}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                      >
                        Share
                      </button>
                    )}
                    {onSaveResume && isAuthenticated && (
                      <button
                        onClick={onSaveResume}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {showStepper && !focusMode && (
                <div className="mx-4 mt-4 rounded-xl border border-border-subtle bg-white/90 backdrop-blur-sm shadow-sm">
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-text-primary">Quick start</div>
                        <div className="text-xs text-text-muted">Follow this flow to finish a strong resume.</div>
                      </div>
                      <button
                        onClick={() => {
                          setShowStepper(false)
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('editorStepperSeen', '1')
                          }
                        }}
                        className="text-xs font-semibold text-text-muted hover:text-text-primary"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      {['Upload', 'Review', 'Variables', 'Template', 'Export'].map((step, index) => (
                        <div
                          key={step}
                          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-text-secondary"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold">
                            {index + 1}
                          </span>
                          <span className="font-medium">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {onNewResume && (
                        <button
                          onClick={onNewResume}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                        >
                          New Resume
                        </button>
                      )}
                      {onUploadResume && (
                        <button
                          onClick={onUploadResume}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                        >
                          Upload Resume
                        </button>
                      )}
                      {onTemplatesClick && (
                        <button
                          onClick={onTemplatesClick}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                        >
                          Pick Template
                        </button>
                      )}
                      {onExport && (
                        <button
                          onClick={() => onExport('pdf')}
                          disabled={!resumeData.name || isExporting}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-all"
                        >
                          Export PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <VisualResumeEditor
                data={resumeData}
                onChange={onResumeUpdate || (() => {})}
                template={template}
                onAddContent={onAddContent}
                roomId={roomId}
                onAddComment={onAddComment}
                onResolveComment={onResolveComment}
                onDeleteComment={onDeleteComment}
                onCreateRoom={onCreateRoom}
                onJoinRoom={onJoinRoom}
                onLeaveRoom={onLeaveRoom}
                isConnected={isConnected}
                activeUsers={activeUsers}
                onViewChange={onViewChange}
                onAIImprove={onAIImprove}
                hideSidebar={true}
              />
            </div>
          ) : currentView === 'jobs' ? (
            <div className="h-full overflow-y-auto">
              <JobsView onBack={() => onViewChange?.('editor')} />
            </div>
          ) : currentView === 'resumes' ? (
            <div className="h-full overflow-y-auto">
              <ResumesView onBack={() => onViewChange?.('editor')} />
            </div>
          ) : null}
          </div>
        </div>

        {currentView === 'editor' && (
          <>
            <div className={`hidden lg:block overflow-hidden h-full transition-all duration-300 ease-in-out ${
              focusMode 
                ? 'w-0 opacity-0 pointer-events-none overflow-hidden' 
                : 'lg:flex-[45] opacity-100'
            }`}>
              <RightPanel 
                activeTab={activeRightTab} 
                onTabChange={setActiveRightTab}
                leftSidebarCollapsed={leftSidebarCollapsed}
                onResumeUpdate={onResumeUpdate}
                onAIImprove={onAIImprove}
                resumeData={resumeData}
                template={template}
                templateConfig={templateConfig}
                deepLinkedJD={deepLinkedJD}
                activeJobDescriptionId={activeJobDescriptionId}
                onViewChange={onViewChange}
                onSelectJobDescriptionId={onSelectJobDescriptionId}
              />
            </div>
            
            {showRightDrawer && (
              <div className="lg:hidden fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRightDrawer(false)} />
                <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-md bg-white shadow-[0_12px_48px_rgba(15,23,42,0.15)]">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-transparent">
                      <h2 className="text-lg font-semibold text-text-primary">AI Tools</h2>
                      <Tooltip text="Close AI Tools panel" color="gray" position="left">
                        <button
                          onClick={() => setShowRightDrawer(false)}
                          className="p-2 hover:bg-primary-50/50 rounded-lg touch-target transition-all duration-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tooltip>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <RightPanel 
                        activeTab={activeRightTab} 
                        onTabChange={setActiveRightTab}
                        leftSidebarCollapsed={leftSidebarCollapsed}
                        onResumeUpdate={onResumeUpdate}
                        onAIImprove={onAIImprove}
                        resumeData={resumeData}
                        template={template}
                        templateConfig={templateConfig}
                        deepLinkedJD={deepLinkedJD}
                        activeJobDescriptionId={activeJobDescriptionId}
                        onViewChange={onViewChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {currentView === 'editor' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-subtle z-40 safe-area-inset-bottom shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-around px-2 py-2">
            <Tooltip text="Open navigation menu" color="gray" position="top">
              <button
                onClick={() => setShowLeftDrawer(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target transition-all duration-200 hover:text-primary-600"
              >
                <Menu className="w-5 h-5" />
                <span className="font-medium">Menu</span>
              </button>
            </Tooltip>
            {onActionsClick && (
              <Tooltip text="Open actions drawer" color="blue" position="top">
                <button
                  onClick={onActionsClick}
                  className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target transition-all duration-200 hover:text-primary-600"
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">Actions</span>
                </button>
              </Tooltip>
            )}
            <Tooltip text="Open AI Tools panel" color="purple" position="top">
              <button
                onClick={() => setShowRightDrawer(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target transition-all duration-200 hover:text-primary-600"
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium">Preview</span>
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
}

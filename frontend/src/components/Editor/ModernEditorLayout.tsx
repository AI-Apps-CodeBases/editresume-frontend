'use client'
import React, { useState, useEffect } from 'react'
import TopNavigationBar from './TopNavigationBar'
import ModernLeftSidebar from './ModernLeftSidebar'
import VisualResumeEditor from './VisualResumeEditor'
import RightPanel from './RightPanel'
import JobsView from './JobsView'
import ResumesView from '@/components/Resume/ResumesView'
import Tooltip from '@/components/Shared/Tooltip'

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
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech' | 'classic'
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
}: ModernEditorLayoutProps) {
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'job-description' | 'suggestions'>('preview')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showLeftDrawer, setShowLeftDrawer] = useState(false)
  const [showRightDrawer, setShowRightDrawer] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [previewMode, setPreviewMode] = useState<'side-by-side' | 'fullscreen'>('side-by-side')
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [matchResult, setMatchResult] = useState<any>(null)

  useEffect(() => {
    if (deepLinkedJD && activeRightTab !== 'job-description') {
      setActiveRightTab('job-description')
    }
  }, [deepLinkedJD])

  // Load match result from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMatchResult = localStorage.getItem('currentMatchResult')
        if (savedMatchResult) {
          setMatchResult(JSON.parse(savedMatchResult))
        }
      } catch (e) {
        console.error('Failed to load match result:', e)
      }
    }
  }, [])

  // Listen for match result updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedMatchResult = localStorage.getItem('currentMatchResult')
        if (savedMatchResult) {
          setMatchResult(JSON.parse(savedMatchResult))
        }
      } catch (e) {
        console.error('Failed to load match result:', e)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check periodically for same-tab updates
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary-50/20 via-white to-primary-50/10">
      <TopNavigationBar 
        onNewResume={onNewResume}
        onSaveResume={onSaveResume}
        onUploadResume={onUploadResume}
        onExport={onExport}
        isExporting={isExporting}
        hasResumeName={!!resumeData.name}
        hasCoverLetter={hasCoverLetter}
        userName={userName}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onSignIn={onSignIn}
        onShareResume={onShareResume}
        onMenuClick={() => setShowLeftDrawer(true)}
        onRightPanelClick={() => setShowRightDrawer(true)}
        focusMode={focusMode}
        onFocusModeToggle={() => setFocusMode(!focusMode)}
        resumeData={resumeData}
        previewMode={previewMode}
        onPreviewModeToggle={() => setPreviewMode(prev => prev === 'side-by-side' ? 'fullscreen' : 'side-by-side')}
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
          resumeData={resumeData}
          onSectionClick={(sectionId) => {
            const element = document.querySelector(`[data-section-id="${sectionId}"]`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        />

        <div className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out h-full ${
          focusMode || previewMode === 'fullscreen'
            ? 'flex justify-center' 
            : 'lg:flex-[55]'
        } ${leftSidebarCollapsed && !showLeftDrawer ? 'lg:ml-0' : ''}`}>
          <div className={`w-full h-full transition-all duration-300 ease-in-out ${
            focusMode || previewMode === 'fullscreen' ? 'max-w-[800px]' : ''
          }`}>
          {currentView === 'editor' ? (
            <div className="h-full overflow-y-auto bg-gradient-to-b from-primary-50/10 to-transparent px-4 sm:px-6 lg:px-8 relative">

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
              focusMode || previewMode === 'fullscreen'
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
                onMatchScoreChange={(score, analyzing) => {
                  setMatchScore(score)
                  setIsAnalyzing(analyzing)
                }}
                onExport={onExport}
                isExporting={isExporting}
                hasResumeName={!!resumeData.name}
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
                        onMatchScoreChange={(score, analyzing) => {
                          setMatchScore(score)
                          setIsAnalyzing(analyzing)
                        }}
                        onExport={onExport}
                        isExporting={isExporting}
                        hasResumeName={!!resumeData.name}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

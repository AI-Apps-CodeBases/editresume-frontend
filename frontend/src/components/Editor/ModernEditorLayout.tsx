'use client'
import React, { useState, useEffect } from 'react'
import TopNavigationBar from './TopNavigationBar'
import ModernLeftSidebar from './ModernLeftSidebar'
import VisualResumeEditor from './VisualResumeEditor'
import RightPanel from './RightPanel'
import JobsView from './JobsView'
import ResumesView from '@/components/Resume/ResumesView'

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
}: ModernEditorLayoutProps) {
  const [activeRightTab, setActiveRightTab] = useState<'live' | 'match' | 'analysis' | 'grammar' | 'comments'>('live')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showLeftDrawer, setShowLeftDrawer] = useState(false)
  const [showRightDrawer, setShowRightDrawer] = useState(false)

  useEffect(() => {
    if (deepLinkedJD && activeRightTab !== 'match') {
      setActiveRightTab('match')
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
    <div className="flex flex-col h-screen bg-gray-50">
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
      />

      <div className="flex flex-1 overflow-hidden mt-[70px] lg:mt-[120px]">
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

        <div className={`flex-1 lg:flex-[3] overflow-hidden transition-all duration-300 h-full ${leftSidebarCollapsed && !showLeftDrawer ? 'lg:ml-0' : ''}`}>
          {currentView === 'editor' ? (
            <div className="h-full overflow-y-auto bg-gray-50 pb-20 lg:pb-0">
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
            <JobsView onBack={() => onViewChange?.('editor')} />
          ) : currentView === 'resumes' ? (
            <ResumesView onBack={() => onViewChange?.('editor')} />
          ) : null}
        </div>

        {currentView === 'editor' && (
          <>
            <div className="hidden lg:block lg:flex-[2] overflow-hidden h-full">
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
              />
            </div>
            
            {showRightDrawer && (
              <div className="lg:hidden fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowRightDrawer(false)} />
                <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-md bg-white shadow-xl">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h2 className="text-lg font-semibold">AI Tools</h2>
                      <button
                        onClick={() => setShowRightDrawer(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg touch-target"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom shadow-lg">
          <div className="flex items-center justify-around px-2 py-2">
            <button
              onClick={() => setShowLeftDrawer(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target"
            >
              <span className="text-lg">📝</span>
              <span className="font-medium">Menu</span>
            </button>
            <button
              onClick={() => setShowRightDrawer(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target"
            >
              <span className="text-lg">⚡</span>
              <span className="font-medium">AI Tools</span>
            </button>
            <button
              onClick={() => onExport?.('pdf')}
              disabled={!resumeData.name || isExporting}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target disabled:opacity-50"
            >
              <span className="text-lg">📤</span>
              <span className="font-medium">Export</span>
            </button>
            {onSaveResume && isAuthenticated && (
              <button
                onClick={onSaveResume}
                className="flex flex-col items-center gap-1 px-3 py-2 text-xs touch-target"
              >
                <span className="text-lg">💾</span>
                <span className="font-medium">Save</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


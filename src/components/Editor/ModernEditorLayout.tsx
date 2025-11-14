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
  onAIContentWizard?: (contentType: 'job' | 'project' | 'skill' | 'education') => void
  // VisualResumeEditor props
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
  // TopNavigationBar props
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
}

export default function ModernEditorLayout({
  resumeData,
  onResumeUpdate,
  onViewChange,
  currentView = 'editor',
  template = 'clean',
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
}: ModernEditorLayoutProps) {
  const [activeRightTab, setActiveRightTab] = useState<'live' | 'match' | 'analysis' | 'grammar' | 'comments'>('live')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)

  // Switch to match tab when job description is available
  useEffect(() => {
    if (deepLinkedJD && activeRightTab !== 'match') {
      setActiveRightTab('match')
    }
  }, [deepLinkedJD])

  // Hide navbar and footer when mounted
  useEffect(() => {
    const navbar = document.querySelector('header')
    const footer = document.querySelector('footer')
    if (navbar) navbar.style.display = 'none'
    if (footer) footer.style.display = 'none'
    
    return () => {
      // Restore navbar and footer when leaving
      if (navbar) navbar.style.display = ''
      if (footer) footer.style.display = ''
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navigation Bar */}
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
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden mt-14">
        {/* Left Sidebar */}
        <ModernLeftSidebar 
          onViewChange={onViewChange} 
          currentView={currentView}
          onCollapseChange={setLeftSidebarCollapsed}
          onAIContentWizard={onAIContentWizard}
        />

        {/* Center: Resume Editor Canvas - 60% width */}
        <div className={`flex-[3] overflow-hidden transition-all duration-300 h-full ${leftSidebarCollapsed ? 'ml-0' : ''}`}>
          {currentView === 'editor' ? (
            <div className="h-full overflow-y-auto bg-gray-50">
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

        {/* Right Panel: AI Analysis - 40% width */}
        {currentView === 'editor' && (
          <div className="flex-[2] overflow-hidden h-full">
            <RightPanel 
              activeTab={activeRightTab} 
              onTabChange={setActiveRightTab}
              leftSidebarCollapsed={leftSidebarCollapsed}
              onResumeUpdate={onResumeUpdate}
              onAIImprove={onAIImprove}
              resumeData={resumeData}
              template={template}
              deepLinkedJD={deepLinkedJD}
              activeJobDescriptionId={activeJobDescriptionId}
            />
          </div>
        )}
      </div>
    </div>
  )
}


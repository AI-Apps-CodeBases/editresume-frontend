'use client'
import React, { useState } from 'react'
import TopNavigationBar from './TopNavigationBar'
import ModernLeftSidebar from './ModernLeftSidebar'
import ResumeEditorCanvas from './ResumeEditorCanvas'
import RightPanel from './RightPanel'

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
}

export default function ModernEditorLayout({
  resumeData,
  onResumeUpdate,
  onViewChange,
  currentView = 'editor',
  template = 'clean',
}: ModernEditorLayoutProps) {
  const [activeTopTab, setActiveTopTab] = useState<'builder' | 'jobs' | 'resumes' | 'collaboration' | 'analytics'>('builder')
  const [activeRightTab, setActiveRightTab] = useState<'live' | 'match' | 'analysis' | 'grammar' | 'comments'>('analysis')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)

  const handleTopTabChange = (tab: 'builder' | 'jobs' | 'resumes' | 'collaboration' | 'analytics') => {
    setActiveTopTab(tab)
    if (tab === 'jobs' || tab === 'resumes') {
      onViewChange?.(tab)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <TopNavigationBar activeTab={activeTopTab} onTabChange={handleTopTabChange} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden mt-14">
        {/* Left Sidebar */}
        <ModernLeftSidebar 
          onViewChange={onViewChange} 
          currentView={currentView}
          onCollapseChange={setLeftSidebarCollapsed}
        />

        {/* Center: Resume Editor Canvas */}
        <div className="flex-1 overflow-hidden transition-all duration-300 h-full">
          {currentView === 'editor' ? (
            <ResumeEditorCanvas
              resumeData={resumeData}
              onResumeUpdate={onResumeUpdate}
              onSectionGenerate={(sectionId) => {
                console.log('Generate section:', sectionId)
                // Implement AI generation logic here
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {currentView === 'jobs' && <p>Jobs view coming soon...</p>}
              {currentView === 'resumes' && <p>Resumes view coming soon...</p>}
            </div>
          )}
        </div>

        {/* Right Panel: AI Analysis */}
        {currentView === 'editor' && (
          <RightPanel 
            activeTab={activeRightTab} 
            onTabChange={setActiveRightTab}
            leftSidebarCollapsed={leftSidebarCollapsed}
            onResumeUpdate={onResumeUpdate}
            resumeData={resumeData}
            template={template}
          />
        )}
      </div>
    </div>
  )
}


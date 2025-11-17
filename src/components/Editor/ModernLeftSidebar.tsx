'use client'
import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface ModernLeftSidebarProps {
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  currentView?: 'editor' | 'jobs' | 'resumes'
  onCollapseChange?: (collapsed: boolean) => void
  onAIContentWizard?: (contentType: 'job' | 'project' | 'skill' | 'education') => void
  onTemplatesClick?: () => void
}

export default function ModernLeftSidebar({ onViewChange, currentView = 'editor', onCollapseChange, onAIContentWizard, onTemplatesClick }: ModernLeftSidebarProps) {
  const { isAuthenticated } = useAuth()
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
      if (aiTool && onAIContentWizard) {
        onAIContentWizard(aiTool.contentType)
      }
    } else if (itemId === 'templates') {
      onTemplatesClick?.()
    }
  }

  if (collapsed) {
    return (
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4">
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
    </div>
  )
}


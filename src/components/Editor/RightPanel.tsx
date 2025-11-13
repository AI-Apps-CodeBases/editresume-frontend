'use client'
import React, { useState } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import GrammarStylePanel from '@/components/AI/GrammarStylePanel'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'

interface RightPanelProps {
  activeTab?: 'live' | 'match' | 'analysis' | 'grammar' | 'comments'
  onTabChange?: (tab: 'live' | 'match' | 'analysis' | 'grammar' | 'comments') => void
  leftSidebarCollapsed?: boolean
  onResumeUpdate?: (updatedResume: any) => void
  resumeData?: {
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
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech'
}

export default function RightPanel({ 
  activeTab = 'analysis', 
  onTabChange,
  leftSidebarCollapsed = false,
  onResumeUpdate,
  resumeData,
  template = 'clean'
}: RightPanelProps) {
  const [atsScore] = useState(68)
  const [aiImprovements] = useState(2)

  const tabs = [
    { id: 'live' as const, label: 'Live', icon: '⚡' },
    { id: 'match' as const, label: 'Match JD', icon: '🎯' },
    { id: 'analysis' as const, label: 'Analysis', icon: '📊' },
    { id: 'grammar' as const, label: 'Grammar', icon: '✍️' },
    { id: 'comments' as const, label: 'Comments', icon: '💬' },
  ]

  const suggestions = [
    {
      id: '1',
      title: 'Highlight Leadership Experience',
      impact: 'HIGH' as const,
      description: 'Emphasize your leadership roles and team management experience.',
      suggestion: 'Add specific examples of leading teams or projects.',
      example: 'Led a team of 5 developers to deliver...',
    },
    {
      id: '2',
      title: 'Remove Special Characters',
      impact: 'MEDIUM' as const,
      description: 'Some special characters may not parse correctly in ATS systems.',
      suggestion: 'Replace special characters with standard text equivalents.',
      example: 'Use "and" instead of "&"',
    },
    {
      id: '3',
      title: 'Add Quantifiable Metrics',
      impact: 'HIGH' as const,
      description: 'Include specific numbers and percentages to demonstrate impact.',
      suggestion: 'Add metrics like "increased revenue by 25%" or "managed 10+ projects".',
      example: 'Improved performance by 40%...',
    },
  ]

  const getImpactColor = (impact: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (impact) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'LOW':
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col h-full custom-scrollbar transition-all duration-300 ${
      leftSidebarCollapsed ? 'w-[600px]' : 'w-[500px]'
    }`}>
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'analysis' && (
          <div className="p-4 space-y-4">
            {/* ATS Score Card */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-gray-900 mb-2">{atsScore}</div>
                <div className="text-sm text-gray-600">out of 100</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enhanced ATS Analysis & AI Improvements
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Good ATS compatibility with room for improvement.
              </p>
              {aiImprovements > 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-200 rounded-full">
                  <span>🚀</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {aiImprovements} AI improvements available to boost your score!
                  </span>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                AI-Powered Improvement Suggestions
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-semibold text-gray-900">{suggestion.title}</h5>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getImpactColor(
                          suggestion.impact
                        )}`}
                      >
                        {suggestion.impact}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Suggestion:</div>
                        <div className="text-xs text-gray-600 pl-2 border-l-2 border-blue-200">
                          {suggestion.suggestion}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Example:</div>
                        <div className="text-xs text-gray-600 pl-2 border-l-2 border-green-200">
                          {suggestion.example}
                        </div>
                      </div>
                    </div>
                    <button className="w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                      Apply with AI
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grammar' && resumeData && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <GrammarStylePanel
              resumeData={resumeData}
              onApplySuggestion={(sectionId, bulletId, newText) => {
                if (onResumeUpdate && resumeData) {
                  if (sectionId === 'summary') {
                    onResumeUpdate({
                      ...resumeData,
                      summary: newText
                    })
                  } else {
                    const updatedSections = resumeData.sections.map(section => {
                      if (section.id === sectionId) {
                        return {
                          ...section,
                          bullets: section.bullets.map(bullet =>
                            bullet.id === bulletId ? { ...bullet, text: newText } : bullet
                          )
                        }
                      }
                      return section
                    })
                    onResumeUpdate({
                      ...resumeData,
                      sections: updatedSections
                    })
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
                <button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  + Add Comment
                </button>
              </div>
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Add comments to collaborate with your team</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'match' && resumeData && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <JobDescriptionMatcher
              resumeData={resumeData}
              onResumeUpdate={onResumeUpdate}
              standalone={false}
            />
          </div>
        )}

        {activeTab === 'live' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
            {resumeData && (resumeData.name || resumeData.sections?.length > 0) ? (
              <div className="flex flex-col h-full">
                <div className="mb-3 sticky top-0 bg-gray-50 px-4 pt-3 pb-2 z-10 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700">Live Preview</span>
                  </div>
                  <p className="text-xs text-gray-500">Real-time CV preview</p>
                </div>
                <div className="flex-1 flex items-start justify-center p-3 overflow-y-auto custom-scrollbar">
                  <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="transform scale-[0.95] origin-top w-[105.26%] mx-auto">
                      <PreviewPanel
                        data={{
                          name: resumeData.name || '',
                          title: resumeData.title || '',
                          email: resumeData.email || '',
                          phone: resumeData.phone || '',
                          location: resumeData.location || '',
                          summary: resumeData.summary || '',
                          sections: (resumeData.sections || []).map(section => ({
                            ...section,
                            bullets: section.bullets || [],
                          })),
                        }}
                        replacements={{}}
                        template={template}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm text-gray-600 mb-1">No resume data</p>
                  <p className="text-xs text-gray-500">Start editing to see live preview</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


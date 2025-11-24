'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import GrammarStylePanel from '@/components/AI/GrammarStylePanel'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import config from '@/lib/config'

interface RightPanelProps {
  activeTab?: 'live' | 'match' | 'analysis' | 'grammar' | 'comments'
  onTabChange?: (tab: 'live' | 'match' | 'analysis' | 'grammar' | 'comments') => void
  leftSidebarCollapsed?: boolean
  onResumeUpdate?: (updatedResume: any) => void
  onAIImprove?: (text: string, context?: string) => Promise<string>
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
  templateConfig?: any
  deepLinkedJD?: string | null
  activeJobDescriptionId?: number | null
}

export default function RightPanel({ 
  activeTab = 'analysis', 
  onTabChange,
  leftSidebarCollapsed = false,
  onResumeUpdate,
  onAIImprove,
  resumeData,
  template = 'clean',
  templateConfig,
  deepLinkedJD,
  activeJobDescriptionId
}: RightPanelProps) {
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [aiImprovements, setAiImprovements] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplyingImprovement, setIsApplyingImprovement] = useState<string | null>(null)
  const [atsSuggestions, setAtsSuggestions] = useState<any[]>([])
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate ATS score when resumeData changes
  const calculateATSScore = useCallback(async () => {
    if (!resumeData || !resumeData.name && !resumeData.sections?.length) {
      setAtsScore(null)
      setAiImprovements(0)
      setAtsSuggestions([])
      return
    }

    setIsAnalyzing(true)
    try {
      const cleanedResumeData = {
        name: resumeData.name || '',
        title: resumeData.title || '',
        email: resumeData.email || '',
        phone: resumeData.phone || '',
        location: resumeData.location || '',
        summary: resumeData.summary || '',
        sections: (resumeData.sections || []).map((section: any) => ({
          id: section.id,
          title: section.title,
          bullets: (section.bullets || []).map((bullet: any) => ({
            id: bullet.id,
            text: bullet.text,
            params: {}
          }))
        }))
      }

      const response = await fetch(`${config.apiBase}/api/ai/enhanced_ats_score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: cleanedResumeData,
          job_description: '', // Optional
          target_role: '', // Optional
          industry: '' // Optional
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAtsScore(result.score || 0)
          setAiImprovements(result.ai_improvements?.length || 0)
          setAtsSuggestions(result.suggestions || [])
        } else {
          console.error('ATS score calculation failed:', result.error)
          setAtsScore(null)
          setAiImprovements(0)
        }
      } else {
        console.error('Failed to fetch ATS score:', response.statusText)
        setAtsScore(null)
        setAiImprovements(0)
      }
    } catch (error) {
      console.error('Error calculating ATS score:', error)
      setAtsScore(null)
      setAiImprovements(0)
    } finally {
      setIsAnalyzing(false)
    }
  }, [resumeData])

  // Debounced effect to recalculate score when resumeData changes
  useEffect(() => {
    // Clear previous timeout
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current)
    }

    // Set new timeout for debounced analysis
    analyzeTimeoutRef.current = setTimeout(() => {
      calculateATSScore()
    }, 1000) // Wait 1 second after last change

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current)
      }
    }
  }, [calculateATSScore])

  // Initial calculation when component mounts
  useEffect(() => {
    calculateATSScore()
  }, [calculateATSScore]) // Recalculate when calculateATSScore changes

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

  const handleApplyImprovement = async (suggestion: typeof suggestions[0]) => {
    if (!resumeData || !onResumeUpdate) return

    setIsApplyingImprovement(suggestion.id)
    try {
      // Map suggestion titles to API strategy names (matching backend strategy_mapping)
      // Backend maps: "leadership" -> "leadership_emphasis", "achievements" -> "quantified_achievements", "ats" -> "ats_compatibility"
      const strategyMap: Record<string, string> = {
        'Highlight Leadership Experience': 'leadership', // Backend will map to "leadership_emphasis"
        'Remove Special Characters': 'ats', // Backend will map to "ats_compatibility"
        'Add Quantifiable Metrics': 'achievements', // Backend will map to "quantified_achievements"
      }

      const strategy = strategyMap[suggestion.title] || suggestion.title.toLowerCase().replace(/\s+/g, '_')

      const cleanedResumeData = {
        name: resumeData.name || '',
        title: resumeData.title || '',
        email: resumeData.email || '',
        phone: resumeData.phone || '',
        location: resumeData.location || '',
        summary: resumeData.summary || '',
        sections: (resumeData.sections || []).map((section: any) => ({
          id: section.id,
          title: section.title,
          bullets: (section.bullets || []).map((bullet: any) => ({
            id: bullet.id,
            text: bullet.text,
            params: {}
          }))
        }))
      }

      console.log('Applying improvement with strategy:', strategy)
      console.log('Resume data:', cleanedResumeData)

      const response = await fetch(`${config.apiBase}/api/ai/apply_improvement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: cleanedResumeData,
          job_description: '', // Optional, can be empty
          target_role: '', // Optional, can be empty
          industry: '', // Optional, can be empty
          strategy: strategy
        }),
      })

      console.log('API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()
      console.log('Apply improvement result:', result)
      
      if (result.success) {
        // API returns improved_content as text, not updated_resume
        // Show success message with improved content
        const { showCustomAlert } = await import('@/lib/modals')
        await showCustomAlert(
          `AI Improvement Applied!\n\n${result.improved_content || `Applied "${suggestion.title}" improvement successfully!`}`,
          {
            title: 'AI Improvement Applied!',
            type: 'success',
            icon: '✨'
          }
        )
        
        // Recalculate ATS score after improvement
        setTimeout(() => {
          calculateATSScore()
        }, 500)
        
        // Note: The API returns improved_content as text, not a structured resume object
        // The user can manually apply the suggestions or we could enhance this to auto-apply
        // For now, we just show the improved content in the alert
      } else {
        throw new Error(result.error || result.suggestions?.[0] || 'Failed to apply improvement')
      }
    } catch (error) {
      console.error('Failed to apply improvement:', error)
      const { showCustomAlert } = await import('@/lib/modals')
      showCustomAlert(
        `Failed to apply "${suggestion.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        { title: 'Error', type: 'error' }
      )
    } finally {
      setIsApplyingImprovement(null)
    }
  }

  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full w-full custom-scrollbar transition-all duration-300">
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
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                  <p className="text-sm text-gray-600">Analyzing resume...</p>
                </div>
              ) : atsScore !== null ? (
                <>
                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold text-gray-900 mb-2">{atsScore}</div>
                    <div className="text-sm text-gray-600">out of 100</div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Enhanced ATS Analysis & AI Improvements
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    {atsScore >= 80 
                      ? 'Excellent ATS compatibility! Your resume is well-optimized.'
                      : atsScore >= 60
                      ? 'Good ATS compatibility with room for improvement.'
                      : 'Your resume needs optimization for better ATS compatibility.'
                    }
                  </p>
                  {aiImprovements > 0 && (
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-200 rounded-full">
                      <span>🚀</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {aiImprovements} AI improvement{aiImprovements > 1 ? 's' : ''} available to boost your score!
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => calculateATSScore()}
                    className="mt-4 w-full px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
                  >
                    🔄 Refresh Analysis
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 mb-4">No resume data to analyze</p>
                  <p className="text-xs text-gray-500">Start editing your resume to see ATS score</p>
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
                    <button 
                      onClick={() => handleApplyImprovement(suggestion)}
                      disabled={isApplyingImprovement === suggestion.id}
                      className="w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplyingImprovement === suggestion.id ? 'Applying...' : 'Apply with AI'}
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
              initialJobDescription={deepLinkedJD || undefined}
              currentJobDescriptionId={activeJobDescriptionId || undefined}
            />
          </div>
        )}

        {activeTab === 'live' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
            {resumeData && (resumeData.name || resumeData.sections?.length > 0) ? (
              <div className="flex flex-col h-full">
                <div className="mb-3 sticky top-0 bg-gray-50 px-4 pt-3 pb-2 z-10 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-700">Live Preview</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">
                        {template}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Auto-save enabled</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Real-time CV preview</p>
                </div>
                <div className="flex-1 flex items-start justify-center p-3 overflow-y-auto custom-scrollbar">
                  <PreviewPanel
                    key={`preview-${template}-${JSON.stringify(resumeData?.sections?.map(s => s.id))}`}
                    data={{
                      ...resumeData,
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
                      fieldsVisible: (resumeData as any).fieldsVisible || {},
                    }}
                    replacements={{}}
                    template={template}
                    templateConfig={templateConfig}
                  />
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


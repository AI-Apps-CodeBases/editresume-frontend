'use client'
import { useState, useEffect } from 'react'

import config from '@/lib/config';
interface ResumeData {
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

interface ImprovementSuggestion {
  strategy: string
  title: string
  description: string
  priority: string
  impact_score: number
  reasoning: string
  example: string
  ai_prompt: string
}

interface ImprovementResult {
  success: boolean
  total_improvements: number
  high_priority: ImprovementSuggestion[]
  medium_priority: ImprovementSuggestion[]
  low_priority: ImprovementSuggestion[]
  all_improvements: ImprovementSuggestion[]
  error?: string
}

interface Props {
  resumeData: ResumeData
  jobDescription?: string
  targetRole?: string
  industry?: string
  onClose: () => void
}

export default function AIImprovementWidget({ 
  resumeData, 
  jobDescription, 
  targetRole, 
  industry, 
  onClose 
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [improvementResult, setImprovementResult] = useState<ImprovementResult | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedImprovement, setSelectedImprovement] = useState<ImprovementSuggestion | null>(null)
  const [isApplyingImprovement, setIsApplyingImprovement] = useState(false)

  const getImprovementSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/improvement_suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: resumeData,
          job_description: jobDescription,
          target_role: targetRole,
          industry: industry
        }),
      })

      const result = await response.json()
      console.log('AI Improvement Result:', result)
      setImprovementResult(result)
    } catch (error) {
      console.error('AI improvement suggestions error:', error)
      setImprovementResult({
        success: false,
        total_improvements: 0,
        high_priority: [],
        medium_priority: [],
        low_priority: [],
        all_improvements: [],
        error: 'Network error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyImprovement = async (improvement: ImprovementSuggestion) => {
    setIsApplyingImprovement(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/apply_improvement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: resumeData,
          job_description: jobDescription,
          target_role: targetRole,
          industry: industry,
          strategy: improvement.strategy
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(`AI Improvement Applied!\n\n${result.improved_content}`)
      } else {
        alert(`Failed to apply improvement: ${result.error}`)
      }
    } catch (error) {
      console.error('Improvement application error:', error)
      alert('Failed to apply improvement. Please try again.')
    } finally {
      setIsApplyingImprovement(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getImpactColor = (score: number) => {
    if (score >= 8) return 'text-red-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getFilteredImprovements = () => {
    if (!improvementResult) return []
    
    switch (selectedPriority) {
      case 'high': return improvementResult.high_priority
      case 'medium': return improvementResult.medium_priority
      case 'low': return improvementResult.low_priority
      default: return improvementResult.all_improvements
    }
  }

  const getStrategyIcon = (strategy: string) => {
    const icons: Record<string, string> = {
      'professional_summary': '📝',
      'quantified_achievements': '📊',
      'job_alignment': '🎯',
      'career_transition': '🔄',
      'content_audit': '🔍',
      'modern_format': '📐',
      'skills_enhancement': '🛠️',
      'leadership_emphasis': '👥',
      'contact_optimization': '📞',
      'ats_compatibility': '🤖'
    }
    return icons[strategy || ''] || '✨'
  }

  const getStrategyDescription = (strategy: string) => {
    const descriptions: Record<string, string> = {
      'professional_summary': 'Enhance your professional summary to stand out',
      'quantified_achievements': 'Add measurable accomplishments with numbers',
      'job_alignment': 'Align your resume with specific job requirements',
      'career_transition': 'Highlight transferable skills for career changes',
      'content_audit': 'Audit and improve content quality and impact',
      'modern_format': 'Optimize resume format and structure',
      'skills_enhancement': 'Create compelling technical skills sections',
      'leadership_emphasis': 'Highlight leadership and influence experience',
      'contact_optimization': 'Optimize contact information and headlines',
      'ats_compatibility': 'Improve ATS system compatibility'
    }
    return descriptions[strategy || ''] || 'General improvement'
  }

  useEffect(() => {
    if (resumeData && Object.keys(resumeData).length > 0) {
      getImprovementSuggestions()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered Resume Improvements</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your resume with AI-powered insights...</p>
            </div>
          )}

          {improvementResult && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-900">Improvement Analysis Complete</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    {improvementResult.total_improvements} Suggestions
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{improvementResult.high_priority.length}</div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{improvementResult.medium_priority.length}</div>
                    <div className="text-sm text-gray-600">Medium Priority</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{improvementResult.low_priority.length}</div>
                    <div className="text-sm text-gray-600">Low Priority</div>
                  </div>
                </div>
              </div>

              {/* Priority Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPriority('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedPriority === 'all' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All ({improvementResult.total_improvements})
                </button>
                <button
                  onClick={() => setSelectedPriority('high')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedPriority === 'high' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  High ({improvementResult.high_priority.length})
                </button>
                <button
                  onClick={() => setSelectedPriority('medium')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedPriority === 'medium' 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Medium ({improvementResult.medium_priority.length})
                </button>
                <button
                  onClick={() => setSelectedPriority('low')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedPriority === 'low' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Low ({improvementResult.low_priority.length})
                </button>
              </div>

              {/* Improvements List */}
              <div className="space-y-4">
                {getFilteredImprovements().map((improvement, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getStrategyIcon(improvement.strategy)}</div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">{improvement.title || 'Improvement Suggestion'}</h4>
                          <p className="text-sm text-gray-600 mb-2">{getStrategyDescription(improvement.strategy)}</p>
                          <p className="text-gray-700">{improvement.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority || 'medium')}`}>
                          {(improvement.priority || 'medium').toUpperCase()}
                        </span>
                        <span className={`text-sm font-semibold ${getImpactColor(improvement.impact_score || 5)}`}>
                          Impact: {improvement.impact_score || 5}/10
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-1">Reasoning:</h5>
                        <p className="text-sm text-gray-700">{improvement.reasoning || 'No reasoning provided'}</p>
                      </div>
                      
                      {improvement.example && (
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-1">Example:</h5>
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            {improvement.example}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setSelectedImprovement(improvement)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        View AI Prompt
                      </button>
                      <button
                        onClick={() => applyImprovement(improvement)}
                        disabled={isApplyingImprovement}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-semibold"
                      >
                        {isApplyingImprovement ? 'Applying...' : 'Apply AI Fix'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={getImprovementSuggestions}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!improvementResult && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-600">No improvement suggestions available. Please try again.</p>
              <button
                onClick={getImprovementSuggestions}
                className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Get AI Suggestions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Prompt Modal */}
      {selectedImprovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">AI Improvement Prompt</h3>
                <button
                  onClick={() => setSelectedImprovement(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Improvement Strategy</h4>
                  <p className="text-gray-700">{selectedImprovement.title}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Prompt Used</h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                    {selectedImprovement.ai_prompt || 'No AI prompt available'}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Priority:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(selectedImprovement.priority || 'medium')}`}>
                      {(selectedImprovement.priority || 'medium').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Impact Score:</span>
                    <span className={`ml-2 font-semibold ${getImpactColor(selectedImprovement.impact_score || 5)}`}>
                      {selectedImprovement.impact_score || 5}/10
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => applyImprovement(selectedImprovement)}
                  disabled={isApplyingImprovement}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isApplyingImprovement ? 'Applying...' : 'Apply AI Fix'}
                </button>
                <button
                  onClick={() => setSelectedImprovement(null)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { useAuth } from '@/contexts/AuthContext'
import { getOrCreateGuestSessionId } from '@/lib/guestAuth'
import UpgradePrompt from '@/components/Shared/UpgradePrompt'
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
      params?: Record<string, any>
    }>
    params?: Record<string, any>
  }>
  fieldsVisible?: Record<string, boolean>
}

interface AIImprovement {
  category: string
  title: string
  description: string
  priority: string
  impact_score: number
  action_type: string
  specific_suggestion: string
  example?: string
}

interface EnhancedATSResult {
  success: boolean
  score: number
  suggestions: string[]
  details: {
    structure_analysis?: any
    keyword_analysis?: any
    quality_analysis?: any
    formatting_analysis?: any
  }
  ai_improvements: AIImprovement[]
  error?: string
}

interface Props {
  resumeData: ResumeData
  jobDescription?: string
  targetRole?: string
  industry?: string
  onClose: () => void
  inline?: boolean
}

export default function EnhancedATSScoreWidget({ 
  resumeData, 
  jobDescription, 
  targetRole, 
  industry, 
  onClose,
  inline = false
}: Props) {
  const { user, isAuthenticated } = useAuth()
  const { checkFeatureAvailability, refreshUsage } = useUsageTracking()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [atsResult, setAtsResult] = useState<EnhancedATSResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedImprovement, setSelectedImprovement] = useState<AIImprovement | null>(null)
  const [isApplyingImprovement, setIsApplyingImprovement] = useState(false)
  const [isImprovingATS, setIsImprovingATS] = useState(false)
  const [improvementResult, setImprovementResult] = useState<any>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [upgradePromptData, setUpgradePromptData] = useState<{
    currentUsage: number
    limit: number | null
    period: string
  } | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)

  const analyzeResume = async () => {
    // ATS scoring is always free - no usage limit check needed
    setIsAnalyzing(true)
    try {
      // Clean resume data - remove fieldsVisible and ensure params are compatible
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
          bullets: (section.bullets || [])
            .filter((bullet: any) => bullet?.params?.visible !== false)  // Filter out invisible bullets
            .map((bullet: any) => ({
              id: bullet.id,
              text: bullet.text,
              params: bullet.params || {}  // Preserve params instead of resetting
            }))
        }))
      };

      const sessionId = !isAuthenticated ? getOrCreateGuestSessionId() : undefined
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (isAuthenticated) {
        const { auth } = await import('@/lib/firebaseClient')
        const token = await auth.currentUser?.getIdToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }

      // Get previous score from localStorage or current result
      let prevScore: number | null = null
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('lastATSScore')
        if (stored) {
          try {
            prevScore = parseInt(stored, 10)
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      // Use current result score if available and no stored score
      if (prevScore === null && atsResult?.score !== undefined) {
        prevScore = atsResult.score
      }

      const response = await fetch(`${config.apiBase}/api/ai/enhanced_ats_score${sessionId ? `?session_id=${sessionId}` : ''}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resume_data: cleanedResumeData,
          job_description: jobDescription,
          target_role: targetRole,
          industry: industry,
          previous_score: prevScore
        }),
      })

      if (response.status === 429) {
        const errorData = await response.json()
        setUpgradePromptData({
          currentUsage: errorData.detail?.usage_info?.current_usage || 0,
          limit: errorData.detail?.usage_info?.limit || null,
          period: errorData.detail?.usage_info?.period || 'daily',
        })
        setShowUpgradePrompt(true)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to analyze resume')
      }

      const result = await response.json()
      setAtsResult(result)
      
      // Store the new score for next calculation
      if (result.score !== undefined && typeof window !== 'undefined') {
        localStorage.setItem('lastATSScore', result.score.toString())
        setPreviousScore(result.score)
      }
      
      await refreshUsage()
    } catch (error) {
      console.error('Enhanced ATS analysis error:', error)
      setAtsResult({
        success: false,
        score: 0,
        suggestions: ['Failed to analyze resume. Please try again.'],
        details: {},
        ai_improvements: [],
        error: 'Network error'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyImprovement = async (improvement: AIImprovement) => {
    setIsApplyingImprovement(true)
    try {
      // Clean resume data - remove fieldsVisible and ensure params are compatible
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
          bullets: (section.bullets || [])
            .filter((bullet: any) => bullet?.params?.visible !== false)  // Filter out invisible bullets
            .map((bullet: any) => ({
              id: bullet.id,
              text: bullet.text,
              params: bullet.params || {}  // Preserve params instead of resetting
            }))
        }))
      };

      const response = await fetch(`${config.apiBase}/api/ai/apply_improvement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: cleanedResumeData,
          job_description: jobDescription,
          target_role: targetRole,
          industry: industry,
          strategy: improvement.category.toLowerCase().replace(' ', '_')
        }),
      })

      const result = await response.json()
      if (result.success) {
        const { showCustomAlert } = await import('@/lib/modals')
        await showCustomAlert(
          `AI Improvement Applied!\n\n${result.improved_content}`,
          {
            title: 'AI Improvement Applied!',
            type: 'success',
            icon: '✨'
          }
        )
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

  const improveATSScore = async () => {
    setIsImprovingATS(true)
    try {
      // Clean resume data - remove fieldsVisible and ensure params are compatible
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
          bullets: (section.bullets || [])
            .filter((bullet: any) => bullet?.params?.visible !== false)  // Filter out invisible bullets
            .map((bullet: any) => ({
              id: bullet.id,
              text: bullet.text,
              params: bullet.params || {}  // Preserve params instead of resetting
            }))
        }))
      };

      const response = await fetch(`${config.apiBase}/api/ai/improve_ats_score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: cleanedResumeData,
          job_description: jobDescription,
          target_role: targetRole,
          industry: industry
        }),
      })

      const result = await response.json()
      if (result.success) {
        setImprovementResult(result)
        
        // Show improvement summary
        const improvementText = `🎉 ATS Score Improved!\n\n` +
          `Original Score: ${result.original_score}/100\n` +
          `New Score: ${result.new_score}/100\n` +
          `Improvement: +${result.score_improvement} points\n\n` +
          `Applied ${result.applied_improvements.length} improvements:\n` +
          result.applied_improvements.map((imp: any, index: number) => 
            `${index + 1}. ${imp.title}`
          ).join('\n') +
          `\n\n${result.remaining_improvements} more improvements available.`
        
        const { showCustomConfirm } = await import('@/lib/modals')
        const confirmed = await showCustomConfirm(
          improvementText + '\n\nWould you like to apply these improvements to your resume?',
          {
            title: 'Apply ATS Improvements',
            type: 'info',
            icon: '🎯',
            confirmText: 'Apply',
            cancelText: 'Cancel'
          }
        )
        if (confirmed) {
          // Update the resume data with improvements
          // This would typically call a parent callback to update the resume
          alert('Resume improvements applied! Your ATS score has been optimized.')
          
          // Re-analyze to show updated score
          setTimeout(() => {
            analyzeResume()
          }, 1000)
        }
      } else {
        alert(`Failed to improve ATS score: ${result.error}`)
      }
    } catch (error) {
      console.error('ATS improvement error:', error)
      alert('Failed to improve ATS score. Please try again.')
    } finally {
      setIsImprovingATS(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Excellent ATS compatibility!'
    if (score >= 60) return 'Good ATS compatibility with room for improvement.'
    if (score >= 40) return 'Fair ATS compatibility. Several improvements needed.'
    return 'Poor ATS compatibility. Major improvements required.'
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

  useEffect(() => {
    if (resumeData && Object.keys(resumeData).length > 0) {
      analyzeResume()
    }
  }, [])

  return (
    <>
      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt && !!upgradePromptData}
        onClose={() => {
          setShowUpgradePrompt(false)
          setUpgradePromptData(null)
        }}
        featureType="ats_enhanced"
        currentUsage={upgradePromptData?.currentUsage || 0}
        limit={upgradePromptData?.limit || null}
        period={upgradePromptData?.period || 'month'}
      />

      <div className={inline ? '' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'}>
        <div className={inline ? 'bg-white rounded-lg shadow-sm border w-full' : 'bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto'}>
          <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Enhanced ATS Analysis & AI Improvements</h2>
            {!inline && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your resume with AI-powered insights...</p>
            </div>
          )}

          {atsResult && (
            <div className="space-y-6">
              {/* Score Display */}
              <div className={`text-center p-6 rounded-lg ${getScoreBgColor(atsResult.score)}`}>
                <div className={`text-6xl font-bold ${getScoreColor(atsResult.score)} mb-2`}>
                  {atsResult.score}
                </div>
                <div className="text-2xl text-gray-600 mb-2">/ 100</div>
                <p className={`text-lg font-semibold ${getScoreColor(atsResult.score)}`}>
                  {getScoreMessage(atsResult.score)}
                </p>
                {atsResult.ai_improvements && atsResult.ai_improvements.length > 0 && (
                  <div className="mt-3 p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800 font-semibold">
                      🚀 {atsResult.ai_improvements.length} AI improvements available to boost your score!
                    </p>
                  </div>
                )}
              </div>

              {/* AI Improvements Section */}
              {atsResult.ai_improvements && atsResult.ai_improvements.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-4">🤖 AI-Powered Improvement Suggestions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {atsResult.ai_improvements.map((improvement, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{improvement.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{improvement.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
                              {improvement.priority.toUpperCase()}
                            </span>
                            <span className={`text-sm font-semibold ${getImpactColor(improvement.impact_score)}`}>
                              Impact: {improvement.impact_score}/10
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700">
                            <strong>Suggestion:</strong> {improvement.specific_suggestion}
                          </p>
                          {improvement.example && (
                            <div className="bg-gray-50 p-3 rounded text-sm">
                              <strong>Example:</strong> {improvement.example}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setSelectedImprovement(improvement)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => applyImprovement(improvement)}
                            disabled={isApplyingImprovement}
                            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-semibold"
                          >
                            {isApplyingImprovement ? 'Applying...' : 'Apply AI Fix'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traditional Suggestions */}
              {atsResult.suggestions && atsResult.suggestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">General Improvement Suggestions</h3>
                  <ul className="space-y-2">
                    {atsResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-blue-800">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Analysis */}
              {atsResult.details && (
                <div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">Detailed Analysis</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showDetails && (
                    <div className="mt-4 space-y-4">
                      {/* Structure Analysis */}
                      {atsResult.details.structure_analysis && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Structure Analysis</h4>
                          <div className="space-y-2">
                            {Object.entries(atsResult.details.structure_analysis.found_sections || {}).map(([section, found]) => (
                              <div key={section} className="flex items-center justify-between">
                                <span className="capitalize">{section}</span>
                                <span className={`px-2 py-1 rounded text-sm ${found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {found ? 'Found' : 'Missing'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Keyword Analysis */}
                      {atsResult.details.keyword_analysis && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Keyword Analysis</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Action Verbs:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.keyword_analysis.action_verbs || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Technical Terms:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.keyword_analysis.technical_terms || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Metrics:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.keyword_analysis.metrics || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Job Match Score:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.keyword_analysis.job_match_score || 0}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quality Analysis */}
                      {atsResult.details.quality_analysis && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Content Quality Analysis</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Quantified Achievements:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.quality_analysis.quantified_achievements || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Strong Verbs:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.quality_analysis.strong_verbs || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Vague Terms:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.quality_analysis.vague_terms || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Quality Score:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.quality_analysis.score || 0}/100</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
                <button
                  onClick={improveATSScore}
                  disabled={isImprovingATS || !atsResult?.ai_improvements?.length}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {isImprovingATS ? '🤖 Improving...' : '🚀 Improve ATS Score'}
                </button>
                <button
                  onClick={analyzeResume}
                  disabled={isAnalyzing}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Re-analyze Resume'}
                </button>
            {!inline && (
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            )}
              </div>
            </div>
          )}

          {!atsResult && !isAnalyzing && (
            <div className="text-center py-8">
              <p className="text-gray-600">No analysis available. Please try again.</p>
              <button
                onClick={analyzeResume}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Analyze Resume
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Improvement Details Modal */}
      {selectedImprovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedImprovement.title}</h3>
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
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedImprovement.description}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Specific Suggestion</h4>
                  <p className="text-gray-700">{selectedImprovement.specific_suggestion}</p>
                </div>
                
                {selectedImprovement.example && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Example</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      {selectedImprovement.example}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Priority:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(selectedImprovement.priority)}`}>
                      {selectedImprovement.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Impact Score:</span>
                    <span className={`ml-2 font-semibold ${getImpactColor(selectedImprovement.impact_score)}`}>
                      {selectedImprovement.impact_score}/10
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
    </>
  )
}

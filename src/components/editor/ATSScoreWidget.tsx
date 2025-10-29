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

interface ATSResult {
  success: boolean
  score: number
  suggestions: string[]
  details: {
    section_analysis?: any
    keyword_analysis?: any
    formatting_analysis?: any
  }
  error?: string
}

interface Props {
  resumeData: ResumeData
  onClose: () => void
}

export default function ATSScoreWidget({ resumeData, onClose }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const analyzeResume = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/ats_score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resumeData),
      })

      const result = await response.json()
      setAtsResult(result)
    } catch (error) {
      console.error('ATS analysis error:', error)
      setAtsResult({
        success: false,
        score: 0,
        suggestions: ['Failed to analyze resume. Please try again.'],
        details: {},
        error: 'Network error'
      })
    } finally {
      setIsAnalyzing(false)
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

  useEffect(() => {
    if (resumeData && Object.keys(resumeData).length > 0) {
      analyzeResume()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">ATS Compatibility Score</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your resume for ATS compatibility...</p>
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
              </div>

              {/* Suggestions */}
              {atsResult.suggestions && atsResult.suggestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Improvement Suggestions</h3>
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
                      {/* Section Analysis */}
                      {atsResult.details.section_analysis && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Section Analysis</h4>
                          <div className="space-y-2">
                            {Object.entries(atsResult.details.section_analysis.found_sections || {}).map(([section, found]) => (
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
                              <span className="text-gray-600">Overall Score:</span>
                              <span className="ml-2 font-semibold">{atsResult.details.keyword_analysis.score || 0}/100</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Formatting Analysis */}
                      {atsResult.details.formatting_analysis && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Formatting Analysis</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span>Formatting Score</span>
                              <span className="font-semibold">{atsResult.details.formatting_analysis.score || 0}/100</span>
                            </div>
                            {atsResult.details.formatting_analysis.issues && atsResult.details.formatting_analysis.issues.length > 0 && (
                              <div>
                                <span className="text-gray-600">Issues Found:</span>
                                <ul className="mt-1 ml-4">
                                  {atsResult.details.formatting_analysis.issues.map((issue: string, index: number) => (
                                    <li key={index} className="text-red-600">• {issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
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
                  onClick={analyzeResume}
                  disabled={isAnalyzing}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Re-analyze Resume'}
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
    </div>
  )
}

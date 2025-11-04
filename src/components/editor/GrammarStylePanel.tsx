'use client'
import { useState, useEffect } from 'react'
import config from '@/lib/config';
import GrammarChecker from './GrammarChecker'

interface StyleScore {
  overall_score: number
  grammar_score: number
  readability_score: number
  strength_score: number
  issues_count: number
  suggestions: string[]
}

interface GrammarCheckResult {
  success: boolean
  text_length: number
  grammar_issues: any[]
  style_issues: any[]
  improvement_suggestions: string[]
  style_score?: StyleScore
  error?: string
}

interface Props {
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
        params?: Record<string, any>
      }>
      params?: Record<string, any>
    }>
    fieldsVisible?: Record<string, boolean>
  }
  onApplySuggestion?: (sectionId: string, bulletId: string, newText: string) => void
  className?: string
}

export default function GrammarStylePanel({ resumeData, onApplySuggestion, className = '' }: Props) {
  const [overallResult, setOverallResult] = useState<GrammarCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overall' | 'sections'>('overall')

  const getAllText = () => {
    let fullText = `${resumeData.name} ${resumeData.title}`
    if (resumeData.summary) {
      fullText += ` ${resumeData.summary}`
    }
    resumeData.sections.forEach(section => {
      fullText += ` ${section.title}`
      section.bullets.forEach(bullet => {
        if (bullet.text.trim()) {
          fullText += ` ${bullet.text}`
        }
      })
    })
    return fullText
  }

  const checkOverallGrammar = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const fullText = getAllText()
      const response = await fetch(`${config.apiBase}/api/ai/grammar_check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullText,
          check_type: 'all'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setOverallResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Overall grammar check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkOverallGrammar()
  }, [resumeData])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getOverallGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            📝 Grammar & Style Checker
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                activeTab === 'overall'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                activeTab === 'sections'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sections
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overall' && (
          <div className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Analyzing your resume...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-red-700">Analysis failed: {error}</span>
                </div>
              </div>
            )}

            {overallResult && overallResult.success && (
              <>
                {/* Overall Score Card */}
                <div className={`rounded-lg p-4 border ${getScoreBgColor(overallResult.style_score?.overall_score || 0)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Overall Writing Score</h3>
                      <p className="text-sm text-gray-600">Based on grammar, readability, and strength</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(overallResult.style_score?.overall_score || 0)}`}>
                        {overallResult.style_score?.overall_score || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Grade: {getOverallGrade(overallResult.style_score?.overall_score || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getScoreColor(overallResult.style_score?.grammar_score || 0)}`}>
                        {overallResult.style_score?.grammar_score || 0}
                      </div>
                      <div className="text-xs text-gray-600">Grammar</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getScoreColor(overallResult.style_score?.readability_score || 0)}`}>
                        {overallResult.style_score?.readability_score || 0}
                      </div>
                      <div className="text-xs text-gray-600">Readability</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getScoreColor(overallResult.style_score?.strength_score || 0)}`}>
                        {overallResult.style_score?.strength_score || 0}
                      </div>
                      <div className="text-xs text-gray-600">Strength</div>
                    </div>
                  </div>

                  {/* Issues Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Issues Found:</span>
                      <span className={`font-semibold ${overallResult.style_score?.issues_count || 0 > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {overallResult.style_score?.issues_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Grammar Issues:</span>
                      <span className={`font-semibold ${overallResult.grammar_issues.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {overallResult.grammar_issues.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Style Issues:</span>
                      <span className={`font-semibold ${overallResult.style_issues.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {overallResult.style_issues.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis */}
                <GrammarChecker
                  text={getAllText()}
                  className="mt-4"
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4">
            {/* Summary Section */}
            {resumeData.summary && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Professional Summary</h3>
                <GrammarChecker
                  text={resumeData.summary}
                  onApplySuggestion={(originalText, newText) => {
                    if (onApplySuggestion) {
                      onApplySuggestion('summary', '', newText)
                    }
                  }}
                />
              </div>
            )}

            {/* Sections */}
            {resumeData.sections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">{section.title}</h3>
                <div className="space-y-3">
                  {section.bullets.map((bullet) => {
                    if (!bullet.text.trim()) return null
                    
                    return (
                      <div key={bullet.id} className="border-l-2 border-gray-100 pl-3">
                        <GrammarChecker
                          text={bullet.text}
                          onApplySuggestion={(originalText, newText) => {
                            if (onApplySuggestion) {
                              onApplySuggestion(section.id, bullet.id, newText)
                            }
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

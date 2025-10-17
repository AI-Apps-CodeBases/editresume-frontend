'use client'
import { useState, useEffect } from 'react'

interface GrammarIssue {
  message: string
  replacements: string[]
  offset: number
  length: number
  rule_id: string
  category: string
  severity: string
}

interface StyleIssue {
  type: string
  message: string
  suggestion: string
  severity: string
  score_impact: number
}

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
  grammar_issues: GrammarIssue[]
  style_issues: StyleIssue[]
  improvement_suggestions: string[]
  style_score?: StyleScore
  error?: string
}

interface Props {
  text: string
  onApplySuggestion?: (originalText: string, newText: string, offset: number, length: number) => void
  className?: string
  enabled?: boolean
}

export default function GrammarChecker({ text, onApplySuggestion, className = '', enabled = true }: Props) {
  const [result, setResult] = useState<GrammarCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<GrammarIssue | StyleIssue | null>(null)

  const checkGrammar = async (textToCheck: string) => {
    if (!textToCheck.trim() || !enabled) {
      setResult(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/grammar_check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToCheck,
          check_type: 'all'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Grammar check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkGrammar(text)
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [text])

  const applySuggestion = (issue: GrammarIssue, replacement: string) => {
    if (onApplySuggestion) {
      const newText = text.substring(0, issue.offset) + replacement + text.substring(issue.offset + issue.length)
      onApplySuggestion(text, newText, issue.offset, issue.length)
    }
    setSelectedIssue(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking grammar and style...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-red-600">⚠️</span>
          <span className="text-sm text-red-700">Grammar check failed: {error}</span>
        </div>
      </div>
    )
  }

  if (!result || !result.success) {
    return null
  }

  const hasIssues = result.grammar_issues.length > 0 || result.style_issues.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Style Score Summary */}
      {result.style_score && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Writing Style Score</h3>
            <div className={`text-2xl font-bold ${getScoreColor(result.style_score.overall_score)}`}>
              {result.style_score.overall_score}/100
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(result.style_score.grammar_score)}`}>
                {result.style_score.grammar_score}
              </div>
              <div className="text-xs text-gray-600">Grammar</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(result.style_score.readability_score)}`}>
                {result.style_score.readability_score}
              </div>
              <div className="text-xs text-gray-600">Readability</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(result.style_score.strength_score)}`}>
                {result.style_score.strength_score}
              </div>
              <div className="text-xs text-gray-600">Strength</div>
            </div>
          </div>

          {result.style_score.suggestions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestions:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {result.style_score.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Grammar Issues */}
      {result.grammar_issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Grammar Issues ({result.grammar_issues.length})
          </h3>
          <div className="space-y-2">
            {result.grammar_issues.map((issue, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{issue.message}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {text.substring(issue.offset, issue.offset + issue.length)}
                    </div>
                    {issue.replacements.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issue.replacements.slice(0, 3).map((replacement, idx) => (
                          <button
                            key={idx}
                            onClick={() => applySuggestion(issue, replacement)}
                            className="px-2 py-1 bg-white text-xs rounded border hover:bg-gray-50 transition-colors"
                          >
                            {replacement}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style Issues */}
      {result.style_issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Style Issues ({result.style_issues.length})
          </h3>
          <div className="space-y-2">
            {result.style_issues.map((issue, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{issue.message}</div>
                    <div className="text-xs text-gray-600 mt-1">{issue.suggestion}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">
                      {issue.type.replace('_', ' ')} • Impact: {issue.score_impact} points
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      {result.improvement_suggestions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            General Suggestions
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            {result.improvement_suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">💡</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Issues Message */}
      {!hasIssues && result.style_score && result.style_score.overall_score >= 80 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-xl">✅</span>
            <span className="text-green-700 font-medium">Great writing! No major issues found.</span>
          </div>
        </div>
      )}
    </div>
  )
}

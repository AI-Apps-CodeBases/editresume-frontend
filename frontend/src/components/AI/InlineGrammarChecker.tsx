'use client'
import { useState, useEffect, useRef } from 'react'

import config from '@/lib/config';
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

interface GrammarCheckResult {
  success: boolean
  grammar_issues: GrammarIssue[]
  style_issues: StyleIssue[]
  error?: string
}

interface Props {
  text: string
  onApplySuggestion?: (originalText: string, newText: string, offset: number, length: number) => void
  showInline?: boolean
}

export default function InlineGrammarChecker({ text, onApplySuggestion, showInline = true }: Props) {
  const [result, setResult] = useState<GrammarCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIssue, setHoveredIssue] = useState<GrammarIssue | null>(null)
  const [showSuggestions, setShowSuggestions] = useState<GrammarIssue | null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const checkGrammar = async (textToCheck: string) => {
    if (!textToCheck.trim()) {
      setResult(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${config.apiBase}/api/ai/grammar_check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToCheck,
          check_type: 'grammar' // Only check grammar for inline display
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Inline grammar check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkGrammar(text)
    }, 1500) // Debounce for 1.5 seconds

    return () => clearTimeout(timeoutId)
  }, [text])

  const applySuggestion = (issue: GrammarIssue, replacement: string) => {
    if (onApplySuggestion) {
      const newText = text.substring(0, issue.offset) + replacement + text.substring(issue.offset + issue.length)
      onApplySuggestion(text, newText, issue.offset, issue.length)
    }
    setShowSuggestions(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const renderTextWithHighlights = () => {
    if (!result || !result.success || !showInline) {
      return text
    }

    const issues = result.grammar_issues.sort((a, b) => a.offset - b.offset)
    if (issues.length === 0) {
      return text
    }

    const parts = []
    let lastIndex = 0

    issues.forEach((issue, index) => {
      // Add text before the issue
      if (issue.offset > lastIndex) {
        parts.push(text.substring(lastIndex, issue.offset))
      }

      // Add the highlighted issue
      const issueText = text.substring(issue.offset, issue.offset + issue.length)
      parts.push(
        <span
          key={`issue-${index}`}
          className={`relative inline-block cursor-pointer px-1 py-0.5 rounded underline decoration-wavy decoration-2 underline-offset-2 ${getSeverityColor(issue.severity)} hover:shadow-md transition-all`}
          onMouseEnter={() => setHoveredIssue(issue)}
          onMouseLeave={() => setHoveredIssue(null)}
          onClick={() => setShowSuggestions(issue)}
          title={issue.message}
        >
          {issueText}
        </span>
      )

      lastIndex = issue.offset + issue.length
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts
  }

  if (isLoading) {
    return (
      <div className="relative">
        <span className="opacity-70">{text}</span>
        <div className="absolute top-0 right-0 -mt-6 -mr-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Text with inline highlights */}
      <span className="whitespace-pre-wrap">
        {renderTextWithHighlights()}
      </span>

      {/* Hover tooltip */}
      {hoveredIssue && (
        <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 shadow-lg max-w-xs">
          <div className="font-medium">{hoveredIssue.message}</div>
          {hoveredIssue.replacements.length > 0 && (
            <div className="text-gray-300 mt-1">
              Suggestions: {hoveredIssue.replacements.slice(0, 2).join(', ')}
            </div>
          )}
          <div className="text-gray-400 mt-1 capitalize">{hoveredIssue.severity} • {hoveredIssue.category}</div>
        </div>
      )}

      {/* Suggestions popup */}
      {showSuggestions && (
        <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-64">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{showSuggestions.message}</div>
              <div className="text-xs text-gray-600 mt-1 capitalize">
                {showSuggestions.severity} • {showSuggestions.category}
              </div>
            </div>
            <button
              onClick={() => setShowSuggestions(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>

          {showSuggestions.replacements.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-2">Suggestions:</div>
              <div className="space-y-1">
                {showSuggestions.replacements.slice(0, 4).map((replacement, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion(showSuggestions, replacement)}
                    className="w-full text-left px-2 py-1 text-sm bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                  >
                    {replacement}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowSuggestions(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Click outside to dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="absolute top-0 right-0 -mt-6 -mr-2">
          <span className="text-red-500 text-xs" title={error}>⚠️</span>
        </div>
      )}

      {/* Issue count indicator */}
      {result && result.success && result.grammar_issues.length > 0 && (
        <div className="absolute top-0 right-0 -mt-6 -mr-2">
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${getSeverityColor('medium')}`}>
            {result.grammar_issues.length}
          </span>
        </div>
      )}
    </div>
  )
}

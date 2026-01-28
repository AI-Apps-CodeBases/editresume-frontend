'use client'
import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Minimize2, 
  Maximize2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Lightbulb
} from 'lucide-react'
import Tooltip from '@/components/Shared/Tooltip'

interface MatchScoreWidgetProps {
  score: number | null
  isAnalyzing?: boolean
  matchResult?: {
    match_analysis?: {
      similarity_score?: number
      matching_keywords?: string[]
      missing_keywords?: string[]
      match_count?: number
      missing_count?: number
    }
    keyword_suggestions?: Record<string, string[]>
    improvement_suggestions?: Array<{
      category?: string
      suggestion?: string
    }>
  } | null
  onViewDetails?: () => void
}

export default function MatchScoreWidget({
  score,
  isAnalyzing = false,
  matchResult,
  onViewDetails
}: MatchScoreWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Auto-expand on first score load
  useEffect(() => {
    if (score !== null && !isAnalyzing) {
      setIsMinimized(false)
    }
  }, [score, isAnalyzing])

  // Reset suggestions collapse when match result changes
  useEffect(() => {
    if (matchResult) {
      setShowSuggestions(false)
    }
  }, [matchResult])

  if (score === null && !isAnalyzing) {
    return null
  }

  const getScoreColor = (s: number) => {
    if (s >= 71) return { 
      bg: 'text-emerald-500', 
      stroke: 'stroke-emerald-500',
      text: 'text-emerald-600', 
      bgLight: 'bg-emerald-50/80', 
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-emerald-600'
    }
    if (s >= 41) return { 
      bg: 'text-amber-500', 
      stroke: 'stroke-amber-500',
      text: 'text-amber-600', 
      bgLight: 'bg-amber-50/80', 
      border: 'border-amber-200',
      gradient: 'from-amber-500 to-amber-600'
    }
    return { 
      bg: 'text-red-500', 
      stroke: 'stroke-red-500',
      text: 'text-red-600', 
      bgLight: 'bg-red-50/80', 
      border: 'border-red-200',
      gradient: 'from-red-500 to-red-600'
    }
  }

  const getScoreLabel = (s: number) => {
    if (s >= 71) return 'Excellent'
    if (s >= 41) return 'Good'
    return 'Needs Improvement'
  }

  const scoreColor = score !== null ? getScoreColor(score) : null
  const missingKeywords = matchResult?.match_analysis?.missing_keywords || []
  const matchingKeywords = matchResult?.match_analysis?.matching_keywords || []
  const suggestions = matchResult?.improvement_suggestions || []

  return (
    <div
      className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-40 transition-all duration-300 ease-out pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`bg-white/95 backdrop-blur-md rounded-xl border shadow-lg transition-all duration-300 ease-out pointer-events-auto ${
          isMinimized 
            ? 'w-16 h-16 lg:w-20 lg:h-20' 
            : 'w-[calc(100vw-2rem)] sm:w-80 max-w-[90vw]'
        } ${scoreColor?.border || 'border-gray-200'} ${
          isHovered ? 'shadow-xl' : 'shadow-lg'
        }`}
        style={{
          transform: isHovered && !isMinimized ? 'translateY(-2px)' : 'translateY(0)'
        }}
      >
        {isMinimized ? (
          // Minimized view - premium semi-circular gauge
          <div className="w-full h-full flex items-center justify-center p-2 lg:p-3 cursor-pointer group"
            onClick={() => setIsMinimized(false)}
          >
            <div className={`relative w-full h-full flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''}`}>
              <svg viewBox="0 0 120 70" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                  strokeLinecap="round"
                />
                {/* Progress arc */}
                {score !== null && (
                  <path
                    d="M 10 60 A 50 50 0 0 1 110 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className={scoreColor?.stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 157}, 157`}
                    style={{
                      filter: isAnalyzing ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                      transition: 'stroke-dasharray 0.5s ease-out, filter 0.3s ease-out'
                    }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pb-2">
                <span className={`text-sm lg:text-base font-black ${scoreColor?.text}`}>
                  {score !== null ? Math.round(score) : '--'}
                </span>
              </div>
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Maximize2 className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        ) : (
          // Expanded view
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Premium Semi-Circular Gauge */}
                <div className={`relative flex-shrink-0 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                  <svg viewBox="0 0 200 120" className="w-24 h-14">
                    {/* Background arc */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-gray-200"
                      strokeLinecap="round"
                    />
                    {/* Progress arc with gradient effect */}
                    {score !== null && (
                      <>
                        <defs>
                          <linearGradient id={`gauge-gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={score >= 71 ? '#10b981' : score >= 41 ? '#f59e0b' : '#ef4444'} />
                            <stop offset="100%" stopColor={score >= 71 ? '#059669' : score >= 41 ? '#d97706' : '#dc2626'} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke={`url(#gauge-gradient-${score})`}
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(score / 100) * 251.2}, 251.2`}
                          style={{
                            filter: isAnalyzing ? 'drop-shadow(0 0 12px currentColor)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease-out'
                          }}
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pb-1">
                    {isAnalyzing ? (
                      <div className={`w-5 h-5 border-2 ${scoreColor?.stroke} border-t-transparent rounded-full animate-spin`} />
                    ) : (
                      <span className={`text-2xl font-black ${scoreColor?.text}`}>
                        {score !== null ? Math.round(score) : '--'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">Match Score</h3>
                    {score !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor?.bgLight} ${scoreColor?.text}`}>
                        {getScoreLabel(score)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {isAnalyzing ? 'Analyzing...' : matchResult?.match_analysis 
                      ? `${matchResult.match_analysis.match_count || 0} matched, ${matchResult.match_analysis.missing_count || 0} missing keywords`
                      : 'Based on selected job description'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {onViewDetails && (
                  <Tooltip text="View full analysis" color="gray" position="left">
                    <button
                      onClick={onViewDetails}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50/50 rounded-md transition-all duration-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Minimize" color="gray" position="left">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Quick Stats */}
            {score !== null && matchResult?.match_analysis && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`px-3 py-2 rounded-lg ${scoreColor?.bgLight} transition-colors`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${scoreColor?.text}`} />
                    <span className={`text-xs font-medium ${scoreColor?.text}`}>Matched</span>
                  </div>
                  <div className={`text-sm font-bold ${scoreColor?.text}`}>
                    {matchResult.match_analysis.match_count || 0}
                  </div>
                </div>
                {missingKeywords.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-gray-50 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-medium text-gray-600">Missing</span>
                    </div>
                    <div className="text-sm font-bold text-gray-700">
                      {matchResult.match_analysis.missing_count || 0}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions - Collapsible */}
            {(missingKeywords.length > 0 || suggestions.length > 0) && (
              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50/50 rounded-md transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-gray-500 group-hover:text-primary-600 transition-colors duration-200" />
                    <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors duration-200">
                      {missingKeywords.length > 0 ? `${missingKeywords.length} keyword suggestions` : 
                       suggestions.length > 0 ? `${suggestions.length} improvement tips` : 'Suggestions'}
                    </span>
                  </div>
                  <div className={`transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </button>

                {showSuggestions && (
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                    {missingKeywords.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary mb-1.5 px-2">
                          Add these keywords:
                        </h4>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {missingKeywords.slice(0, 8).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-primary-100 hover:text-primary-700 transition-all duration-200 cursor-default"
                              title="Missing keyword"
                            >
                              {keyword}
                            </span>
                          ))}
                          {missingKeywords.length > 8 && (
                            <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500">
                              +{missingKeywords.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {suggestions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary mb-1.5 px-2">
                          Improvement tips:
                        </h4>
                        <div className="space-y-1.5 px-2">
                          {suggestions.slice(0, 3).map((suggestion, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2 bg-primary-50/50 rounded-md hover:bg-primary-50 transition-all duration-200 group/item"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-primary-600 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                              <p className="text-xs text-text-secondary leading-relaxed flex-1">
                                {suggestion.suggestion || suggestion.category}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View Details Link */}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="w-full mt-3 py-2 px-3 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 group/link"
              >
                <span className="group-hover/link:underline transition-all duration-200">View Full Analysis</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform duration-200" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

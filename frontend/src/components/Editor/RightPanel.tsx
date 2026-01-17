'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import config from '@/lib/config'
import Tooltip from '@/components/Shared/Tooltip'
import { FileText as FileTextIcon, CheckCircle2, Loader2, Lightbulb, XCircle, ChevronDown } from 'lucide-react'


type RightPanelTab = 'job-description' | 'suggestions'

interface RightPanelProps {
  activeTab?: RightPanelTab
  onTabChange?: (tab: RightPanelTab) => void
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
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech' | 'classic'
  templateConfig?: any
  deepLinkedJD?: string | null
  activeJobDescriptionId?: number | null
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  onSelectJobDescriptionId?: (id: number | null) => void
  onMatchScoreChange?: (score: number | null, isAnalyzing: boolean) => void
  onExport?: (format: 'pdf' | 'docx' | 'cover-letter') => void
  isExporting?: boolean
  hasResumeName?: boolean
}

export default function RightPanel({ 
  activeTab = 'job-description', 
  onTabChange,
  leftSidebarCollapsed = false,
  onResumeUpdate,
  onAIImprove,
  resumeData,
  template = 'clean',
  templateConfig,
  deepLinkedJD,
  activeJobDescriptionId,
  onViewChange,
  onSelectJobDescriptionId,
  onMatchScoreChange,
  onExport,
  isExporting = false,
  hasResumeName = false
}: RightPanelProps) {
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [aiImprovements, setAiImprovements] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplyingImprovement, setIsApplyingImprovement] = useState<string | null>(null)
  const [atsSuggestions, setAtsSuggestions] = useState<any[]>([])
  const [jdKeywords, setJdKeywords] = useState<any>(null)
  const [matchResult, setMatchResult] = useState<any>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedKeywords = localStorage.getItem('currentJDKeywords')
        if (savedKeywords) {
          setJdKeywords(JSON.parse(savedKeywords))
        }
        const savedMatchResult = localStorage.getItem('currentMatchResult')
        if (savedMatchResult) {
          setMatchResult(JSON.parse(savedMatchResult))
        }
      } catch (e) {
        console.error('Failed to load keywords:', e)
      }
    }
  }, [])

  // Calculate ATS score when resumeData changes
  const calculateATSScore = useCallback(async () => {
    if (!resumeData || !resumeData.name && !resumeData.sections?.length) {
      setAtsScore(null)
      setAiImprovements(0)
      setAtsSuggestions([])
      return
    }

      setIsAnalyzing(true)
      onMatchScoreChange?.(atsScore, true)
    try {
      // Backend will extract text from resume_data
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

      // Use job description if available (from deepLinkedJD or localStorage)
      let jobDescriptionToUse = deepLinkedJD || '';
      let extractedKeywordsToUse = null;
      if (!jobDescriptionToUse && typeof window !== 'undefined') {
        const savedJD = localStorage.getItem('deepLinkedJD');
        if (savedJD) {
          jobDescriptionToUse = savedJD;
        }
      }
      // Load extracted_keywords from localStorage if available
      if (typeof window !== 'undefined') {
        const savedKeywords = localStorage.getItem('extractedKeywords');
        if (savedKeywords) {
          try {
            extractedKeywordsToUse = JSON.parse(savedKeywords);
          } catch (e) {
            console.error('Failed to parse extracted keywords:', e);
          }
        }
      }

      // Don't send previous_score for auto-updates to ensure accurate absolute scores
      // The backend's max(calculated_score, previous_score) logic prevents accurate scoring
      // when resume content changes. Only calculate absolute scores for auto-updates.

      const response = await fetch(`${config.apiBase}/api/ai/enhanced_ats_score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: cleanedResumeData,  // Backend will extract text from resume_data
          job_description: jobDescriptionToUse,
          target_role: '',
          industry: '',
          extracted_keywords: extractedKeywordsToUse || undefined
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to calculate ATS score')
      }

      const data = await response.json()
      // Use API score directly as the single source of truth
      const newScore = data.score || null
      setAtsScore(newScore)
      setAiImprovements(data.improvements_count || 0)
      setAtsSuggestions(data.suggestions || [])
      
      // Sync score with match result in localStorage to ensure consistency
      if (newScore !== null && typeof window !== 'undefined') {
        localStorage.setItem('lastATSScore', newScore.toString())
        try {
          const savedMatchResult = localStorage.getItem('currentMatchResult')
          if (savedMatchResult) {
            const matchResult = JSON.parse(savedMatchResult)
            if (matchResult.match_analysis) {
              matchResult.match_analysis.similarity_score = newScore
              localStorage.setItem('currentMatchResult', JSON.stringify(matchResult))
            }
          }
        } catch (e) {
          console.warn('Failed to sync match result score:', e)
        }
      }
      
      // Notify parent component of score change
      onMatchScoreChange?.(newScore, false)
    } catch (error) {
      console.error('Error calculating ATS score:', error)
      setAtsScore(null)
      setAiImprovements(0)
      setAtsSuggestions([])
      onMatchScoreChange?.(null, false)
    } finally {
      setIsAnalyzing(false)
    }
  }, [resumeData, deepLinkedJD])

  useEffect(() => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current)
    }

    // Try to get score from match result first (more accurate - from Match JD tab)
    if (typeof window !== 'undefined') {
      try {
        const savedMatchResult = localStorage.getItem('currentMatchResult')
        if (savedMatchResult) {
          const matchResult = JSON.parse(savedMatchResult)
          const matchScore = matchResult?.match_analysis?.similarity_score
          if (matchScore !== null && matchScore !== undefined && !isNaN(matchScore)) {
            const roundedScore = Math.round(matchScore)
            setAtsScore(roundedScore)
            onMatchScoreChange?.(roundedScore, false)
            // Still calculate in background to keep it updated, but use match result for display
            analyzeTimeoutRef.current = setTimeout(() => {
              calculateATSScore()
            }, 2000)
            return
          }
        }
      } catch (e) {
        console.warn('Failed to load match result score:', e)
      }
    }

    analyzeTimeoutRef.current = setTimeout(() => {
      calculateATSScore()
    }, 1000)

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current)
      }
    }
  }, [calculateATSScore])

  const tabs = [
    { id: 'job-description' as const, label: 'Match JD', icon: FileTextIcon },
    { id: 'suggestions' as const, label: 'Suggestions', icon: Lightbulb },
  ]

  // Notify parent when score changes
  useEffect(() => {
    onMatchScoreChange?.(atsScore, isAnalyzing)
  }, [atsScore, isAnalyzing, onMatchScoreChange])



  return (
    <div className="bg-white/95 backdrop-blur-sm border-l border-border-subtle flex flex-col h-full w-full custom-scrollbar transition-all duration-300">
      {/* Tabs */}
      <div className="flex items-center border-b border-border-subtle bg-gradient-to-r from-primary-50/20 to-transparent">
        {tabs.map((tab) => (
          <Tooltip 
            key={tab.id}
            text={
              tab.id === 'job-description' ? 'Match your resume against a job description' :
              'Tips to increase your ATS match score'
            }
            color="blue"
            position="bottom"
          >
            <button
              onClick={() => onTabChange?.(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 px-2 sm:px-3 py-2.5 sm:py-2.5 text-xs font-medium transition-all duration-200 touch-target ${
                activeTab === tab.id
                  ? 'text-primary-700 bg-white border-b-2 border-primary-500 shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-primary-50/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'job-description' && resumeData && (
          <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 border-b border-border-subtle bg-white/95 backdrop-blur-md px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text-primary">Match JD</span>
                  <span className="text-xs text-text-muted">
                    Score is based on the selected job description
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {isAnalyzing && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                      <span className="text-xs text-text-muted">Analyzing…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0">
              <JobDescriptionMatcher
                resumeData={resumeData}
                onResumeUpdate={onResumeUpdate}
                standalone={false}
                initialJobDescription={deepLinkedJD || undefined}
                currentJobDescriptionId={activeJobDescriptionId || undefined}
                onViewChange={onViewChange}
                onSelectJobDescriptionId={onSelectJobDescriptionId}
              />
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 border-b border-border-subtle bg-white/95 backdrop-blur-md px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text-primary">Improvement Suggestions</span>
                  <span className="text-xs text-text-muted">
                    Tips to increase your ATS match score
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {matchResult?.match_analysis ? (
                <div className="space-y-6">
                  {/* Score Summary */}
                  {atsScore !== null && (
                    <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
                      <div>
                        <h3 className="text-base font-semibold text-text-primary mb-1">
                          Current Match Score
                        </h3>
                        <p className="text-sm text-text-muted">
                          {matchResult.match_analysis.match_count || 0} matched keywords, {matchResult.match_analysis.missing_count || 0} missing keywords
                        </p>
                        <div className="mt-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            atsScore >= 80 ? 'bg-green-100 text-green-700' :
                            atsScore >= 60 ? 'bg-primary-100 text-primary-700' :
                            atsScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Strong' : atsScore >= 40 ? 'Fair' : 'Needs Work'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Missing Keywords */}
                  {matchResult.match_analysis.missing_keywords && matchResult.match_analysis.missing_keywords.length > 0 && (
                    <div className="bg-white rounded-xl border border-border-subtle p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500" />
                          <h3 className="text-sm font-semibold text-text-primary">
                            Missing Keywords ({matchResult.match_analysis.missing_keywords.length})
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${showSuggestions ? '' : '-rotate-90'}`} />
                        </button>
                      </div>
                      {showSuggestions && (
                        <div className="space-y-3">
                          <p className="text-xs text-text-muted mb-3">
                            Add these keywords to your resume to improve your match score:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {matchResult.match_analysis.missing_keywords.map((keyword: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-all duration-200"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {atsSuggestions.length > 0 && (
                    <div className="bg-white rounded-xl border border-border-subtle p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-semibold text-text-primary">
                          Improvement Tips ({atsSuggestions.length})
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {atsSuggestions.map((suggestion: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-primary-50/50 rounded-lg hover:bg-primary-50 transition-all duration-200"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                              <span className="text-xs font-semibold text-primary-700">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {suggestion.category && (
                                <div className="text-xs font-semibold text-primary-700 mb-1 uppercase tracking-wide">
                                  {suggestion.category}
                                </div>
                              )}
                              <p className="text-sm text-text-secondary leading-relaxed">
                                {suggestion.suggestion || suggestion.text || suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keyword Suggestions */}
                  {matchResult.keyword_suggestions && Object.keys(matchResult.keyword_suggestions).length > 0 && (
                    <div className="bg-white rounded-xl border border-border-subtle p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-semibold text-text-primary">
                          Keyword Suggestions by Category
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(matchResult.keyword_suggestions).map(([category, keywords]: [string, any]) => (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wide">
                              {category}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(keywords) ? keywords : []).map((keyword: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-100 transition-all duration-200"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No suggestions message */}
                  {(!matchResult.match_analysis.missing_keywords || matchResult.match_analysis.missing_keywords.length === 0) &&
                   atsSuggestions.length === 0 &&
                   (!matchResult.keyword_suggestions || Object.keys(matchResult.keyword_suggestions).length === 0) && (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-text-primary mb-1">Great job!</p>
                      <p className="text-xs text-text-muted">No specific suggestions at this time. Keep your resume updated.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-text-secondary mb-1">No suggestions available</p>
                    <p className="text-xs text-text-muted">Match your resume against a job description first</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import config from '@/lib/config'
import Tooltip from '@/components/Shared/Tooltip'


interface RightPanelProps {
  activeTab?: 'preview' | 'job-description'
  onTabChange?: (tab: 'preview' | 'job-description') => void
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
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  onSelectJobDescriptionId?: (id: number | null) => void
}

export default function RightPanel({ 
  activeTab = 'preview', 
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
  onSelectJobDescriptionId
}: RightPanelProps) {
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [aiImprovements, setAiImprovements] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplyingImprovement, setIsApplyingImprovement] = useState<string | null>(null)
  const [atsSuggestions, setAtsSuggestions] = useState<any[]>([])
  const [jdKeywords, setJdKeywords] = useState<any>(null)
  const [matchResult, setMatchResult] = useState<any>(null)
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
    try {
      // Extract text from live preview only if already on 'live' tab
      // Don't switch tabs automatically - preserve user's current view
      let previewText = '';
      let previewExtractionSuccess = false;
      
      // Only try to extract preview text if we're already on the 'preview' tab
      if (activeTab === 'preview') {
        try {
          // Wait for preview container to be ready with retry mechanism
          const maxRetries = 3;
          let retryCount = 0;
          let previewContainer = null;
          
          while (retryCount < maxRetries && !previewContainer) {
            // Wait progressively longer on each retry
            await new Promise(resolve => setTimeout(resolve, 100 + (retryCount * 50)));
            
            // Find the preview container in the DOM
            previewContainer = document.querySelector('.preview-resume-container[data-preview-container]') || 
                             document.querySelector('.preview-resume-container');
            
            // Check if container has meaningful content
            if (previewContainer) {
              const hasContent = previewContainer.textContent && previewContainer.textContent.trim().length > 50;
              if (!hasContent) {
                previewContainer = null; // Reset and retry
              }
            }
            
            retryCount++;
          }
          
          if (previewContainer) {
            // Clone to avoid modifying the original
            const clone = previewContainer.cloneNode(true) as HTMLElement;
            
            // Remove non-text elements (buttons, inputs, page breaks, etc.)
            clone.querySelectorAll(
              'button, input, .no-print, .page-break-marker, .page-break-label, .page-number, .page-layout-indicator, [style*="display: none"], [style*="display:none"]'
            ).forEach(el => el.remove());
            
            // Remove elements with display: none from computed styles
            Array.from(clone.querySelectorAll('*')).forEach(el => {
              try {
                const computed = window.getComputedStyle(el);
                if (computed.display === 'none' || computed.visibility === 'hidden') {
                  el.remove();
                }
              } catch (e) {
                // Skip if element is not in DOM
              }
            });
            
            // Extract text content
            previewText = clone.innerText || clone.textContent || '';
            
            // Clean up extra whitespace but preserve structure
            previewText = previewText
              .replace(/\s+/g, ' ')  // Multiple spaces to single
              .replace(/\n\s*\n/g, '\n')  // Multiple newlines to single
              .trim();
              
            if (previewText.length > 50) {
              previewExtractionSuccess = true;
              console.log(`📄 Extracted preview text length: ${previewText.length}`);
            } else {
              console.warn('Preview container found but text content too short:', previewText.length);
            }
          }
        } catch (e) {
          console.warn('Failed to extract preview text, falling back to resume data:', e);
        }
      } else {
        // Not on 'live' tab - will use resume_data extraction (backend handles this)
        console.log('Not on live tab, using resume_data for ATS score calculation');
      }

      // Always prepare resume_data for backend (backend will use resume_text if available, otherwise extract from resume_data)
      // This ensures consistency - if preview extraction fails, backend can still extract from resume_data
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
          resume_text: previewExtractionSuccess ? previewText : undefined,  // Send extracted preview text if available
          resume_data: cleanedResumeData,  // Always send resume_data for consistency (backend will use resume_text if available, otherwise extract from resume_data)
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
      const newScore = data.score || null
      setAtsScore(newScore)
      setAiImprovements(data.improvements_count || 0)
      setAtsSuggestions(data.suggestions || [])
      
      // Store the new score for next calculation
      if (newScore !== null && typeof window !== 'undefined') {
        localStorage.setItem('lastATSScore', newScore.toString())
      }
    } catch (error) {
      console.error('Error calculating ATS score:', error)
      setAtsScore(null)
      setAiImprovements(0)
      setAtsSuggestions([])
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
            setAtsScore(Math.round(matchScore))
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
    { id: 'preview' as const, label: 'Preview', icon: '👁️' },
    { id: 'job-description' as const, label: 'Match JD', icon: '📄' },
  ]



  return (
    <div className="bg-white/95 backdrop-blur-sm border-l border-border-subtle flex flex-col h-full w-full custom-scrollbar transition-all duration-300 shadow-sm">
      {/* Tabs */}
      <div className="flex items-center border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-transparent">
        {tabs.map((tab) => (
          <Tooltip 
            key={tab.id}
            text={
              tab.id === 'preview' ? 'Live preview of your resume' :
              'Match your resume against a job description'
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
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
            {resumeData && (resumeData.name || resumeData.sections?.length > 0) ? (
              <div className="flex flex-col h-full">
                <div className="mb-3 sticky top-0 bg-white/95 backdrop-blur-md px-4 pt-3 pb-2 z-10 border-b border-border-subtle shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-text-primary">Preview</span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium capitalize shadow-sm">
                        {template}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">Live updates as you edit</p>
                </div>
                <div className="flex-1 flex items-center justify-center py-8 px-4 overflow-y-auto custom-scrollbar">
                  <div className="relative w-full">
                    <div className="absolute -left-8 top-0 bottom-0 flex items-center">
                      <div className="text-xs font-mono text-slate-400 tracking-wider">PAGE 1</div>
                    </div>
                    <div className="bg-white rounded shadow-2xl overflow-visible">
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
                        constrained={true}
                      />
                    </div>
                    <div className="absolute -right-8 top-0 bottom-0 flex items-center">
                      <div className="text-xs font-mono text-slate-400 tracking-wider">PAGE 1</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm text-text-secondary mb-1">No resume data</p>
                  <p className="text-xs text-text-muted">Start editing to see live preview</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'job-description' && resumeData && (
          <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 border-b border-border-subtle bg-white/95 backdrop-blur-md px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">Match JD</span>
                  <span className="text-xs text-text-muted">
                    Score is based on the selected job description
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {isAnalyzing && (
                    <span className="text-xs text-text-muted">Analyzing…</span>
                  )}
                  {atsScore !== null && (
                    <div className="flex items-center gap-2">
                      <div className="relative inline-flex h-11 w-11 items-center justify-center">
                        <svg viewBox="0 0 36 36" className="h-11 w-11">
                          <path
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                          />
                          <path
                            className={atsScore >= 80 ? 'text-green-500' : atsScore >= 60 ? 'text-blue-500' : atsScore >= 40 ? 'text-yellow-500' : 'text-red-500'}
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${atsScore}, 100`}
                            d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-sm font-bold ${atsScore >= 80 ? 'text-green-600' : atsScore >= 60 ? 'text-blue-600' : atsScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {Math.round(atsScore)}%
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          Match Score
                        </span>
                        <span className="text-xs text-gray-600">
                          {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Strong' : atsScore >= 40 ? 'Fair' : 'Needs Work'}
                        </span>
                      </div>
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
      </div>
    </div>
  )
}

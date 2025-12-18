'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import JobDescriptionMatcher from '@/components/AI/JobDescriptionMatcher'
import config from '@/lib/config'
import Tooltip from '@/components/Shared/Tooltip'


interface RightPanelProps {
  activeTab?: 'live' | 'match' | 'comments'
  onTabChange?: (tab: 'live' | 'match' | 'comments') => void
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
  activeTab = 'live', 
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
      // Extract text from live preview instead of raw resume data
      let previewText = '';
      let previewExtractionSuccess = false;
      
      try {
        // Ensure we're on the 'live' tab to see preview (if available)
        const originalTab = activeTab;
        if (activeTab !== 'live' && onTabChange) {
          // Temporarily switch to live tab to ensure preview is rendered
          onTabChange('live');
          // Wait for tab switch to render
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Wait for preview container to be ready with retry mechanism
        const maxRetries = 5;
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
        
        // Restore original tab if we switched
        if (originalTab !== 'live' && originalTab && onTabChange) {
          // Don't restore immediately - let user see the live preview if they want
          // onTabChange(originalTab);
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
            console.log(`📄 Extracted preview text length: ${previewText.length} (retry: ${retryCount})`);
          } else {
            console.warn('Preview container found but text content too short:', previewText.length);
          }
        } else {
          console.warn(`Preview container not found after ${maxRetries} retries, falling back to resume data`);
        }
      } catch (e) {
        console.warn('Failed to extract preview text, falling back to resume data:', e);
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
    { id: 'live' as const, label: 'Live', icon: '⚡' },
    { id: 'match' as const, label: 'Match JD', icon: '🎯' },
    { id: 'comments' as const, label: 'Comments', icon: '💬' },
  ]



  return (
    <div className="bg-white/95 backdrop-blur-sm border-l border-border-subtle flex flex-col h-full w-full custom-scrollbar transition-all duration-300 shadow-sm">
      {/* Tabs */}
      <div className="flex items-center border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-transparent">
        {tabs.map((tab) => (
          <Tooltip 
            key={tab.id}
            text={
              tab.id === 'live' ? 'Live preview of your resume' :
              tab.id === 'match' ? 'Match your resume against job descriptions' :
              'View and manage comments on your resume'
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


        {activeTab === 'comments' && (
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Comments</h3>
                <Tooltip text="Add a new comment to collaborate on your resume" color="blue" position="bottom">
                  <button className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all duration-200 shadow-sm hover:shadow-md">
                    + Add Comment
                  </button>
                </Tooltip>
              </div>
              <div className="text-center py-12 text-text-muted">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Add comments to collaborate with your team</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'match' && resumeData && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0">
              <JobDescriptionMatcher
                resumeData={resumeData}
                onResumeUpdate={onResumeUpdate}
                standalone={false}
                initialJobDescription={deepLinkedJD || undefined}
                currentJobDescriptionId={activeJobDescriptionId || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-primary-50/20 to-transparent custom-scrollbar">
            {resumeData && (resumeData.name || resumeData.sections?.length > 0) ? (
              <div className="flex flex-col h-full">
                <div className="mb-3 sticky top-0 bg-white/95 backdrop-blur-md px-4 pt-3 pb-2 z-10 border-b border-border-subtle shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-text-primary">Live Preview</span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium capitalize shadow-sm">
                        {template}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Auto-save enabled</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">Real-time CV preview</p>
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
                    constrained={true}
                  />
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
      </div>
    </div>
  )
}


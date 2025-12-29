'use client'
import { useState } from 'react'
import { deriveJobMetadataFromText, type JobMetadata } from '@/lib/utils/jobDescriptionParser'
import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  onSaveSuccess?: () => void
}

export default function JobDescriptionParser({ onSaveSuccess }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [jobDescriptionText, setJobDescriptionText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedMetadata, setParsedMetadata] = useState<JobMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scrapedKeywords, setScrapedKeywords] = useState<any>(null)

  const handleParseFromText = async () => {
    if (!jobDescriptionText.trim()) {
      setError('Please enter a job description')
      return
    }

    if (jobDescriptionText.trim().length < 50) {
      setError('Job description is too short. Please provide at least 50 characters.')
      return
    }

    setIsParsing(true)
    setError(null)
    setJobDescription('')
    setParsedMetadata(null)
    setScrapedKeywords(null)

    try {
      const headers = await getAuthHeadersAsync()
      headers['Content-Type'] = 'application/json'

      const response = await fetch(`${config.apiBase}/api/ai/extract_job_keywords`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ job_description: jobDescriptionText.trim() }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}` }
        }
        throw new Error(errorData.detail || `Failed to extract keywords (HTTP ${response.status})`)
      }

      const result = await response.json()
      
      if (result.success) {
        setJobDescription(jobDescriptionText.trim())
        setScrapedKeywords(result)
        
        const metadata = deriveJobMetadataFromText(jobDescriptionText.trim()) || {}
        
        if (result.technical_keywords || result.general_keywords) {
          metadata.skills = result.technical_keywords || metadata.skills || []
          metadata.keywords = result.general_keywords || metadata.keywords || []
          metadata.soft_skills = result.soft_skills || metadata.soft_skills || []
        }
        
        setParsedMetadata(metadata)
      } else {
        throw new Error('Failed to extract keywords from job description')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse job description')
    } finally {
      setIsParsing(false)
    }
  }

  const handleParse = () => {
    handleParseFromText()
  }

  const handleSave = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    if (!isAuthenticated || !user?.email) {
      setError('Please sign in to save job descriptions')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const metadata = parsedMetadata || deriveJobMetadataFromText(jobDescription)
      
      const payload: any = {
        title: metadata?.title || 'Untitled Role',
        company: metadata?.company || null,
        content: jobDescription,
        url: null,
        skills: scrapedKeywords?.technical_keywords || metadata?.skills || [],
        extracted_keywords: {
          technical_keywords: scrapedKeywords?.technical_keywords || metadata?.skills || [],
          general_keywords: scrapedKeywords?.general_keywords || metadata?.keywords || [],
          soft_skills: scrapedKeywords?.soft_skills || metadata?.soft_skills || [],
          priority_keywords: scrapedKeywords?.high_priority_keywords || metadata?.keywords || [],
          high_frequency_keywords: scrapedKeywords?.high_intensity_keywords || metadata?.high_frequency_keywords || [],
        },
        ats_insights: metadata?.ats_insights || null,
      }

      const headers = await getAuthHeadersAsync()
      headers['Content-Type'] = 'application/json'

      const response = await fetch(`${config.apiBase}/api/job-descriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}` }
        }
        throw new Error(errorData.detail || `Failed to save job description (HTTP ${response.status})`)
      }

      const result = await response.json()
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jobSaved', {
          detail: { jobId: result.id }
        }))
      }

      setJobDescriptionText('')
      setJobDescription('')
      setParsedMetadata(null)
      setScrapedKeywords(null)
      setError(null)

      if (onSaveSuccess) {
        onSaveSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job description')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-[28px] border border-border-subtle shadow-card mb-6 overflow-hidden">
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="font-semibold text-lg text-gray-900">Job Description Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">Paste job description text to extract keywords</p>
      </div>
      
      <div className={`grid grid-cols-1 lg:grid-cols-2 transition-all ${parsedMetadata ? 'min-h-[500px]' : 'min-h-[200px]'}`}>
        <div className={`border-r border-border-subtle transition-all ${parsedMetadata ? 'p-6' : 'p-6'}`}>
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-100 rounded-lg flex items-center justify-center w-8 h-8">
              <span className="text-blue-600 font-semibold text-sm">1</span>
            </div>
            <h3 className="font-semibold text-base text-gray-900">Input Job Description</h3>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-full max-w-md space-y-4">
              <textarea
                value={jobDescriptionText}
                onChange={(e) => {
                  setJobDescriptionText(e.target.value)
                  setParsedMetadata(null)
                  setJobDescription('')
                  setScrapedKeywords(null)
                  setError(null)
                }}
                placeholder="Paste the full job description here..."
                rows={parsedMetadata ? 12 : 8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-none"
              />

              <button
                onClick={handleParse}
                disabled={!jobDescriptionText.trim() || isParsing}
                className="w-full bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all px-4 py-2.5 text-sm"
              >
                {isParsing ? 'Parsing...' : 'Parse Job Description'}
              </button>

              {!isAuthenticated && (
                <p className="text-xs text-gray-500 text-center">
                  Please sign in to save job descriptions
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Scraped Keywords */}
        <div className={`bg-gray-50 transition-all ${parsedMetadata ? 'p-6' : 'p-4'}`}>
          <div className={`flex items-center gap-2 transition-all ${parsedMetadata ? 'mb-4' : 'mb-3'}`}>
            <div className={`bg-green-100 rounded-lg flex items-center justify-center transition-all ${parsedMetadata ? 'w-8 h-8' : 'w-6 h-6'}`}>
              <span className={`text-green-600 font-semibold transition-all ${parsedMetadata ? 'text-sm' : 'text-xs'}`}>2</span>
            </div>
            <h3 className={`font-semibold text-gray-900 transition-all ${parsedMetadata ? 'text-base' : 'text-sm'}`}>Scraped Keywords</h3>
          </div>

          {error && (
            <div className={`bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4 transition-all ${parsedMetadata ? 'p-3 text-sm' : 'p-2 text-xs'}`}>
              {error}
            </div>
          )}

          {parsedMetadata ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Job Information</h4>
                <div className="space-y-2 text-sm">
                  {parsedMetadata.title && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Title:</span>
                      <span className="text-gray-900 font-medium">{parsedMetadata.title}</span>
                    </div>
                  )}
                  {parsedMetadata.company && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company:</span>
                      <span className="text-gray-900 font-medium">{parsedMetadata.company}</span>
                    </div>
                  )}
                  {parsedMetadata.jobType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 font-medium">{parsedMetadata.jobType}</span>
                    </div>
                  )}
                </div>
              </div>

              {scrapedKeywords?.technical_keywords && scrapedKeywords.technical_keywords.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedKeywords.technical_keywords.slice(0, 20).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {scrapedKeywords?.general_keywords && scrapedKeywords.general_keywords.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedKeywords.general_keywords.slice(0, 20).map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {scrapedKeywords?.soft_skills && scrapedKeywords.soft_skills.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Soft Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedKeywords.soft_skills.slice(0, 15).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!jobDescription.trim() || isSaving || !isAuthenticated}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Job'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🔍</span>
                </div>
                <p className="text-xs">Paste text to see extracted keywords</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
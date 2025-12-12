'use client'
import { useState } from 'react'
import { deriveJobMetadataFromText, type JobMetadata } from '@/lib/utils/jobDescriptionParser'
import config from '@/lib/config'
import { getAuthHeaders } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  onSaveSuccess?: () => void
}

export default function JobDescriptionParser({ onSaveSuccess }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [jobDescription, setJobDescription] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedMetadata, setParsedMetadata] = useState<JobMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleParse = () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      const metadata = deriveJobMetadataFromText(jobDescription)
      setParsedMetadata(metadata)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse job description')
    } finally {
      setIsParsing(false)
    }
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
        skills: metadata?.skills || [],
        extracted_keywords: {
          technical_keywords: metadata?.skills || [],
          general_keywords: metadata?.keywords || [],
          soft_skills: metadata?.soft_skills || [],
          priority_keywords: metadata?.keywords || [],
          high_frequency_keywords: metadata?.high_frequency_keywords || [],
        },
        ats_insights: metadata?.ats_insights || null,
      }

      const headers = getAuthHeaders()
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

      setJobDescription('')
      setParsedMetadata(null)
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Job Description Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">Parse job descriptions and extract keywords</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
        {/* Left Panel - Parse Job Description */}
        <div className="p-6 border-r border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">1</span>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Parse Job Description</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value)
                  setParsedMetadata(null)
                  setError(null)
                }}
                placeholder="Paste the job description here..."
                rows={12}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-none"
              />
            </div>

            <button
              onClick={handleParse}
              disabled={!jobDescription.trim() || isParsing}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Right Panel - Scraped Keywords */}
        <div className="p-6 bg-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-semibold text-sm">2</span>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Scraped Keywords</h3>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm mb-4">
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

              {parsedMetadata.skills && parsedMetadata.skills.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedMetadata.skills.map((skill, index) => (
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

              {parsedMetadata.keywords && parsedMetadata.keywords.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedMetadata.keywords.map((keyword, index) => (
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

              <button
                onClick={handleSave}
                disabled={!jobDescription.trim() || isSaving || !isAuthenticated}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Job'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-sm">Parse a job description to see extracted keywords</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
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
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Parse & Save Job Description</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📋 Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value)
              setParsedMetadata(null)
              setError(null)
            }}
            placeholder="Paste the job description here... It will be automatically parsed to extract title, company, skills, and keywords."
            rows={10}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-y"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {parsedMetadata && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Parsed Information:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {parsedMetadata.title && (
                <div>
                  <span className="font-medium text-gray-600">Title:</span>{' '}
                  <span className="text-gray-900">{parsedMetadata.title}</span>
                </div>
              )}
              {parsedMetadata.company && (
                <div>
                  <span className="font-medium text-gray-600">Company:</span>{' '}
                  <span className="text-gray-900">{parsedMetadata.company}</span>
                </div>
              )}
              {parsedMetadata.jobType && (
                <div>
                  <span className="font-medium text-gray-600">Job Type:</span>{' '}
                  <span className="text-gray-900">{parsedMetadata.jobType}</span>
                </div>
              )}
              {parsedMetadata.remoteStatus && (
                <div>
                  <span className="font-medium text-gray-600">Work Type:</span>{' '}
                  <span className="text-gray-900">{parsedMetadata.remoteStatus}</span>
                </div>
              )}
              {parsedMetadata.skills && parsedMetadata.skills.length > 0 && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-600">Skills:</span>{' '}
                  <span className="text-gray-900">{parsedMetadata.skills.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleParse}
            disabled={!jobDescription.trim() || isParsing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isParsing ? 'Parsing...' : 'Parse Job Description'}
          </button>
          <button
            onClick={handleSave}
            disabled={!jobDescription.trim() || isSaving || !isAuthenticated}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Job'}
          </button>
        </div>

        {!isAuthenticated && (
          <p className="text-xs text-gray-500 text-center">
            Please sign in to save job descriptions
          </p>
        )}
      </div>
    </div>
  )
}


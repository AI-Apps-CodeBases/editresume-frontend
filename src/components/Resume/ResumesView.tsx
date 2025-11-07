'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'

interface Resume {
  id: number
  name: string
  title?: string
  template?: string
  created_at?: string
  updated_at?: string
  latest_version_id?: number | null
  latest_version_number?: number | null
  version_count?: number
  match_count?: number
  recent_matches?: Array<{
    id: number
    job_description_id: number
    jd_title?: string
    jd_company?: string
    score: number
    keyword_coverage?: number
    resume_version_id?: number | null
    resume_version_number?: number | null
    created_at?: string
  }>
}

interface Props {
  onBack: () => void
}

export default function ResumesView({ onBack }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [savedResumes, setSavedResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSavedResumes = useCallback(async () => {
    if (!isAuthenticated || !user?.email) return
    
    try {
      const resumesRes = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (resumesRes.ok) {
        const resumesData = await resumesRes.json()
        setSavedResumes(resumesData.resumes || [])
      }
    } catch (e) {
      console.error('Failed to load resumes:', e)
    }
  }, [isAuthenticated, user?.email])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setLoading(true)
      fetchSavedResumes().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user?.email, fetchSavedResumes])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your saved resumes.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Editor
              </button>
              <h1 className="text-2xl font-bold text-gray-900">📄 Master Resumes</h1>
            </div>
            <button
              onClick={fetchSavedResumes}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {savedResumes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No saved resumes yet</h3>
              <p className="text-gray-600 mb-6">Save your resume from the editor to create a master resume that you can match with job descriptions.</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Create Resume
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedResumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{resume.name}</h3>
                      {resume.title && (
                        <p className="text-sm text-gray-600 mb-2">{resume.title}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {resume.version_count && (
                          <span>v{resume.latest_version_number || resume.version_count} •</span>
                        )}
                        {resume.created_at && (
                          <span>Created: {new Date(resume.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        window.location.href = `/editor?resumeId=${resume.id}`
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all font-semibold text-center"
                    >
                      Edit
                    </button>
                    {resume.match_count && resume.match_count > 0 && (
                      <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                        {resume.match_count} match{resume.match_count > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import JobDetailView from './JobDetailView'

interface JobDescription {
  id: number
  title: string
  company?: string
  source?: string
  url?: string
  max_salary?: number
  status?: string
  follow_up_date?: string
  important_emoji?: string
  created_at?: string
  last_match?: {
    id: number
    score: number
    resume_id: number
    resume_name?: string | null
    resume_version_id?: number | null
    created_at?: string
  } | null
  all_matches?: Array<{
    id: number
    score: number
    resume_id: number
    resume_name?: string | null
    resume_version_id?: number | null
    created_at?: string
  }>
}

interface Props {
  onBack: () => void
}

export default function JobsView({ onBack }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [savedJDs, setSavedJDs] = useState<JobDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  const fetchData = async () => {
    if (!isAuthenticated || !user?.email) {
      setLoading(false)
      return
    }
    
    setLoading(true)

    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        const jds = Array.isArray(data) ? data : data.results || []
        
        const jdsWithMatches = await Promise.all(jds.map(async (jd: any) => {
          try {
            const matchesRes = await fetch(`${config.apiBase}/api/job-descriptions/${jd.id}/matches`)
            if (matchesRes.ok) {
              const matchesData = await matchesRes.json()
              jd.all_matches = Array.isArray(matchesData) ? matchesData : matchesData.matches || []
            }
          } catch (e) {
            console.error('Failed to load matches for JD:', jd.id, e)
            jd.all_matches = []
          }
          return jd
        }))
        
        setSavedJDs(jdsWithMatches)
      }
    } catch (e) {
      console.error('Failed to load job descriptions', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [isAuthenticated, user?.email])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your saved jobs and resumes.</p>
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

  if (selectedJobId) {
    return (
      <JobDetailView
        jobId={selectedJobId}
        onBack={() => {
          setSelectedJobId(null)
          fetchData()
        }}
        onUpdate={fetchData}
      />
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'bookmarked': return 'bg-gray-100 text-gray-700'
      case 'applied': return 'bg-blue-100 text-blue-700'
      case 'interview_set': return 'bg-purple-100 text-purple-700'
      case 'interviewing': return 'bg-yellow-100 text-yellow-700'
      case 'negotiating': return 'bg-orange-100 text-orange-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'bookmarked': return '📌 Bookmarked'
      case 'applied': return '📝 Applied'
      case 'interview_set': return '📅 Interview Set'
      case 'interviewing': return '💼 Interviewing'
      case 'negotiating': return '🤝 Negotiating'
      case 'accepted': return '✅ Accepted'
      case 'rejected': return '❌ Rejected'
      default: return '📌 Bookmarked'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="w-full px-6 py-4">
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
              <h1 className="text-2xl font-bold text-gray-900">💼 Saved Job Descriptions</h1>
            </div>
            <button
              onClick={fetchData}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {savedJDs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗂️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No saved jobs yet</h3>
              <p className="text-gray-600">Use the browser extension to save LinkedIn jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                  <tr>
                    <th className="p-3">Important</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Max Salary</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date Saved</th>
                    <th className="p-3">Follow Up</th>
                    <th className="p-3">Source</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {savedJDs.map((jd) => (
                    <tr key={jd.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        {jd.important_emoji && <span className="text-2xl">{jd.important_emoji}</span>}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedJobId(jd.id)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {jd.title}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedJobId(jd.id)}
                          className="text-gray-700 hover:text-blue-600 hover:underline text-left"
                        >
                          {jd.company || '-'}
                        </button>
                      </td>
                      <td className="p-3 text-gray-700">
                        {jd.max_salary ? `$${jd.max_salary.toLocaleString()}/yr` : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(jd.status)}`}>
                          {getStatusLabel(jd.status)}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-sm">
                        {jd.created_at ? new Date(jd.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-gray-500 text-sm">
                        {jd.follow_up_date ? new Date(jd.follow_up_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-gray-700 text-sm">{jd.source || 'extension'}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              window.location.href = `/editor?jdId=${jd.id}`
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
                          >
                            Analyze
                          </button>
                          {jd.last_match && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold whitespace-nowrap">
                                  ATS Score: {jd.last_match?.score}%
                                </span>
                                {jd.last_match?.resume_name && (
                                  <span className="px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded text-xs whitespace-nowrap">
                                    Resume: {jd.last_match?.resume_name}
                                  </span>
                                )}
                                {jd.last_match?.resume_version_id && (
                                  <a
                                    href={`${config.apiBase}/api/resume/version/${jd.last_match?.resume_version_id}`}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-100 whitespace-nowrap"
                                    target="_blank"
                                  >
                                    View Latest Version
                                  </a>
                                )}
                              </div>
                              {jd.all_matches && jd.all_matches.length > 1 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1 font-medium">All Matched Versions ({jd.all_matches.length}):</div>
                                  <div className="flex flex-wrap gap-2">
                                    {jd.all_matches.map((match: any, idx: number) => (
                                      <div key={match.id} className="flex items-center gap-1">
                                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                          match.score >= 80 ? 'bg-green-100 text-green-700 border border-green-300' :
                                          match.score >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                          'bg-orange-100 text-orange-700 border border-orange-300'
                                        }`}>
                                          ATS: {match.score}%
                                        </span>
                                        {match.resume_version_id && (
                                          <a
                                            href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100 whitespace-nowrap"
                                            target="_blank"
                                            title={`Version from ${new Date(match.created_at).toLocaleDateString()}`}
                                          >
                                            v{idx + 1}
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`Are you sure you want to delete "${jd.title}"? This action cannot be undone.`)) return
                              
                              const deleteBtn = e.currentTarget
                              const originalText = deleteBtn.textContent
                              deleteBtn.disabled = true
                              deleteBtn.textContent = 'Deleting...'
                              
                              try {
                                const url = `${config.apiBase}/api/job-descriptions/${jd.id}${user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''}`
                                
                                const res = await fetch(url, { 
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  }
                                })
                                
                                if (res.ok) {
                                  setSavedJDs((prev) => prev.filter((x) => x.id !== jd.id))
                                  const successMsg = document.createElement('div')
                                  successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                                  successMsg.textContent = '✅ Job description deleted successfully'
                                  document.body.appendChild(successMsg)
                                  setTimeout(() => {
                                    document.body.removeChild(successMsg)
                                  }, 3000)
                                } else {
                                  const errorData = await res.json().catch(() => ({ detail: 'Failed to delete job description' }))
                                  alert(`Failed to delete: ${errorData.detail || `HTTP ${res.status}`}`)
                                  deleteBtn.disabled = false
                                  deleteBtn.textContent = originalText
                                }
                              } catch (e) {
                                console.error('Failed to delete job description:', e)
                                alert(`Failed to delete job description: ${e instanceof Error ? e.message : 'Network error'}`)
                                deleteBtn.disabled = false
                                deleteBtn.textContent = originalText
                              }
                            }}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            title="Delete this job description"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


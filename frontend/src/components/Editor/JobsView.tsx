'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import JobDetailView from './JobDetailView'
import { BriefcaseIcon, FolderIcon, LockIcon, BookmarkIcon, CheckIcon, XIcon, CalendarIcon, HandshakeIcon, EditIcon } from '@/components/Icons'

interface JobResumeSummary {
  id: number
  score: number
  resume_id?: number
  resume_name?: string | null
  resume_version_id?: number | null
  resume_version_label?: string | null
  keyword_coverage?: number | null
  matched_keywords?: string[]
  missing_keywords?: string[]
  updated_at?: string | null
  created_at?: string | null
}

interface JobDescription {
  id: number
  title: string
  company?: string
  source?: string
  url?: string
  location?: string
  work_type?: string
  job_type?: string
  content?: string
  max_salary?: number
  status?: string
  follow_up_date?: string
  important_emoji?: string
  created_at?: string
  extracted_keywords?: any
  priority_keywords?: any
  high_frequency_keywords?: any
  ats_insights?: {
    score_snapshot?: {
      overall_score?: number
      keyword_coverage?: number
      estimated_keyword_score?: number
      matched_keywords_count?: number
      total_keywords?: number
      missing_keywords_sample?: string[]
      analysis_summary?: string
    } | null
    [key: string]: unknown
  } | null
  best_resume_version?: JobResumeSummary | null
  resume_versions?: JobResumeSummary[]
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
      const { auth } = await import('@/lib/firebaseClient')
      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`, {
        headers
      })
      if (res.ok) {
        const data = await res.json()
        const jds = Array.isArray(data) ? data : data.results || []
        setSavedJDs(jds)
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

  // Listen for job saved events to refresh the list
  useEffect(() => {
    const handleJobSaved = () => {
      fetchData()
    }
    
    window.addEventListener('jobSaved', handleJobSaved)
    return () => {
      window.removeEventListener('jobSaved', handleJobSaved)
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <LockIcon size={64} color="#0f62fe" className="opacity-80" />
          </div>
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
      case 'applied': return 'bg-primary-100 text-primary-700'
      case 'interview_set': return 'bg-purple-100 text-purple-700'
      case 'interviewing': return 'bg-yellow-100 text-yellow-700'
      case 'negotiating': return 'bg-orange-100 text-orange-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status?: string) => {
    const iconSize = 14
    switch (status) {
      case 'bookmarked': return <BookmarkIcon size={iconSize} color="currentColor" />
      case 'applied': return <EditIcon size={iconSize} color="currentColor" />
      case 'interview_set': return <CalendarIcon size={iconSize} color="currentColor" />
      case 'interviewing': return <BriefcaseIcon size={iconSize} color="currentColor" />
      case 'negotiating': return <HandshakeIcon size={iconSize} color="currentColor" />
      case 'accepted': return <CheckIcon size={iconSize} color="currentColor" />
      case 'rejected': return <XIcon size={iconSize} color="currentColor" />
      default: return <BookmarkIcon size={iconSize} color="currentColor" />
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'bookmarked': return 'Bookmarked'
      case 'applied': return 'Applied'
      case 'interview_set': return 'Interview Set'
      case 'interviewing': return 'Interviewing'
      case 'negotiating': return 'Negotiating'
      case 'accepted': return 'Accepted'
      case 'rejected': return 'Rejected'
      default: return 'Bookmarked'
    }
  }

  const getScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
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
              <div className="flex items-center gap-3">
                <BriefcaseIcon size={28} color="#0f62fe" />
                <h1 className="text-2xl font-bold text-gray-900">Saved Job Descriptions</h1>
              </div>
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
              <div className="flex justify-center mb-4">
                <FolderIcon size={64} color="#0f62fe" className="opacity-60" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No saved jobs yet</h3>
              <p className="text-gray-600">Use the browser extension to save LinkedIn jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 text-left text-sm text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold">Important</th>
                    <th className="p-4 font-semibold">Title</th>
                    <th className="p-4 font-semibold">Company</th>
                    <th className="p-4 font-semibold">Max Salary</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Best Match</th>
                    <th className="p-4 font-semibold">Date Saved</th>
                    <th className="p-4 font-semibold">Follow Up</th>
                    <th className="p-4 font-semibold">Source</th>
                    <th className="p-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {savedJDs.map((jd) => {
                    const bestMatch = jd.best_resume_version
                    const scoreSnapshot =
                      jd.ats_insights && typeof jd.ats_insights === 'object'
                        ? (jd.ats_insights as any).score_snapshot ?? null
                        : null
                    const overallScore =
                      bestMatch?.score ?? (typeof scoreSnapshot?.overall_score === 'number' ? scoreSnapshot.overall_score : null)
                    const ringScore = overallScore !== null ? Math.max(0, Math.min(100, overallScore)) : 0
                    const ringStrokeClass = getScoreColor(overallScore).replace('text-', 'stroke-')
                    return (
                      <tr key={jd.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          {jd.important_emoji && <span className="text-2xl">{jd.important_emoji}</span>}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedJobId(jd.id)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          >
                            {jd.title}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedJobId(jd.id)}
                            className="text-gray-700 hover:text-blue-600 hover:underline text-left"
                          >
                            {jd.company || '-'}
                          </button>
                        </td>
                        <td className="p-4 text-gray-700">
                          {jd.max_salary ? `$${jd.max_salary.toLocaleString()}/yr` : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(jd.status)}`}>
                            {getStatusIcon(jd.status)}
                            {getStatusLabel(jd.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          {overallScore !== null ? (
                            <div className="flex items-center justify-center">
                              <div className="relative inline-flex h-12 w-12 items-center justify-center">
                                <svg viewBox="0 0 36 36" className="h-12 w-12">
                                  <path
                                    className="text-gray-200"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="none"
                                    d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                  />
                                  <path
                                    className={ringStrokeClass}
                                    strokeLinecap="round"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeDasharray={`${ringScore}, 100`}
                                    d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className={`text-sm font-semibold ${getScoreColor(overallScore)}`}>
                                    {overallScore}%
                                  </span>
                                  <span className="text-[10px] uppercase text-gray-400">ATS</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No match yet</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-500 text-sm">
                          {jd.created_at ? new Date(jd.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-gray-500 text-sm">
                          {jd.follow_up_date ? new Date(jd.follow_up_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-gray-700 text-sm">{jd.source || 'extension'}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => setSelectedJobId(jd.id)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 whitespace-nowrap transition-colors"
                            >
                              View Details
                            </button>
                            {bestMatch?.resume_id && (
                              <button
                                onClick={() => {
                                  const versionQuery = bestMatch.resume_version_id ? `&resumeVersionId=${bestMatch.resume_version_id}` : ''
                                  window.location.href = `/editor?resumeId=${bestMatch.resume_id}${versionQuery}&jdId=${jd.id}`
                                }}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap transition-colors"
                              >
                                Open Editor
                              </button>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


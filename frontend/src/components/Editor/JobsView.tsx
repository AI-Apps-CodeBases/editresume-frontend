'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'
import JobDetailView from './JobDetailView'
import JobDescriptionParser from './JobDescriptionParser'
import { BriefcaseIcon, FolderIcon, LockIcon, BookmarkIcon, CheckIcon, XIcon, CalendarIcon, HandshakeIcon, EditIcon } from '@/components/Icons'
import { StarRating } from '@/components/Shared/StarRating'

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
  importance?: number // 0-5 stars
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
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

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
      const res = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`, {
        headers,
        timeout: 25000,
      })
      if (res.ok) {
        const data = await res.json()
        const jds = Array.isArray(data) ? data : data.results || []
        setSavedJDs(jds)
      } else {
        console.error('Failed to load job descriptions:', res.status, res.statusText)
      }
    } catch (e) {
      console.error('Failed to load job descriptions', e)
      if (e instanceof Error && e.message.includes('timeout')) {
        alert('Request timed out. The server may be experiencing issues. Please try again.')
      }
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        const dropdown = dropdownRefs.current[openDropdownId]
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdownId(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

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
      case 'bookmarked': return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'applied': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'interview_set': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'interviewing': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'negotiating': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'accepted': return 'bg-green-50 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
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

  const getATSScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', ring: 'bg-gray-100' }
    if (score >= 80) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', ring: 'bg-green-500' }
    if (score >= 60) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', ring: 'bg-yellow-500' }
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'bg-red-500' }
  }

  const handleDelete = async (jd: JobDescription) => {
    if (!confirm(`Are you sure you want to delete "${jd.title}"? This action cannot be undone.`)) return
    
    try {
      const url = `${config.apiBase}/api/job-descriptions/${jd.id}${user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''}`
      
      const res = await fetchWithTimeout(url, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000,
      })
      
      if (res.ok) {
        setSavedJDs((prev) => prev.filter((x) => x.id !== jd.id))
        setOpenDropdownId(null)
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
      }
    } catch (e) {
      console.error('Failed to delete job description:', e)
      alert(`Failed to delete job description: ${e instanceof Error ? e.message : 'Network error'}`)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex flex-col">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20 flex-shrink-0">
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

      <div className="flex-1 w-full px-6 py-8">
        <div className="space-y-6">
          <JobDescriptionParser onSaveSuccess={fetchData} />
          
          <div className="bg-white rounded-[28px] border border-border-subtle shadow-card p-6">
            {savedJDs.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex justify-center mb-4">
                  <FolderIcon size={64} color="#0f62fe" className="opacity-60" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs saved yet</h3>
                <p className="text-gray-600">Save jobs from LinkedIn using the extension.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Importance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                        ATS Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Date Saved
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-white">
                    {savedJDs.map((jd) => {
                      const bestMatch = jd.best_resume_version
                      const scoreSnapshot =
                        jd.ats_insights && typeof jd.ats_insights === 'object'
                          ? (jd.ats_insights as any).score_snapshot ?? null
                          : null
                      const overallScore =
                        bestMatch?.score ?? (typeof scoreSnapshot?.overall_score === 'number' ? scoreSnapshot.overall_score : null)
                      const scoreColors = getATSScoreColor(overallScore)
                      const isDropdownOpen = openDropdownId === jd.id

                      return (
                        <tr 
                          key={jd.id} 
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-4 py-5">
                            <div className="flex items-center">
                              <StarRating
                                rating={jd.importance || 0}
                                onRatingChange={async (newRating) => {
                                  try {
                                    const { auth } = await import('@/lib/firebaseClient')
                                    const currentUser = auth.currentUser
                                    const token = currentUser ? await currentUser.getIdToken() : null
                                    const headers: HeadersInit = { 'Content-Type': 'application/json' }
                                    if (token) {
                                      headers['Authorization'] = `Bearer ${token}`
                                    }
                                    
                                    const res = await fetchWithTimeout(`${config.apiBase}/api/job-descriptions/${jd.id}${user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''}`, {
                                      method: 'PATCH',
                                      headers,
                                      body: JSON.stringify({ importance: newRating }),
                                      timeout: 15000,
                                    })
                                    
                                    if (res.ok) {
                                      setSavedJDs((prev) =>
                                        prev.map((job) =>
                                          job.id === jd.id ? { ...job, importance: newRating } : job
                                        )
                                      )
                                    } else {
                                      console.error('Failed to update importance')
                                    }
                                  } catch (e) {
                                    console.error('Failed to update importance:', e)
                                  }
                                }}
                                interactive={true}
                                size="sm"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <button
                              onClick={() => setSelectedJobId(jd.id)}
                              className="text-left group-hover:text-blue-600 transition-colors"
                            >
                              <div className="font-semibold text-text-primary text-sm leading-tight">
                                {jd.title}
                              </div>
                              {jd.company && (
                                <div className="text-xs text-text-muted mt-1">
                                  {jd.company}
                                </div>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-5">
                            {overallScore !== null ? (
                              <div className="flex items-center">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreColors.border} ${scoreColors.bg}`}>
                                  <div className="relative w-8 h-8 flex items-center justify-center">
                                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                                      <circle
                                        className="text-gray-200"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        fill="none"
                                        cx="16"
                                        cy="16"
                                        r="14"
                                      />
                                      <circle
                                        className={scoreColors.ring}
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={`${overallScore}, 100`}
                                        cx="16"
                                        cy="16"
                                        r="14"
                                      />
                                    </svg>
                                    <span className={`absolute text-xs font-bold ${scoreColors.text}`}>
                                      {Math.round(overallScore)}
                                    </span>
                                  </div>
                                  <span className={`text-sm font-semibold ${scoreColors.text}`}>
                                    {Math.round(overallScore)}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted">No match yet</span>
                            )}
                          </td>
                          <td className="px-4 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(jd.status)}`}>
                              {getStatusIcon(jd.status)}
                              {getStatusLabel(jd.status)}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-sm text-text-muted">
                            {jd.created_at ? new Date(jd.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center justify-end gap-2">
                              {bestMatch?.resume_id && (
                                <button
                                  onClick={() => {
                                    const versionQuery = bestMatch.resume_version_id ? `&resumeVersionId=${bestMatch.resume_version_id}` : ''
                                    window.location.href = `/editor?resumeId=${bestMatch.resume_id}${versionQuery}&jdId=${jd.id}`
                                  }}
                                  className="button-primary text-xs px-4 py-2"
                                >
                                  Optimize Resume
                                </button>
                              )}
                              <div className="relative" ref={(el) => { dropdownRefs.current[jd.id] = el }}>
                                <button
                                  onClick={() => setOpenDropdownId(isDropdownOpen ? null : jd.id)}
                                  className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                  aria-label="More actions"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                                {isDropdownOpen && (
                                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-border-subtle shadow-lg z-50 py-1">
                                    <button
                                      onClick={() => {
                                        setSelectedJobId(jd.id)
                                        setOpenDropdownId(null)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDelete(jd)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
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
    </div>
  )
}

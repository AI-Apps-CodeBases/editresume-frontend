'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import config from '@/lib/config'
import { FileTextIcon, LockIcon } from '@/components/Icons'

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
  const { showAlert, showConfirm } = useModal()
  const [savedResumes, setSavedResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

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

  const getBestMatchScore = (resume: Resume): number | null => {
    if (resume.recent_matches && resume.recent_matches.length > 0) {
      const bestMatch = resume.recent_matches.reduce((best, match) => 
        match.score > (best?.score || 0) ? match : best
      )
      return bestMatch.score
    }
    return null
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    if (score >= 60) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
  }

  const handleDelete = async (resume: Resume) => {
    const confirmed = await showConfirm({
      title: 'Delete Resume',
      message: `Are you sure you want to delete "${resume.name}"? This will permanently delete the resume and all its versions. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '🗑️'
    })
    
    if (!confirmed) return
    
    try {
      const res = await fetch(`${config.apiBase}/api/resumes/${resume.id}?user_email=${encodeURIComponent(user?.email || '')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (res.ok) {
        setSavedResumes((prev) => prev.filter((x) => x.id !== resume.id))
        setOpenDropdownId(null)
        await showAlert({
          title: 'Success',
          message: 'Resume deleted successfully',
          type: 'success',
          icon: '✅'
        })
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to delete resume' }))
        await showAlert({
          title: 'Error',
          message: error.detail || 'Failed to delete resume',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
      await showAlert({
        title: 'Error',
        message: 'Failed to delete resume. Please try again.',
        type: 'error'
      })
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
                <FileTextIcon size={28} color="#0f62fe" />
                <h1 className="text-2xl font-bold text-gray-900">Master Resumes</h1>
              </div>
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

      <div className="flex-1 w-full px-6 py-8">
        <div className="bg-white rounded-[28px] border border-border-subtle shadow-card p-6">
          {savedResumes.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <FileTextIcon size={64} color="#0f62fe" className="opacity-60" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No saved resumes yet</h3>
              <p className="text-gray-600 mb-6">Save your resume from the editor to create a master resume that you can match with job descriptions.</p>
              <button
                onClick={onBack}
                className="button-primary"
              >
                Create Resume
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Resume Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Versions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Best Match
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Matches
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-white">
                  {savedResumes.map((resume) => {
                    const bestMatchScore = getBestMatchScore(resume)
                    const matchScoreColors = bestMatchScore !== null ? getMatchScoreColor(bestMatchScore) : null
                    const isDropdownOpen = openDropdownId === resume.id

                    return (
                      <tr 
                        key={resume.id} 
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-4 py-5">
                          <button
                            onClick={() => {
                              const versionQuery = resume.latest_version_id ? `&resumeVersionId=${resume.latest_version_id}` : ''
                              window.location.href = `/editor?resumeId=${resume.id}${versionQuery}`
                            }}
                            className="text-left group-hover:text-blue-600 transition-colors"
                          >
                            <div className="font-semibold text-text-primary text-sm leading-tight">
                              {resume.name}
                            </div>
                            {resume.title && (
                              <div className="text-xs text-text-muted mt-1">
                                {resume.title}
                              </div>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-5">
                          {resume.template ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                              {resume.template}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          {resume.version_count ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              v{resume.latest_version_number || resume.version_count}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          {bestMatchScore !== null && matchScoreColors ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${matchScoreColors.border} ${matchScoreColors.bg}`}>
                              <span className={`text-sm font-semibold ${matchScoreColors.text}`}>
                                {Math.round(bestMatchScore)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">No matches yet</span>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          {resume.match_count && resume.match_count > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              {resume.match_count} {resume.match_count === 1 ? 'match' : 'matches'}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-sm text-text-muted">
                          {resume.updated_at 
                            ? new Date(resume.updated_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : resume.created_at
                            ? new Date(resume.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const versionQuery = resume.latest_version_id ? `&resumeVersionId=${resume.latest_version_id}` : ''
                                window.location.href = `/editor?resumeId=${resume.id}${versionQuery}`
                              }}
                              className="button-primary text-xs px-4 py-2"
                            >
                              Open Editor
                            </button>
                            <div className="relative" ref={(el) => { dropdownRefs.current[resume.id] = el }}>
                              <button
                                onClick={() => setOpenDropdownId(isDropdownOpen ? null : resume.id)}
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
                                      const versionQuery = resume.latest_version_id ? `&resumeVersionId=${resume.latest_version_id}` : ''
                                      window.location.href = `/editor?resumeId=${resume.id}${versionQuery}`
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
                                      handleDelete(resume)
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
  )
}

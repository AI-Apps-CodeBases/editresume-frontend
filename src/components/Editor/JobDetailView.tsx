'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'

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
  created_at?: string | null
  updated_at?: string | null
}

interface JobCoverLetter {
  id: number
  job_description_id: number
  title: string
  content: string
  version_number: number
  created_at?: string | null
  updated_at?: string | null
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
  best_resume_version?: JobResumeSummary | null
  resume_versions?: JobResumeSummary[]
  cover_letters?: JobCoverLetter[]
}

interface Props {
  jobId: number
  onBack: () => void
  onUpdate?: () => void
}

const STATUS_OPTIONS = [
  { value: 'bookmarked', label: '📌 Bookmarked', color: 'bg-gray-100 text-gray-700' },
  { value: 'applied', label: '📝 Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'interview_set', label: '📅 Interview Set', color: 'bg-purple-100 text-purple-700' },
  { value: 'interviewing', label: '💼 Interviewing', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiating', label: '🤝 Negotiating', color: 'bg-orange-100 text-orange-700' },
  { value: 'accepted', label: '✅ Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '❌ Rejected', color: 'bg-red-100 text-red-700' },
]

const EMOJI_OPTIONS = ['⭐', '🔥', '💎', '🚀', '💼', '🎯', '✨', '🏆', '💪', '🎉']

export default function JobDetailView({ jobId, onBack, onUpdate }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resume' | 'analysis' | 'coverLetters'>('overview')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [resumeOptions, setResumeOptions] = useState<Array<{ id: number; name: string }>>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | ''>('')
  const [loadingResumes, setLoadingResumes] = useState(false)
  const [coverLetters, setCoverLetters] = useState<JobCoverLetter[]>([])
  const [newLetterTitle, setNewLetterTitle] = useState('')
  const [newLetterContent, setNewLetterContent] = useState('')
  const [savingCoverLetter, setSavingCoverLetter] = useState(false)
  const [editingLetterId, setEditingLetterId] = useState<number | null>(null)
  const [editingLetterTitle, setEditingLetterTitle] = useState('')
  const [editingLetterContent, setEditingLetterContent] = useState('')

  useEffect(() => {
    if (jobId && isAuthenticated && user?.email) {
      fetchJobDetails()
    }
  }, [jobId, isAuthenticated, user?.email])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchResumes()
    }
  }, [isAuthenticated, user?.email])

  const fetchJobDetails = async () => {
    if (!user?.email) return
    
    setLoading(true)
    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        setJob(data)
        
        if (data.notes) {
          setNotes(data.notes)
        }
        setCoverLetters(data.cover_letters || [])
        if (!selectedResumeId && data.best_resume_version?.resume_id) {
          setSelectedResumeId(data.best_resume_version.resume_id)
        }
      }
    } catch (e) {
      console.error('Failed to load job details:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchResumes = async () => {
    if (!user?.email) return
    setLoadingResumes(true)
    try {
      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        setResumeOptions(data.resumes || [])
        if (!selectedResumeId && Array.isArray(data.resumes) && data.resumes.length > 0) {
          setSelectedResumeId(data.resumes[0].id)
        }
      }
    } catch (e) {
      console.error('Failed to load resumes:', e)
    } finally {
      setLoadingResumes(false)
    }
  }

  const updateJobField = async (field: string, value: any) => {
    if (!user?.email || !job) return
    
    setSaving(true)
    try {
      const url = `${config.apiBase}/api/job-descriptions/${job.id}?user_email=${encodeURIComponent(user.email)}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      
      if (res.ok) {
        const updated = await res.json()
        setJob(updated)
        if (onUpdate) onUpdate()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to update' }))
        alert(`Failed to update: ${error.detail || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Failed to update job:', e)
      alert('Failed to update job')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    await updateJobField('notes', notes)
  }

  const handleCreateCoverLetter = async () => {
    if (!newLetterContent.trim()) {
      alert('Please enter cover letter content before saving.')
      return
    }
    setSavingCoverLetter(true)
    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLetterTitle.trim() || `Cover Letter v${coverLetters.length + 1}`,
          content: newLetterContent.trim()
        })
      })
      if (res.ok) {
        const created = await res.json()
        setCoverLetters((prev) => [created, ...prev])
        setNewLetterTitle('')
        setNewLetterContent('')
        if (onUpdate) onUpdate()
        fetchJobDetails()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to create cover letter' }))
        alert(error.detail || 'Failed to create cover letter')
      }
    } catch (e) {
      console.error('Failed to create cover letter:', e)
      alert('Failed to create cover letter')
    } finally {
      setSavingCoverLetter(false)
    }
  }

  const handleUpdateCoverLetter = async () => {
    if (!editingLetterId) return
    if (!editingLetterContent.trim()) {
      alert('Cover letter content cannot be empty.')
      return
    }
    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${editingLetterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLetterTitle.trim(),
          content: editingLetterContent.trim()
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setCoverLetters((prev) => prev.map((cl) => (cl.id === updated.id ? updated : cl)))
        setEditingLetterId(null)
        setEditingLetterTitle('')
        setEditingLetterContent('')
        if (onUpdate) onUpdate()
        fetchJobDetails()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to update cover letter' }))
        alert(error.detail || 'Failed to update cover letter')
      }
    } catch (e) {
      console.error('Failed to update cover letter:', e)
      alert('Failed to update cover letter')
    }
  }

  const handleDeleteCoverLetter = async (letterId: number) => {
    if (!confirm('Delete this cover letter? This cannot be undone.')) return
    try {
      const res = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters/${letterId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setCoverLetters((prev) => prev.filter((cl) => cl.id !== letterId))
        if (onUpdate) onUpdate()
        fetchJobDetails()
      } else {
        const error = await res.json().catch(() => ({ detail: 'Failed to delete cover letter' }))
        alert(error.detail || 'Failed to delete cover letter')
      }
    } catch (e) {
      console.error('Failed to delete cover letter:', e)
      alert('Failed to delete cover letter')
    }
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

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
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

  const bestMatch: JobResumeSummary | null = job.best_resume_version
    || (job.resume_versions && job.resume_versions.length > 0 ? job.resume_versions[0] : null)

  const buildHighFrequencyList = (data: any): Array<{ keyword: string; count: number }> => {
    if (!data) return []
    if (Array.isArray(data)) {
      return data
        .map((item: any) => {
          if (!item) return null
          if (typeof item === 'string') return { keyword: item, count: 1 }
          if (Array.isArray(item)) return { keyword: item[0], count: item[1] ?? 1 }
          if (typeof item === 'object') {
            return {
              keyword: item.keyword ?? item.term ?? '',
              count: item.frequency ?? item.count ?? 1
            }
          }
          return null
        })
        .filter((entry): entry is { keyword: string; count: number } => !!entry && !!entry.keyword)
    }
    if (typeof data === 'object') {
      return Object.entries(data).map(([keyword, count]) => ({
        keyword,
        count: typeof count === 'number' ? count : 1
      }))
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return buildHighFrequencyList(parsed)
      } catch {
        return []
      }
    }
    return []
  }

  const buildPriorityKeywords = (data: any): string[] => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    if (typeof data === 'object') {
      return Object.values(data).flatMap((value) => (Array.isArray(value) ? value : []))
    }
    return []
  }

  const highFrequencyList = buildHighFrequencyList(job?.high_frequency_keywords)
  const priorityKeywordsList = buildPriorityKeywords(job?.priority_keywords)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {job.important_emoji && <span className="text-3xl">{job.important_emoji}</span>}
                  {job.title}
                </h1>
                <p className="text-gray-600 mt-1">
                  {job.company} {job.location && `• ${job.location}`}
                  {job.source && ` • Saved from ${job.source}`}
                  {job.created_at && ` • ${new Date(job.created_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            {job.max_salary && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">${job.max_salary.toLocaleString()}/yr</div>
                <div className="text-sm text-gray-500">Max Salary</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <select
              value={job.status || 'bookmarked'}
              onChange={(e) => updateJobField('status', e.target.value)}
              className="px-4 py-2 border rounded-lg font-semibold"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Important:</span>
              <div className="flex gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => updateJobField('important_emoji', job.important_emoji === emoji ? null : emoji)}
                    className={`text-2xl p-1 rounded ${job.important_emoji === emoji ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'hover:bg-gray-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Follow Up:</span>
              <input
                type="date"
                value={job.follow_up_date ? new Date(job.follow_up_date).toISOString().split('T')[0] : ''}
                onChange={(e) => updateJobField('follow_up_date', e.target.value || null)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {[
              { id: 'overview', label: '📋 Overview' },
              { id: 'notes', label: '📝 Notes' },
              { id: 'resume', label: '📄 Resume' },
              { id: 'analysis', label: '📊 Analysis' },
              { id: 'coverLetters', label: '✉️ Cover Letters' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Job Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Company</label>
                      <p className="text-gray-900">{job.company || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Location</label>
                      <p className="text-gray-900">{job.location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Work Type</label>
                      <p className="text-gray-900">{job.work_type || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Job Type</label>
                      <p className="text-gray-900">{job.job_type || 'N/A'}</p>
                    </div>
                    {job.url && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Job URL</label>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Original Posting
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Match Information</h3>
                  {bestMatch ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Best ATS Score</label>
                        <div className={`text-3xl font-bold ${
                          bestMatch.score >= 80 ? 'text-green-600' :
                          bestMatch.score >= 60 ? 'text-yellow-600' :
                          'text-orange-600'
                        }`}>
                          {bestMatch.score}%
                        </div>
                      </div>
                      {bestMatch.resume_name && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Matched Resume</label>
                          <p className="text-gray-900">{bestMatch.resume_name}</p>
                        </div>
                      )}
                      {bestMatch.resume_version_id && (
                        <div>
                          <a
                            href={`${config.apiBase}/api/resume/version/${bestMatch.resume_version_id}`}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            View Resume Version
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No matches yet. Analyze this job with a resume to see ATS scores.</p>
                  )}
                </div>
              </div>

              {job.content && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{job.content}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes about this job..."
                className="w-full h-64 p-4 border rounded-lg resize-none"
              />
              <button
                onClick={saveNotes}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Match This Job With a Resume</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose one of your master resumes to open the editor with this job description loaded on the right.
                    </p>
                  </div>
                  {bestMatch && (
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Best ATS Score: {bestMatch.score}%
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col min-w-[220px]">
                    <label className="text-sm font-semibold text-gray-600 mb-1">Select resume</label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loadingResumes || resumeOptions.length === 0}
                      className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{loadingResumes ? 'Loading resumes...' : 'Select a resume'}</option>
                      {resumeOptions.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedResumeId) {
                        alert('Please select a resume to continue.')
                        return
                      }
                      window.location.href = `/editor?resumeId=${selectedResumeId}&jdId=${job.id}`
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    disabled={!selectedResumeId}
                  >
                    Open in Editor
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = `/editor?jdId=${job.id}`
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Create New Resume Match
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Tip: After refining the resume in the editor, click “Save Match” in the match panel to store the new ATS score here.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Saved Matches</h3>
                  {bestMatch && (
                    <span className="text-xs text-gray-500">
                      Highest score recorded on {bestMatch.updated_at ? new Date(bestMatch.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                </div>

                {job.resume_versions && job.resume_versions.length > 0 ? (
                  <div className="space-y-3">
                    {job.resume_versions.map((match) => (
                      <div
                        key={match.id}
                        className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              (match.score || 0) >= 80 ? 'bg-green-100 text-green-700' :
                              (match.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              ATS: {match.score}%
                            </span>
                            {match.keyword_coverage !== undefined && match.keyword_coverage !== null && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                Keywords {Math.round(match.keyword_coverage)}%
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {match.updated_at ? new Date(match.updated_at).toLocaleString() : match.created_at ? new Date(match.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {match.resume_name || 'Resume'}
                            {match.resume_version_label && <span className="text-gray-400 ml-1">({match.resume_version_label})</span>}
                          </div>
                          {(match.matched_keywords?.length || match.missing_keywords?.length) && (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
                              {match.matched_keywords && match.matched_keywords.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-green-600 mb-1">Matched Keywords ({match.matched_keywords.length})</div>
                                  <div className="flex flex-wrap gap-1 text-[11px]">
                                    {match.matched_keywords.slice(0, 15).map((kw) => (
                                      <span key={kw} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{kw}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {match.missing_keywords && match.missing_keywords.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-red-600 mb-1">Improve These ({match.missing_keywords.length})</div>
                                  <div className="flex flex-wrap gap-1 text-[11px]">
                                    {match.missing_keywords.slice(0, 15).map((kw) => (
                                      <span key={kw} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{kw}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {match.resume_id && (
                            <button
                              onClick={() => {
                                window.location.href = `/editor?resumeId=${match.resume_id}&jdId=${job.id}`
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                            >
                              Improve in Editor
                            </button>
                          )}
                          {match.resume_version_id && (
                            <a
                              href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                              target="_blank"
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                              rel="noopener noreferrer"
                            >
                              Download Version
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
                    No saved matches yet. Select a resume above to start matching.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">ATS Analysis & Keywords</h3>
              
              {bestMatch && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Top Match Score: {bestMatch.score}%</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Matched Resume</label>
                      <p className="text-gray-900">
                        {bestMatch.resume_name || 'N/A'}
                        {bestMatch.resume_version_label && <span className="text-gray-500 ml-1">({bestMatch.resume_version_label})</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Match Date</label>
                      <p className="text-gray-900">
                        {bestMatch.updated_at ? new Date(bestMatch.updated_at).toLocaleString() : bestMatch.created_at ? new Date(bestMatch.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {highFrequencyList.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">High Frequency Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {highFrequencyList.map(({ keyword, count }) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {keyword} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {priorityKeywordsList.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">Priority Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {priorityKeywordsList.map((keyword: string) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.resume_versions && job.resume_versions.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">All Matched Versions ({job.resume_versions.length})</h4>
                  <div className="space-y-3">
                    {job.resume_versions.map((match, idx) => (
                      <div key={match.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Version {match.resume_version_label || idx + 1}</span>
                            <span className={`px-3 py-1 rounded text-sm font-bold ${
                              (match.score || 0) >= 80 ? 'bg-green-100 text-green-700' :
                              (match.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {match.score}%
                            </span>
                          </div>
                          {match.resume_name && <div className="text-gray-600 text-sm mt-1">{match.resume_name}</div>}
                          <div className="text-xs text-gray-500 mt-1">
                            {match.updated_at ? new Date(match.updated_at).toLocaleString() : match.created_at ? new Date(match.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.resume_version_id && (
                            <a
                              href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                              target="_blank"
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          )}
                          {match.resume_id && (
                            <button
                              onClick={() => {
                                window.location.href = `/editor?resumeId=${match.resume_id}&jdId=${job.id}`
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Improve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'coverLetters' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create a Cover Letter</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Draft and save tailored cover letters for this role. Each version stays linked to the job so you can download it later.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-600 mb-1">Title</label>
                    <input
                      value={newLetterTitle}
                      onChange={(e) => setNewLetterTitle(e.target.value)}
                      placeholder="e.g. Cover Letter v1"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-600 mb-1">Content</label>
                    <textarea
                      value={newLetterContent}
                      onChange={(e) => setNewLetterContent(e.target.value)}
                      placeholder="Paste or write your cover letter here..."
                      className="px-3 py-2 border rounded-lg min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateCoverLetter}
                      disabled={savingCoverLetter || !newLetterContent.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingCoverLetter ? 'Saving...' : 'Save Cover Letter'}
                    </button>
                    <button
                      onClick={() => {
                        setNewLetterTitle('')
                        setNewLetterContent('')
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Saved Cover Letters</h3>
                  <span className="text-xs text-gray-500">{coverLetters.length} saved</span>
                </div>
                {coverLetters.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
                    No cover letters saved yet. Create your first draft above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coverLetters.map((letter) => (
                      <div key={letter.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-semibold text-gray-900">{letter.title}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">v{letter.version_number}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Updated {letter.updated_at ? new Date(letter.updated_at).toLocaleString() : letter.created_at ? new Date(letter.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (navigator?.clipboard?.writeText) {
                                  navigator.clipboard.writeText(letter.content || '')
                                    .then(() => alert('Cover letter copied to clipboard'))
                                    .catch(() => alert('Failed to copy cover letter'))
                                } else {
                                  alert('Clipboard access is not available in this browser.')
                                }
                              }}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => {
                                setEditingLetterId(letter.id)
                                setEditingLetterTitle(letter.title)
                                setEditingLetterContent(letter.content)
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCoverLetter(letter.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {editingLetterId === letter.id ? (
                          <div className="space-y-2 border-t border-gray-200 pt-3">
                            <input
                              value={editingLetterTitle}
                              onChange={(e) => setEditingLetterTitle(e.target.value)}
                              className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                              value={editingLetterContent}
                              onChange={(e) => setEditingLetterContent(e.target.value)}
                              className="px-3 py-2 border rounded-lg min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdateCoverLetter}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLetterId(null)
                                  setEditingLetterContent('')
                                  setEditingLetterTitle('')
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-200 pt-3">
                            {letter.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resume' | 'analysis'>('overview')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (jobId && isAuthenticated && user?.email) {
      fetchJobDetails()
    }
  }, [jobId, isAuthenticated, user?.email])

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
      }
    } catch (e) {
      console.error('Failed to load job details:', e)
    } finally {
      setLoading(false)
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

  const bestMatch = job.all_matches && job.all_matches.length > 0 
    ? job.all_matches.reduce((best, match) => match.score > best.score ? match : best)
    : job.last_match

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
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Resume for This Job</h3>
              {bestMatch && bestMatch.resume_version_id ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      This job has been matched with a resume version. You can edit the resume in the editor.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = `/editor?resumeId=${bestMatch.resume_id}&jdId=${job.id}`
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Edit Resume in Editor
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">No resume matched yet for this job.</p>
                  <button
                    onClick={() => {
                      window.location.href = `/editor?jdId=${job.id}`
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Analyze with Resume
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">ATS Analysis & Keywords</h3>
              
              {bestMatch && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Match Score: {bestMatch.score}%</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Matched Resume</label>
                      <p className="text-gray-900">{bestMatch.resume_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Match Date</label>
                      <p className="text-gray-900">
                        {bestMatch.created_at ? new Date(bestMatch.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {job.high_frequency_keywords && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">High Frequency Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(job.high_frequency_keywords).map(([keyword, count]: [string, any]) => (
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

              {job.priority_keywords && Array.isArray(job.priority_keywords) && job.priority_keywords.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">Priority Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.priority_keywords.map((keyword: string) => (
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

              {job.all_matches && job.all_matches.length > 1 && (
                <div>
                  <h4 className="text-md font-bold text-gray-900 mb-3">All Matched Versions ({job.all_matches.length})</h4>
                  <div className="space-y-2">
                    {job.all_matches.map((match: any, idx: number) => (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-semibold">Version {idx + 1}</span>
                          {match.resume_name && <span className="text-gray-600 ml-2">• {match.resume_name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded text-sm font-bold ${
                            match.score >= 80 ? 'bg-green-100 text-green-700' :
                            match.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {match.score}%
                          </span>
                          {match.resume_version_id && (
                            <a
                              href={`${config.apiBase}/api/resume/version/${match.resume_version_id}`}
                              target="_blank"
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


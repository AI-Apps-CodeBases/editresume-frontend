'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import SettingsPanel from '@/components/SettingsPanel'

interface ResumeHistory {
  id: string
  name: string
  lastModified: string
  template: string
}

interface PaymentHistory {
  id: string
  date: string
  amount: string
  status: string
  plan: string
}

function ProfilePageContent() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [resumeHistory, setResumeHistory] = useState<ResumeHistory[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'jobs' | 'billing' | 'settings'>('overview')
  const [savedJDs, setSavedJDs] = useState<Array<{
    id: number
    title: string
    company?: string
    source?: string
    url?: string
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
  }>>([])
  const [savedResumes, setSavedResumes] = useState<Array<{
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
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/editor')
      } else {
        loadUserData()
      }
      setLoading(false)
    }, 100)
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'history', 'jobs', 'billing', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab)
    }
    
    return () => clearTimeout(checkAuth)
  }, [isAuthenticated, router, searchParams])

  const loadUserData = () => {
    const savedResumes = localStorage.getItem('resumeHistory')
    if (savedResumes) {
      setResumeHistory(JSON.parse(savedResumes))
    }

    const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
    if (premiumMode && user?.isPremium) {
      setPaymentHistory([
        {
          id: '1',
          date: new Date().toISOString().split('T')[0],
          amount: '$9.99',
          status: 'Paid',
          plan: 'Premium Monthly'
        }
      ])
    }
  }

  const fetchSavedResumes = useCallback(async () => {
    if (!isAuthenticated || !user?.email) return
    
    try {
      // Fetch saved resumes
      const resumesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (resumesRes.ok) {
        const resumesData = await resumesRes.json()
        setSavedResumes(resumesData.resumes || [])
        console.log('✅ Loaded saved resumes:', resumesData.resumes?.length || 0)
      } else {
        console.error('Failed to load resumes:', resumesRes.status)
      }
    } catch (e) {
      console.error('Failed to load resumes', e)
    }
  }, [isAuthenticated, user?.email])

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !user?.email) return
      
      await fetchSavedResumes()

      try {
        // Fetch job descriptions
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          const jds = Array.isArray(data) ? data : data.results || []
          
          // For each JD, fetch all match sessions to show all matched versions
          const jdsWithMatches = await Promise.all(jds.map(async (jd: any) => {
            try {
              const matchesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions/${jd.id}/matches`)
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
      }
    }
    if (isAuthenticated && user?.email) {
      fetchData()
    }
  }, [isAuthenticated, user, activeTab])

  // Refresh resumes when tab changes to jobs
  useEffect(() => {
    if (activeTab === 'jobs' && isAuthenticated && user?.email) {
      fetchSavedResumes()
    }
  }, [activeTab, isAuthenticated, user, fetchSavedResumes])

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      logout()
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📄</div>
          <p className="text-xl text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const stats = {
    resumesCreated: resumeHistory.length,
    exportsThisMonth: 0,
    accountAge: 'New User'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600">
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              editresume.io
            </a>
            <div className="flex gap-3">
              <a
                href="/editor"
                className="px-4 py-2 rounded-lg border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-all font-semibold"
              >
                ← Back to Editor
              </a>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg transition-all font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user?.name}</h1>
                <p className="text-gray-600">{user?.email}</p>
                <div className="mt-2">
                  {user?.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-semibold">
                      💎 Premium Member
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold">
                      🆓 Free Plan
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!user?.isPremium && process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true' && (
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                ⬆️ Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="border-b">
            <div className="flex gap-1 p-2">
              {(['overview', 'history', 'jobs', 'billing', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Account Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                    <div className="text-blue-600 text-3xl mb-2">📄</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.resumesCreated}</div>
                    <div className="text-sm text-blue-700 font-medium">Resumes Created</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                    <div className="text-purple-600 text-3xl mb-2">📥</div>
                    <div className="text-3xl font-bold text-purple-900">{stats.exportsThisMonth}</div>
                    <div className="text-sm text-purple-700 font-medium">Exports This Month</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border-2 border-pink-200">
                    <div className="text-pink-600 text-3xl mb-2">⏱️</div>
                    <div className="text-lg font-bold text-pink-900">{stats.accountAge}</div>
                    <div className="text-sm text-pink-700 font-medium">Account Age</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href="/editor?new=true"
                      className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <span className="text-2xl">✏️</span>
                      <div>
                        <div className="font-semibold text-gray-900">Create Resume</div>
                        <div className="text-xs text-gray-600">Start a new resume</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Resume History</h2>
                  <button
                    onClick={() => {
                      localStorage.removeItem('resumeHistory')
                      setResumeHistory([])
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear History
                  </button>
                </div>

                {resumeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No resumes yet</h3>
                    <p className="text-gray-600 mb-6">Create your first resume to see it here</p>
                    <a
                      href="/editor"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Create Resume
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumeHistory.map((resume) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl">
                            📄
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{resume.name}</div>
                            <div className="text-sm text-gray-600">
                              Template: {resume.template} • Last modified: {resume.lastModified}
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold">
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-6">
                {/* Saved Resumes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Saved Resumes</h2>
                    <button
                      onClick={async () => {
                        if (!user?.email) return
                        try {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
                          if (res.ok) {
                            const data = await res.json()
                            setSavedResumes(data.resumes || [])
                          }
                        } catch (e) {
                          console.error('Failed to refresh resumes:', e)
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Refresh
                    </button>
                  </div>

                  {savedResumes.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <div className="text-4xl mb-3">📄</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No saved resumes yet</h3>
                      <p className="text-gray-600 mb-4">Save your resume after creating or editing it in the editor.</p>
                      <a
                        href="/editor"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Create Resume
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedResumes.map((resume) => (
                        <div
                          key={resume.id}
                          className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">{resume.name}</h3>
                              {resume.title && (
                                <p className="text-sm text-gray-600">{resume.title}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <a
                                href="/editor"
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-semibold"
                              >
                                Open
                              </a>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const exportBtn = e.currentTarget
                                  const originalText = exportBtn.textContent
                                  exportBtn.disabled = true
                                  exportBtn.textContent = 'Exporting...'
                                  
                                  try {
                                    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
                                    
                                    // Fetch the latest version of the resume
                                    let resumeData = null
                                    if (resume.latest_version_id) {
                                      const versionRes = await fetch(`${apiBase}/api/resume/version/${resume.latest_version_id}?user_email=${encodeURIComponent(user?.email || '')}`)
                                      if (versionRes.ok) {
                                        const versionData = await versionRes.json()
                                        resumeData = versionData.version.resume_data
                                      }
                                    }
                                    
                                    // If no version data, construct basic resume data
                                    if (!resumeData) {
                                      resumeData = {
                                        name: resume.name,
                                        title: resume.title || '',
                                        email: '',
                                        phone: '',
                                        location: '',
                                        summary: '',
                                        sections: [],
                                        template: resume.template || 'tech'
                                      }
                                    }
                                    
                                    // Normalize resume data structure (handle both personalInfo and flat structure)
                                    const normalizedData = {
                                      name: resumeData.personalInfo?.name || resumeData.name || resume.name,
                                      title: resumeData.personalInfo?.title || resumeData.title || resume.title || '',
                                      email: resumeData.personalInfo?.email || resumeData.email || '',
                                      phone: resumeData.personalInfo?.phone || resumeData.phone || '',
                                      location: resumeData.personalInfo?.location || resumeData.location || '',
                                      summary: resumeData.summary || '',
                                      sections: resumeData.sections || [],
                                      replacements: {},
                                      template: resumeData.template || resume.template || 'tech',
                                      two_column_left: [],
                                      two_column_right: [],
                                      two_column_left_width: 50
                                    }
                                    
                                    // Export as PDF
                                    const exportUrl = `${apiBase}/api/resume/export/pdf${user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''}`
                                    const exportResponse = await fetch(exportUrl, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(normalizedData)
                                    })
                                    
                                    if (exportResponse.ok) {
                                      const blob = await exportResponse.blob()
                                      const url = window.URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `${resume.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
                                      document.body.appendChild(a)
                                      a.click()
                                      document.body.removeChild(a)
                                      window.URL.revokeObjectURL(url)
                                    } else {
                                      throw new Error(`Export failed: ${exportResponse.status}`)
                                    }
                                  } catch (error) {
                                    console.error('Failed to export resume:', error)
                                    alert(`Failed to export resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                  } finally {
                                    exportBtn.disabled = false
                                    exportBtn.textContent = originalText
                                  }
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 font-semibold"
                                title="Export as PDF"
                              >
                                📄 PDF
                              </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (!confirm(`Are you sure you want to delete "${resume.name}"? This will permanently delete the resume and all its versions. This action cannot be undone.`)) return
                                    
                                    const deleteBtn = e.currentTarget
                                    const originalText = deleteBtn.textContent
                                    deleteBtn.disabled = true
                                    deleteBtn.textContent = 'Deleting...'
                                    
                                    try {
                                      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
                                      const url = `${apiBase}/api/resumes/${resume.id}?user_email=${encodeURIComponent(user?.email || '')}`
                                      
                                      const res = await fetch(url, { 
                                        method: 'DELETE',
                                        headers: {
                                          'Content-Type': 'application/json'
                                        }
                                      })
                                      
                                      if (res.ok) {
                                        setSavedResumes((prev) => prev.filter((x) => x.id !== resume.id))
                                        const successMsg = document.createElement('div')
                                        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                                        successMsg.textContent = '✅ Resume deleted successfully'
                                        document.body.appendChild(successMsg)
                                        setTimeout(() => {
                                          document.body.removeChild(successMsg)
                                        }, 3000)
                                      } else {
                                        const errorData = await res.json().catch(() => ({ detail: 'Failed to delete resume' }))
                                        alert(`Failed to delete: ${errorData.detail || `HTTP ${res.status}`}`)
                                        deleteBtn.disabled = false
                                        deleteBtn.textContent = originalText
                                      }
                                    } catch (error) {
                                      console.error('Failed to delete resume:', error)
                                      alert(`Failed to delete resume: ${error instanceof Error ? error.message : 'Network error'}`)
                                      deleteBtn.disabled = false
                                      deleteBtn.textContent = originalText
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs hover:bg-red-100 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete this resume"
                                >
                                  Delete
                                </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3">
                            <span>Template: {resume.template || 'tech'}</span>
                            <span>•</span>
                            <span>{resume.version_count || 0} versions</span>
                            {resume.match_count && resume.match_count > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-semibold">{resume.match_count} matches</span>
                              </>
                            )}
                          </div>
                          {resume.recent_matches && resume.recent_matches.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-blue-200">
                              <div className="text-xs text-gray-600 mb-2 font-medium">Recent Matches:</div>
                              {resume.recent_matches.map((match: any) => (
                                <div
                                  key={match.id}
                                  className="p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 text-sm truncate">
                                        {match.jd_title || 'Unknown Job'}
                                      </div>
                                      {match.jd_company && (
                                        <div className="text-xs text-gray-600 truncate">
                                          {match.jd_company}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                                          match.score >= 80 ? 'bg-green-100 text-green-700 border border-green-300' :
                                          match.score >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                          'bg-orange-100 text-orange-700 border border-orange-300'
                                        }`}
                                      >
                                        {match.score}%
                                      </span>
                                      {match.resume_version_number && (
                                        <a
                                          href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/version/${match.resume_version_id}`}
                                          target="_blank"
                                          className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100 font-medium"
                                          title="View resume version"
                                        >
                                          v{match.resume_version_number}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  {match.keyword_coverage !== null && match.keyword_coverage !== undefined && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Keyword coverage: {match.keyword_coverage.toFixed(1)}%
                                    </div>
                                  )}
                                  {match.created_at && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Matched: {new Date(match.created_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {resume.updated_at && (
                            <div className="text-xs text-gray-500 mt-2">
                              Updated: {new Date(resume.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Saved Job Descriptions Section */}
                <div className="space-y-4 mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Saved Job Descriptions</h2>
                  <button
                    onClick={async () => {
                        if (!user?.email) return
                        try {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions?user_email=${encodeURIComponent(user.email)}`)
                          if (res.ok) {
                            const data = await res.json()
                            setSavedJDs(Array.isArray(data) ? data : data.results || [])
                          }
                        } catch (e) {
                          console.error('Failed to refresh job descriptions:', e)
                        }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Refresh
                  </button>
                </div>

                {savedJDs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗂️</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No saved jobs yet</h3>
                    <p className="text-gray-600">Use the browser extension to save LinkedIn jobs.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border rounded-xl">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left text-sm text-gray-600">
                        <tr>
                          <th className="p-3">Title</th>
                          <th className="p-3">Company</th>
                          <th className="p-3">Source</th>
                          <th className="p-3">Saved</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {savedJDs.map((jd) => (
                          <tr key={jd.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900 max-w-[320px] truncate">{jd.title}</td>
                            <td className="p-3 text-gray-700">{jd.company || '-'}</td>
                            <td className="p-3 text-gray-700">{jd.source || 'extension'}</td>
                            <td className="p-3 text-gray-500">{jd.created_at ? new Date(jd.created_at).toLocaleString() : '-'}</td>
                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                <a
                                  href={`/editor?jdId=${jd.id}`}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                  Analyze
                                </a>
                                {jd.last_match && (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold">
                                        Latest Match: {jd.last_match?.score}%
                                      </span>
                                      {jd.last_match?.resume_name && (
                                        <span className="px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded text-xs">
                                          Resume: {jd.last_match?.resume_name}
                                        </span>
                                      )}
                                      {jd.last_match?.resume_version_id && (
                                        <a
                                          href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/version/${jd.last_match?.resume_version_id}`}
                                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-100"
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
                                              <span className={`px-2 py-1 rounded text-xs ${
                                                match.score >= 80 ? 'bg-green-100 text-green-700 border border-green-300' :
                                                match.score >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                                'bg-orange-100 text-orange-700 border border-orange-300'
                                              }`}>
                                                {match.score}%
                                              </span>
                                              {match.resume_version_id && (
                                                <a
                                                  href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/version/${match.resume_version_id}`}
                                                  className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100"
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
                                      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
                                      const url = `${apiBase}/api/job-descriptions/${jd.id}${user?.email ? `?user_email=${encodeURIComponent(user.email)}` : ''}`
                                      
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
                                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>

                {user?.isPremium ? (
                  <>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-purple-900 mb-2">Premium Plan</h3>
                          <p className="text-purple-700">Unlimited exports and premium templates</p>
                          <div className="mt-4 text-3xl font-bold text-purple-900">$9.99<span className="text-lg font-normal text-purple-700">/month</span></div>
                        </div>
                        <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold">Active</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
                      <div className="space-y-2">
                        {paymentHistory.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                ✓
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{payment.plan}</div>
                                <div className="text-sm text-gray-600">{payment.date}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{payment.amount}</div>
                              <div className="text-sm text-green-600">{payment.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold">
                      Cancel Subscription
                    </button>
                  </>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                    <div className="text-6xl mb-4">💎</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Premium</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Get unlimited exports, premium templates, and priority support
                    </p>
                    <ul className="text-left max-w-md mx-auto mb-8 space-y-2">
                      <li className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span> Unlimited PDF/DOCX exports
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span> Access to all premium templates
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span> Priority customer support
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span> No watermarks
                      </li>
                    </ul>
                    <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all">
                      Upgrade for $9.99/month
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && user && (
              <SettingsPanel
                user={user}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📄</div>
          <p className="text-xl text-gray-600">Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}


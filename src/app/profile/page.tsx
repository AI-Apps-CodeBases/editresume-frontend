'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
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
    
    return () => clearTimeout(checkAuth)
  }, [isAuthenticated, router])

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

  useEffect(() => {
    const fetchJDs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions`)
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
    if (isAuthenticated) fetchJDs()
  }, [isAuthenticated])

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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Saved Job Descriptions</h2>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions`)
                        if (res.ok) setSavedJDs(await res.json())
                      } catch (e) {}
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
                                  onClick={async () => {
                                    if (!confirm('Delete this saved job?')) return
                                    try {
                                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/job-descriptions/${jd.id}`, { method: 'DELETE' })
                                      if (res.ok) setSavedJDs((prev) => prev.filter((x) => x.id !== jd.id))
                                    } catch (e) {}
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100"
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


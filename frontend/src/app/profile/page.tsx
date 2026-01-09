'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useCallback, Suspense } from 'react'
import SettingsPanel from '@/components/SettingsPanel'
import config from '@/lib/config'
import { auth } from '@/lib/firebaseClient'
import ProtectedRoute from '@/components/Shared/Auth/ProtectedRoute'
import { ResumeAutomationFlow } from '@/features/resume-automation/components/ResumeAutomationFlow'
import { StatsPanel } from '@/components/home/StatsPanel'
import { DocumentIcon, DownloadIcon, ClockIcon, FolderIcon, DiamondIcon, EditIcon } from '@/components/Icons'
import { useLinkedIn } from '@/hooks/useLinkedIn'
import { useTrial } from '@/hooks/useTrial'

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

interface SubscriptionStatus {
  isPremium: boolean
  subscriptionStatus?: string | null
  subscriptionCurrentPeriodEnd?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}

interface CheckoutSessionResponse {
  url: string
}

function ProfilePageContent() {
  const { user, isAuthenticated, logout } = useAuth()
  const { showAlert, showConfirm } = useModal()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { connectLinkedIn, checkStatus, status: linkedInStatus, loading: linkedInLoading } = useLinkedIn()
  const { isTrialActive } = useTrial()
  const [resumeHistory, setResumeHistory] = useState<ResumeHistory[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'resumes' | 'billing' | 'settings'>('overview')
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
  const [resumesLoading, setResumesLoading] = useState(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const apiBase = config.apiBase
  const isPremiumMember = subscriptionInfo?.isPremium ?? user?.isPremium ?? false
  const subscriptionStatus = subscriptionInfo?.subscriptionStatus ?? (isPremiumMember ? 'active' : 'inactive')
  const nextBillingDate = subscriptionInfo?.subscriptionCurrentPeriodEnd
    ? new Date(subscriptionInfo.subscriptionCurrentPeriodEnd).toLocaleDateString()
    : null

  const loadUserData = useCallback(() => {
    const savedResumes = localStorage.getItem('resumeHistory')
    if (savedResumes) {
      setResumeHistory(JSON.parse(savedResumes))
    }

    const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
    if (premiumMode && isPremiumMember) {
      setPaymentHistory([
        {
          id: '1',
          date: new Date().toISOString().split('T')[0],
          amount: '$9.99',
          status: 'Paid',
          plan: 'Premium Monthly'
        }
      ])
    } else {
      setPaymentHistory([])
    }
  }, [isPremiumMember])

  useEffect(() => {
    const checkAuth = setTimeout(() => {
      if (!isAuthenticated) {
        const currentPath = typeof window !== 'undefined' 
          ? `${window.location.pathname}${window.location.search}`
          : '/profile'
        router.push(`/auth/login?next=${encodeURIComponent(currentPath)}`)
      } else {
        loadUserData()
        checkStatus()
      }
      setLoading(false)
    }, 100)
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'history', 'resumes', 'billing', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab)
    }

    // Check for LinkedIn connection success
    if (searchParams.get('linkedin_connected') === 'true') {
      checkStatus()
      showAlert({
        type: 'success',
        message: 'LinkedIn connected successfully!',
        title: 'Success'
      })
      router.replace('/profile?tab=overview')
    }
    
    return () => clearTimeout(checkAuth)
  }, [isAuthenticated, router, searchParams, loadUserData])

  const loadSubscriptionStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscriptionInfo(null)
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      return
    }

    setSubscriptionLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const response = await fetch(`${apiBase}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data: SubscriptionStatus = await response.json()
        setSubscriptionInfo(data)
      } else if (response.status === 401) {
        setSubscriptionInfo(null)
      } else {
        const errorText = await response.text().catch(() => '')
        console.error('Failed to fetch subscription status', errorText)
      }
    } catch (error) {
      console.error('Failed to fetch subscription status', error)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [apiBase, isAuthenticated])

  const fetchSavedResumes = useCallback(async () => {
    if (!isAuthenticated || !user?.email) return
    
    setResumesLoading(true)
    try {
      let apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
      apiBase = apiBase.replace(/\/$/, '')
      const resumesRes = await fetch(`${apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (resumesRes.ok) {
        const resumesData = await resumesRes.json()
        setSavedResumes(resumesData.resumes || [])
        console.log('✅ Loaded saved resumes:', resumesData.resumes?.length || 0)
      } else {
        console.error('Failed to load resumes:', resumesRes.status)
      }
    } catch (e) {
      console.error('Failed to load resumes', e)
    } finally {
      setResumesLoading(false)
    }
  }, [isAuthenticated, user?.email])


  useEffect(() => {
    if (!isAuthenticated || !user?.email) return
    
    // Fetch resumes
    fetchSavedResumes().catch(err => {
      console.error('Error fetching profile data:', err)
    })
  }, [isAuthenticated, user?.email, fetchSavedResumes])

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionInfo(null)
      return
    }
    loadSubscriptionStatus()
  }, [isAuthenticated, loadSubscriptionStatus])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'billing') {
      loadSubscriptionStatus()
    }
  }, [activeTab, isAuthenticated, loadSubscriptionStatus])

  // Refresh data when switching to resumes tab (only if not already loaded)
  useEffect(() => {
    if (activeTab === 'resumes' && isAuthenticated && user?.email) {
      if (savedResumes.length === 0 && !resumesLoading) {
        fetchSavedResumes()
      }
    }
  }, [activeTab, isAuthenticated, user?.email, savedResumes.length, resumesLoading, fetchSavedResumes])

  const handleDeleteAccount = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone.',
      type: 'danger'
    })
    if (confirmed) {
      logout()
      router.push('/')
    }
  }

  const handleStartCheckout = useCallback(async (period: 'monthly' | 'annual' = 'monthly', planType: 'trial' | 'premium' = 'premium') => {
    if (!isAuthenticated || checkoutLoading) return

    const currentUser = auth.currentUser
    if (!currentUser) {
      await showAlert({
        type: 'warning',
        message: 'Unable to start checkout. Please sign in again.',
        title: 'Authentication Required'
      })
      return
    }

    setCheckoutLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const successUrl = origin ? `${origin}/profile?tab=billing` : undefined
      const cancelUrl = successUrl

      const response = await fetch(`${apiBase}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          successUrl,
          cancelUrl,
          planType: planType,
          period: period
        })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to initiate checkout.')
      }

      const data: CheckoutSessionResponse = await response.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('Checkout URL missing in response.')
      }
    } catch (error) {
      console.error('Checkout error', error)
      await showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to start checkout. Please try again.',
        title: 'Checkout Failed'
      })
    } finally {
      setCheckoutLoading(false)
    }
  }, [apiBase, checkoutLoading, isAuthenticated, showAlert])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-body-gradient">
        <div className="rounded-[28px] border border-border-subtle bg-white px-10 py-8 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
          <div className="flex justify-center mb-4">
            <DocumentIcon size={48} color="#0f62fe" className="animate-pulse opacity-60" />
          </div>
          <p className="text-sm font-semibold text-text-muted">Loading profile…</p>
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

  const profileStats = [
    { value: `${stats.resumesCreated}`, label: 'RESUMES', caption: 'Created' },
    { value: `${stats.exportsThisMonth}`, label: 'EXPORTS', caption: 'This month' },
    { value: stats.accountAge, label: 'ACCOUNT', caption: 'Status' },
  ]

  return (
    <div className="editor-shell min-h-screen bg-body-gradient text-text-primary pt-4">
      <div className="w-full px-[10%] py-16 space-y-10">
        <div className="mb-4">
          <button
            onClick={() => router.push('/editor')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary bg-white/95 backdrop-blur-sm border border-border-subtle rounded-lg hover:bg-primary-50/50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Editor
          </button>
        </div>
        <div className="dashboard-card space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-primary-600 to-primary-400 text-3xl font-semibold text-white shadow-[0_20px_38px_rgba(15,23,42,0.18)]">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-text-primary">{user?.name}</h1>
                <p className="mt-2 text-sm text-text-muted">{user?.email}</p>
                <div className="mt-4">
                  {isPremiumMember ? <span className="badge-gradient">Premium Member</span> : <span className="badge">Free Plan</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {!isPremiumMember && process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true' && (
                <button
                  onClick={() => handleStartCheckout('monthly', 'premium')}
                  disabled={checkoutLoading || subscriptionLoading}
                  className="button-primary text-xs disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {checkoutLoading ? 'Processing…' : '⬆️ Upgrade to Premium'}
                </button>
              )}
              <span className="surface-pill text-[11px]">
                Status:{' '}
                <strong className="ml-1 text-text-primary">
                  {subscriptionStatus}
                </strong>
              </span>
            </div>
          </div>
          <StatsPanel stats={profileStats} />
        </div>

      <div className="dashboard-card">
          <div className="border-b border-border-subtle pb-4">
            <div className="flex flex-wrap gap-2">
              {(['overview', 'history', 'resumes', 'billing', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`tab-pill ${activeTab === tab ? 'tab-pill-active' : 'tab-pill-muted'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary">Account Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="mb-2">
                      <DocumentIcon size={32} color="#2563eb" />
                    </div>
                    <div className="text-3xl font-bold text-blue-900">{stats.resumesCreated}</div>
                    <div className="text-sm text-blue-700 font-medium">Resumes Created</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                    <div className="mb-2">
                      <DownloadIcon size={32} color="#9333ea" />
                    </div>
                    <div className="text-3xl font-bold text-purple-900">{stats.exportsThisMonth}</div>
                    <div className="text-sm text-purple-700 font-medium">Exports This Month</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border-2 border-pink-200">
                    <div className="mb-2">
                      <ClockIcon size={32} color="#ec4899" />
                    </div>
                    <div className="text-lg font-bold text-pink-900">{stats.accountAge}</div>
                    <div className="text-sm text-pink-700 font-medium">Account Age</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-xl p-6 border-2 border-border-subtle shadow-sm surface-card">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href="/editor?new=true"
                      className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-lg border-2 border-border-subtle hover:border-primary-400 hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)] transition-all duration-200 surface-card"
                    >
                      <EditIcon size={24} color="currentColor" />
                      <div>
                        <div className="font-semibold text-text-primary">Create Resume</div>
                        <div className="text-xs text-text-muted">Start a new resume</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-xl p-6 border-2 border-border-subtle shadow-sm surface-card">
                  <h3 className="text-lg font-bold text-text-primary mb-4">LinkedIn Integration</h3>
                  {linkedInStatus?.connected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-green-900">LinkedIn Connected</div>
                          <div className="text-xs text-green-700">Your account is linked to LinkedIn</div>
                        </div>
                      </div>
                      {linkedInStatus.profile_url && (
                        <a
                          href={linkedInStatus.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center px-4 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#005885] transition-all font-semibold text-sm"
                        >
                          View LinkedIn Profile
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-white/95 backdrop-blur-sm rounded-lg border-2 border-border-subtle shadow-sm surface-card">
                        <div className="text-sm text-text-muted mb-3">
                          Connect your LinkedIn account to import profile data and share resumes directly to LinkedIn.
                        </div>
                        <button
                          onClick={connectLinkedIn}
                          disabled={linkedInLoading}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0077B5] text-white rounded-lg hover:bg-[#005885] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          {linkedInLoading ? 'Connecting...' : 'Connect LinkedIn'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary">Resume History</h2>
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
                    <div className="flex justify-center mb-4">
                      <DocumentIcon size={64} color="#0f62fe" className="opacity-60" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">No resumes yet</h3>
                    <p className="text-text-secondary mb-6">Create your first resume to see it here</p>
                    <a
                      href="/editor"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold hover:shadow-glow transition-all duration-200 button-primary"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      Create Resume
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumeHistory.map((resume) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-border-subtle hover:border-primary-400 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 surface-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl">
                            📄
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary">{resume.name}</div>
                            <div className="text-sm text-text-muted">
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

            {activeTab === 'resumes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary">Master Resumes</h2>
                  <button
                    onClick={fetchSavedResumes}
                    disabled={resumesLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resumesLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {resumesLoading && savedResumes.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-primary-50/30 to-white rounded-xl border-2 border-border-subtle shadow-sm surface-card">
                    <div className="flex justify-center mb-4">
                      <DocumentIcon size={48} color="#0f62fe" className="animate-pulse opacity-60" />
                    </div>
                    <p className="text-text-secondary">Loading resumes...</p>
                  </div>
                ) : savedResumes.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-primary-50/30 to-white rounded-xl border-2 border-border-subtle shadow-sm surface-card">
                    <div className="flex justify-center mb-4">
                      <DocumentIcon size={64} color="#0f62fe" className="opacity-60" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">No saved resumes yet</h3>
                    <p className="text-text-secondary mb-6">Save your resume from the editor to create a master resume that you can match with job descriptions.</p>
                    <a
                      href="/editor"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold hover:shadow-glow transition-all duration-200 button-primary"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      Create Resume
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedResumes.map((resume) => (
                      <div
                        key={resume.id}
                        className="p-6 bg-gradient-to-br from-primary-50/50 to-purple-50/50 rounded-xl border-2 border-primary-200 hover:border-primary-400 hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)] transition-all duration-200 shadow-sm surface-card"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-text-primary mb-1">{resume.name}</h3>
                            {resume.title && (
                              <p className="text-sm text-text-muted mb-2">{resume.title}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-text-muted">
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
                          <a
                            href={`/editor?resumeId=${resume.id}${resume.latest_version_id ? `&resumeVersionId=${resume.latest_version_id}` : ''}`}
                            className="flex-1 px-4 py-2 text-white rounded-lg text-sm transition-all duration-200 font-semibold text-center shadow-sm hover:shadow-md button-primary"
                            style={{ background: 'var(--gradient-accent)' }}
                          >
                            Edit
                          </a>
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
            )}


            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary">Billing & Subscription</h2>
                  <Link
                    href="/billing"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Full Billing Page →
                  </Link>
                </div>

                {subscriptionLoading ? (
                  <div className="rounded-xl border-2 border-primary-200 bg-primary-50/50 py-10 text-center text-primary-700 shadow-sm">
                    Checking subscription status…
                  </div>
                ) : (
                  <>
                    {isPremiumMember && (
                      <div className="bg-gradient-to-br from-primary-50/50 to-purple-50/50 rounded-xl p-6 border-2 border-primary-200 shadow-sm surface-card mb-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-primary-900 mb-2">Premium Plan Active</h3>
                            <p className="text-primary-700">Unlimited exports and premium templates</p>
                            <div className="mt-3 text-sm text-primary-800">
                              Status: <span className="font-semibold capitalize">{subscriptionStatus || 'active'}</span>
                              {nextBillingDate && (
                                <span className="ml-2">
                                  • Renews on <span className="font-semibold">{nextBillingDate}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold">Active</span>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Free Plan */}
                      <div className={`relative overflow-hidden rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_14px_24px_rgba(15,23,42,0.04)] ${
                        !isPremiumMember && !isTrialActive ? 'ring-2 ring-primary-200' : ''
                      }`}>
                        <h2 className="text-lg font-semibold text-text-primary">Free Plan</h2>
                        <p className="mt-1 text-xs text-text-muted">Great for getting started with structured resumes</p>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-text-primary">$0</span>
                          <span className="text-xs text-text-muted">forever</span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                          {[
                            'Visual resume editor',
                            '3 PDF/DOCX exports per month',
                            '5 AI improvements per session',
                            'Unlimited ATS scores (always free)',
                            'Job match analytics (1 resume)',
                            '1 cover letter per month'
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-1.5">
                              <span className="text-primary-600 text-xs">●</span>
                              <span className="text-text-muted">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4">
                          {!isPremiumMember && !isTrialActive ? (
                            <span className="text-[10px] uppercase tracking-wider text-primary-600">Current plan</span>
                          ) : (
                            <div className="rounded-lg border border-border-subtle bg-primary-50/60 px-3 py-2 text-xs text-text-muted">
                              Always available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trial Plan */}
                      <div className={`relative overflow-hidden rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_14px_24px_rgba(15,23,42,0.04)] ring-2 ring-primary-200 ${
                        isTrialActive ? 'ring-primary-400' : ''
                      }`}>
                        <div className="absolute right-2.5 top-2.5 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                          Best Value
                        </div>
                        <h2 className="text-lg font-semibold text-text-primary">Trial Plan</h2>
                        <p className="mt-1 text-xs text-text-muted">Try all premium features for 14 days</p>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-text-primary">$6.99</span>
                          <span className="text-xs text-text-muted">for 2 weeks</span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                          {[
                            'All Premium features',
                            'Unlimited everything',
                            'Full access for 14 days',
                            'Perfect to try everything'
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-1.5">
                              <span className="text-primary-600 text-xs">●</span>
                              <span className="text-text-muted">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-col gap-2">
                          {isTrialActive ? (
                            <>
                              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-medium text-center">
                                Trial Active
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-primary-600 text-center">Current plan</span>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartCheckout('monthly', 'trial')}
                              disabled={checkoutLoading || subscriptionLoading || isPremiumMember}
                              className="button-primary justify-center text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {checkoutLoading ? 'Starting checkout…' : 'Start Trial ($6.99)'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Premium Plan */}
                      <div className={`relative overflow-hidden rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_14px_24px_rgba(15,23,42,0.04)] ${
                        isPremiumMember && !isTrialActive ? 'ring-2 ring-primary-200' : ''
                      }`}>
                        <h2 className="text-lg font-semibold text-text-primary">Premium</h2>
                        <p className="mt-1 text-xs text-text-muted">Unlock all resume exports, premium templates, and job tools</p>
                        <div className="mt-2 flex gap-1.5">
                          <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              billingPeriod === 'monthly'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            onClick={() => setBillingPeriod('annual')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              billingPeriod === 'annual'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            3 Months
                          </button>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-text-primary">
                            {billingPeriod === 'annual' ? '$26.99' : '$9.99'}
                          </span>
                          <span className="text-xs text-text-muted">
                            {billingPeriod === 'annual' ? 'every 3 months' : 'per month'}
                          </span>
                          {billingPeriod === 'annual' && (
                            <span className="text-[10px] text-green-600 font-medium">Save $3</span>
                          )}
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                          {[
                            'Unlimited PDF/DOCX exports',
                            'All premium templates',
                            'Unlimited AI improvements',
                            'Unlimited ATS scoring',
                            'Unlimited cover letters',
                            'Job match analytics & insights',
                            'Version history & comparisons',
                            'Priority support'
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-1.5">
                              <span className="text-primary-600 text-xs">●</span>
                              <span className="text-text-muted">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-col gap-2">
                          {isPremiumMember && !isTrialActive ? (
                            <>
                              <button
                                onClick={async () => {
                                  await showAlert({
                                    type: 'info',
                                    message: 'To manage or cancel your subscription, please visit the full billing page or contact support@editresume.io.',
                                    title: 'Manage Subscription'
                                  })
                                  router.push('/billing')
                                }}
                                className="button-secondary justify-center text-xs py-2"
                              >
                                Manage subscription
                              </button>
                              <span className="text-[10px] uppercase tracking-wider text-primary-600 text-center">Current plan</span>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartCheckout(billingPeriod, 'premium')}
                              disabled={checkoutLoading || subscriptionLoading}
                              className="button-primary justify-center text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {checkoutLoading ? 'Starting checkout…' : `Upgrade (${billingPeriod === 'annual' ? '$26.99/3mo' : '$9.99/mo'})`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {paymentHistory.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-bold text-text-primary mb-4">Payment History</h3>
                        <div className="space-y-2">
                          {paymentHistory.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm rounded-lg border border-border-subtle shadow-sm surface-card"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                  ✓
                                </div>
                                <div>
                                  <div className="font-semibold text-text-primary">{payment.plan}</div>
                                  <div className="text-sm text-text-muted">{payment.date}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-text-primary">{payment.amount}</div>
                                <div className="text-sm text-green-600">{payment.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <ResumeAutomationFlow />
                  </>
                )}
              </div>
            )}

            {activeTab === 'settings' && user && (
              <SettingsPanel
                user={user}
                onDeleteAccount={handleDeleteAccount}
                onLogout={logout}
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
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-body-gradient">
            <div className="rounded-[28px] border border-border-subtle bg-white px-10 py-8 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
              <div className="flex justify-center mb-4">
                <DocumentIcon size={48} color="#0f62fe" className="animate-pulse opacity-60" />
              </div>
              <p className="text-sm font-semibold text-text-muted">Loading profile…</p>
            </div>
          </div>
        }
      >
        <ProfilePageContent />
      </Suspense>
    </ProtectedRoute>
  )
}


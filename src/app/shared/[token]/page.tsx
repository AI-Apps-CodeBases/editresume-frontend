'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import SharedResumeComments from '@/components/Resume/SharedResumeComments'
import { sharedResumeService, SharedResumeData } from '@/lib/services/sharedResume'
import AutoHideNavbar from '@/components/layout/AutoHideNavbar'

function LoadingView({ message }: { message: string }) {
  return (
    <div className="editor-shell flex min-h-screen flex-col bg-body-gradient text-text-primary pt-4">
      <AutoHideNavbar />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="rounded-[28px] border border-border-subtle bg-white px-10 py-8 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-4 text-4xl animate-pulse">📄</div>
          <p className="text-sm font-semibold text-text-muted">{message}</p>
        </div>
      </div>
    </div>
  )
}

function MessageView({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="editor-shell flex min-h-screen flex-col bg-body-gradient text-text-primary">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md rounded-[28px] border border-border-subtle bg-white px-10 py-10 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-4 text-4xl">{icon}</div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="mt-3 text-sm text-text-muted">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function SharedResumePage() {
  const params = useParams()
  const shareToken = params.token as string

  const [resumeData, setResumeData] = useState<any>(null)
  const [sharedInfo, setSharedInfo] = useState<SharedResumeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    if (shareToken) {
      loadSharedResume()
    }
  }, [shareToken])

  const loadSharedResume = async (providedPassword?: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await sharedResumeService.getSharedResume(shareToken, providedPassword)
      setSharedInfo(result)

      const formattedData = {
        name: result.resume_data.personalInfo?.name || result.resume.name,
        title: result.resume.title,
        email: result.resume_data.personalInfo?.email || '',
        phone: result.resume_data.personalInfo?.phone || '',
        location: result.resume_data.personalInfo?.location || '',
        summary: result.resume_data.summary || '',
        sections: result.resume_data.sections || [],
      }

      setResumeData(formattedData)

      try {
        await sharedResumeService.trackView(shareToken)
      } catch (err) {
        console.log('Failed to track view:', err)
      }
    } catch (err: any) {
      if (err.message.includes('401')) {
        setShowPasswordForm(true)
        setError('This resume is password protected.')
      } else if (err.message.includes('410')) {
        setError('This shared resume has expired.')
      } else if (err.message.includes('404')) {
        setError('Shared resume not found.')
      } else {
        setError('Failed to load resume.')
      }
      console.error('Failed to load shared resume:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadSharedResume(password)
  }

  if (loading) {
    return <LoadingView message="Preparing shared resume…" />
  }

  if (error && !showPasswordForm) {
    return <MessageView title="Unable to load resume" description={error} icon="⚠️" />
  }

  if (showPasswordForm) {
    return (
      <div className="editor-shell flex min-h-screen flex-col bg-body-gradient text-text-primary">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-[28px] border border-border-subtle bg-white px-8 py-10 shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
            <div className="text-center">
              <div className="mb-4 text-4xl">🔒</div>
              <h2 className="text-xl font-semibold text-text-primary">Password Required</h2>
              <p className="mt-2 text-sm text-text-muted">This resume is locked. Enter the password to view.</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && <div className="text-xs font-semibold text-accent-warning">{error}</div>}
              <button type="submit" className="button-primary w-full justify-center text-sm">
                Access resume
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!resumeData || !sharedInfo) {
    return <MessageView title="No resume data available" description="We couldn't locate any resume details for this share link." icon="🗂️" />
  }

  return (
    <div className="editor-shell flex min-h-screen flex-col bg-body-gradient text-text-primary">

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[32px] border border-border-subtle bg-white shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Resume Preview</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-text-muted">Read only</span>
            </div>
            <div className="px-6 py-6">
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-black/10">
                <PreviewPanel
                  data={resumeData}
                  template={(sharedInfo.resume.template || 'tech') as 'tech' | 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern'}
                  replacements={{}}
                  key="shared-resume-preview"
                />
              </div>
            </div>
          </div>

          <aside className="rounded-[32px] border border-border-subtle bg-white shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
            <div className="border-b border-border-subtle px-6 py-4">
              <h3 className="text-base font-semibold text-text-primary">Comments & Feedback</h3>
              <p className="mt-1 text-xs text-text-muted">
                Add notes or highlight sections. Owners see updates instantly.
              </p>
            </div>
            <div className="px-2 py-4 sm:px-4">
              <SharedResumeComments shareToken={shareToken} targetType="resume" targetId="resume" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}


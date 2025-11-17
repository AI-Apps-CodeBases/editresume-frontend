'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useState, useRef } from 'react'
import UploadResume from '@/components/Editor/UploadResume'
import { ResumeAutomationFlow } from '@/features/resume-automation/components/ResumeAutomationFlow'

const quickActions = [
  { icon: '⚡', title: 'AI Rewrite', description: 'Generate targeted improvements instantly.', href: '/editor?new=true&ai=1' },
  { icon: '🧠', title: 'Match a Job', description: 'Upload JD and tailor in minutes.', href: '/editor?view=jobs' },
  { icon: '🤝', title: 'Share Securely', description: 'Invite feedback without exporting.', href: '/profile?tab=resumes' },
]

export default function UploadPage() {
  const router = useRouter()
  const [automationOpenSignal, setAutomationOpenSignal] = useState(0)
  const automationSignalRef = useRef(0)

  const handleUploadSuccess = useCallback(
    (data: any) => {
      // Deduplicate sections by title (case-insensitive) - keep first occurrence
      const sections = Array.isArray(data?.sections) ? data.sections : []
      const seenTitles = new Map<string, number>() // Map to track first occurrence index
      const deduplicatedSections = sections.filter((section: any, index: number) => {
        if (!section || !section.title) return false
        const titleLower = section.title.toLowerCase().trim()
        if (seenTitles.has(titleLower)) {
          const firstIndex = seenTitles.get(titleLower)!
          console.warn(`⚠️ Removing duplicate section "${section.title}" during upload (keeping first occurrence at index ${firstIndex})`)
          return false
        }
        seenTitles.set(titleLower, index)
        return true
      })
      
      console.log(`📋 Deduplicated sections during upload: ${sections.length} → ${deduplicatedSections.length}`)
      
      const normalizedResume = {
        name: data?.name || '',
        title: data?.title || '',
        email: data?.email || '',
        phone: data?.phone || '',
        location: data?.location || '',
        summary: data?.summary || '',
        sections: deduplicatedSections,
      }

      if (typeof window !== 'undefined') {
        try {
          // Clear ALL cached resume data before uploading
          console.log('🧹 Clearing all cached resume data before upload')
          window.localStorage.removeItem('currentResumeId')
          window.localStorage.removeItem('currentResumeVersionId')
          window.localStorage.removeItem('resumeData') // Clear cached resume
          window.localStorage.removeItem('selectedTemplate') // Clear cached template
          
          // Generate unique upload token
          const uploadToken = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const payload = {
            resume: normalizedResume,
            template: data?.template || 'tech',
          }
          
          console.log('💾 Storing uploaded resume in sessionStorage:', uploadToken)
          window.sessionStorage.setItem(`uploadedResume:${uploadToken}`, JSON.stringify(payload))

          router.push(`/editor?resumeUpload=1&uploadToken=${uploadToken}`)
          return
        } catch (error) {
          console.error('Failed to cache uploaded resume payload:', error)
        }
      }

      router.push('/editor?resumeUpload=1')
    },
    [router]
  )

  return (
    <div className="editor-shell min-h-screen bg-body-gradient text-text-primary">


      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8">
        {automationOpenSignal > 0 && (
          <ResumeAutomationFlow hideJobList hideHeader openSignal={automationOpenSignal} />
        )}
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="badge-gradient">Upload + Diagnose</span>
            <h1 className="text-display text-text-primary">Drop in your resume. We’ll prep it for edits in seconds.</h1>
            <p className="max-w-xl text-lg text-text-muted">
              Import from PDF or DOCX, keep every structured section, and unlock ATS-aware diagnostics the moment it
              lands in the editor.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/editor?new=true" className="button-secondary text-sm">
                Start from scratch
              </Link>
              <Link href="/auth/signup" className="button-ghost text-sm">
                Need an account? →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="dashboard-card-tight hover-glow transition"
                >
                  <div className="flex items-center gap-3 text-text-primary">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.3em] text-text-muted">{item.title}</div>
                      <p className="mt-2 text-sm text-text-muted">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  automationSignalRef.current += 1
                  setAutomationOpenSignal(automationSignalRef.current)
                }}
                className="dashboard-card-tight hover-glow transition text-left"
              >
                <div className="flex items-center gap-3 text-text-primary">
                  <span className="text-2xl">✨</span>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.3em] text-text-muted">Generate Resume</div>
                    <p className="mt-2 text-sm text-text-muted">Generate resume from job in minutes.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-border-subtle bg-white p-8 shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Upload</p>
                <h2 className="mt-2 text-heading text-text-primary">Bring your resume into edit mode</h2>
              </div>
              <span className="surface-pill text-xs font-semibold text-text-muted">PDF · DOCX</span>
            </div>
            <UploadResume variant="modal" onUploadSuccess={handleUploadSuccess} />
            <div className="mt-6 text-xs text-text-muted">
              We retain layouts, sections, and bullet hierarchy. No formatting nightmares—just a clean editor ready for
              collaboration.
            </div>
          </div>
        </section>

        <section className="dashboard-card space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="badge">Playbooks</span>
              <h2 className="mt-4 text-heading text-text-primary">What happens after import?</h2>
            </div>
            <Link href="/editor" className="button-secondary text-sm">
              Go to editor
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Parse & normalize',
                description:
                  'We map sections, experience, and bullet structure into the editor so you can start editing instantly.',
              },
              {
                title: 'Flag risks automatically',
                description:
                  'ATS diagnostics highlight missing keywords, tense issues, and filler language you can rewrite fast.',
              },
              {
                title: 'Version & share',
                description:
                  'Branch tailored versions, share via secure links, and see feedback without exporting a single PDF.',
              },
            ].map((item) => (
              <div key={item.title} className="dashboard-card-tight space-y-3">
                <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

    </div>
  )
}


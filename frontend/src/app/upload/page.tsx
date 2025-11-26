'use client'
import { SearchIcon, AlertIcon, RocketIcon, DocumentIcon } from '@/components/Icons'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useState, useRef } from 'react'
import UploadResume from '@/components/Editor/UploadResume'
import { ResumeAutomationFlow } from '@/features/resume-automation/components/ResumeAutomationFlow'
import { deduplicateSections } from '@/utils/sectionDeduplication'

const quickActions = [
  { icon: '⚡', title: 'AI Rewrite', description: 'Generate targeted improvements instantly.', href: '/editor?new=true&ai=1' },
  { icon: '🧠', title: 'Match a Job', description: 'Upload JD and tailor in minutes.', href: '/editor?view=jobs' },
  { icon: '🤝', title: 'Share Securely', description: 'Invite feedback without exporting.', href: '/profile?tab=resumes' },
]

export default function UploadPage() {
  const router = useRouter()
  const [automationOpenSignal, setAutomationOpenSignal] = useState<number | undefined>(undefined)
  const automationSignalRef = useRef(0)

  const handleUploadSuccess = useCallback(
    (data: any) => {
      // Use professional deduplication utility
      const sections = Array.isArray(data?.sections) ? data.sections : []
      const deduplicatedSections = deduplicateSections(sections)
      
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
          
          // Clear ALL localStorage resume-related keys
          const keysToRemove = [
            'currentResumeId',
            'currentResumeVersionId',
            'resumeData',
            'selectedTemplate',
            'resumeHistory',
            'twoColumnLeft',
            'twoColumnRight',
            'twoColumnLeftWidth'
          ]
          keysToRemove.forEach(key => window.localStorage.removeItem(key))
          
          // Clear ALL old sessionStorage upload entries
          Object.keys(window.sessionStorage).forEach(key => {
            if (key.startsWith('uploadedResume:')) {
              console.log(`🗑️ Removing old sessionStorage entry: ${key}`)
              window.sessionStorage.removeItem(key)
            }
          })
          
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-primary-200/20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <ResumeAutomationFlow hideJobList hideHeader openSignal={automationOpenSignal} />
        
        {/* Hero Section */}
        <section className="relative">
          <div className="text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 border border-primary-200/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Upload + Diagnose</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-primary-700 to-purple-700 leading-tight">
              Drop in your resume.<br />
              <span className="text-primary-600">We'll prep it in seconds.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 leading-relaxed">
              Import from PDF or DOCX, keep every structured section, and unlock <span className="font-semibold text-primary-700">ATS-aware diagnostics</span> the moment it lands in the editor.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/editor?new=true" className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-semibold hover:border-primary-300 hover:bg-primary-50 transition-all shadow-sm hover:shadow-md">
                Start from scratch
              </Link>
              <Link href="/auth/signup" className="px-6 py-3 rounded-xl text-slate-600 font-semibold hover:text-primary-700 transition-colors">
                Need an account? →
              </Link>
            </div>
          </div>

          {/* Main Upload Area */}
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            {/* Left Side - Upload Component */}
            <div className="order-2 lg:order-1">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-8 shadow-2xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 mb-2">Upload Resume</p>
                      <h2 className="text-2xl font-bold text-slate-900">Bring your resume into edit mode</h2>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200">
                      <span className="text-xs font-semibold text-primary-700">PDF</span>
                      <span className="text-primary-300">·</span>
                      <span className="text-xs font-semibold text-primary-700">DOCX</span>
                    </div>
                  </div>
                  <UploadResume variant="modal" onUploadSuccess={handleUploadSuccess} />
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-100">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700">✨ Smart parsing:</span> We retain layouts, sections, and bullet hierarchy. No formatting nightmares—just a clean editor ready for collaboration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Quick Actions */}
            <div className="order-1 lg:order-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid gap-4">
                  {quickActions.map((item, index) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/0 via-purple-50/0 to-blue-50/0 group-hover:from-primary-50/50 group-hover:via-purple-50/50 group-hover:to-blue-50/50 transition-all duration-300"></div>
                      <div className="relative flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 mb-1">{item.title}</div>
                          <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="flex-shrink-0 text-slate-400 group-hover:text-primary-600 transition-colors">
                          →
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
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left w-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-50/0 via-purple-50/0 to-blue-50/0 group-hover:from-primary-50/50 group-hover:via-purple-50/50 group-hover:to-blue-50/50 transition-all duration-300"></div>
                    <div className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                        ✨
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 mb-1">Generate Resume</div>
                        <p className="text-sm text-slate-600 leading-relaxed">Generate resume from job in minutes.</p>
                      </div>
                      <div className="flex-shrink-0 text-slate-400 group-hover:text-primary-600 transition-colors">
                        →
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Happens After Import Section */}
        <section className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-200/20 via-purple-200/20 to-blue-200/20 rounded-3xl blur-xl"></div>
          <div className="relative rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-8 lg:p-12 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 border border-primary-200 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Playbooks</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">What happens after import?</h2>
                <p className="mt-3 text-lg text-slate-600">See how we transform your resume into an editable masterpiece</p>
              </div>
              <Link href="/editor" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105">
                Go to editor
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: '🔍',
                  title: 'Parse & normalize',
                  description:
                    'We map sections, experience, and bullet structure into the editor so you can start editing instantly.',
                  gradient: 'from-blue-50 to-cyan-50',
                  borderColor: 'border-blue-200',
                },
                {
                  icon: '⚠️',
                  title: 'Flag risks automatically',
                  description:
                    'ATS diagnostics highlight missing keywords, tense issues, and filler language you can rewrite fast.',
                  gradient: 'from-amber-50 to-orange-50',
                  borderColor: 'border-amber-200',
                },
                {
                  icon: '🚀',
                  title: 'Version & share',
                  description:
                    'Branch tailored versions, share via secure links, and see feedback without exporting a single PDF.',
                  gradient: 'from-purple-50 to-pink-50',
                  borderColor: 'border-purple-200',
                },
              ].map((item) => (
                <div key={item.title} className={`group rounded-2xl border-2 ${item.borderColor} bg-gradient-to-br ${item.gradient} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}


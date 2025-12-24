'use client'
import { SearchIcon, AlertIcon, RocketIcon, DocumentIcon } from '@/components/Icons'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useCallback, useMemo, useState } from 'react'
import UploadResume from '@/components/Editor/UploadResume'
import { deduplicateSections } from '@/utils/sectionDeduplication'
import { Brain, Sparkles, Search, AlertTriangle, Rocket } from 'lucide-react'

const quickActions = [
  { icon: Brain, title: 'Match Job Description', description: 'Upload JD and tailor in minutes.', href: '/editor?view=jobs' },
]

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40 flex items-center justify-center">
          <div className="text-sm text-slate-600">Loading…</div>
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  )
}

function UploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nextAction, setNextAction] = useState<'editor' | 'tailor'>(() => {
    const next = searchParams.get('next')
    return next === 'tailor' ? 'tailor' : 'editor'
  })
  const nextAfterUpload = useMemo(() => {
    const next = searchParams.get('next')
    return next === 'tailor' ? 'tailor' : nextAction
  }, [searchParams, nextAction])

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

          if (nextAfterUpload === 'tailor') {
            router.push(`/tailor-suggestions?resumeUpload=1&uploadToken=${uploadToken}`)
          } else {
            router.push(`/editor?resumeUpload=1&uploadToken=${uploadToken}`)
          }
          return
        } catch (error) {
          console.error('Failed to cache uploaded resume payload:', error)
        }
      }

      router.push(nextAfterUpload === 'tailor' ? '/tailor-suggestions?resumeUpload=1' : '/editor?resumeUpload=1')
    },
    [router, nextAfterUpload]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-primary-200/20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
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

          </div>

          {/* Main Upload Area */}
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            {/* Left Side - Upload Component */}
            <div className="order-2 lg:order-1">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative rounded-3xl border border-border-subtle bg-white/95 backdrop-blur-md p-8 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
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
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNextAction('editor')
                        router.push('/upload?next=editor')
                      }}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        nextAfterUpload === 'editor'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Edit after upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNextAction('tailor')
                        router.push('/upload?next=tailor')
                      }}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        nextAfterUpload === 'tailor'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Tailor to a job after upload
                    </button>
                  </div>
                  <UploadResume variant="modal" onUploadSuccess={handleUploadSuccess} />
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-100">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Smart parsing:
                      </span> We retain layouts, sections, and bullet hierarchy. No formatting nightmares—just a clean editor ready for collaboration.
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
                      className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-white/95 backdrop-blur-sm p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 surface-card"
                    >

                      <div className="relative flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          {typeof item.icon === 'string' ? item.icon : <item.icon className="w-6 h-6 text-primary-600" />}
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
                  <Link
                    href="/tailor-select-resume"
                    className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-white/95 backdrop-blur-sm p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] text-left w-full surface-card transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <Sparkles className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 mb-1">Generate Resume for JD</div>
                        <p className="text-sm text-slate-600 leading-relaxed">Tailor your resume to match a job description and increase ATS score.</p>
                      </div>
                      <div className="flex-shrink-0 text-slate-400 group-hover:text-primary-600 transition-colors group-hover:translate-x-1">
                        →
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Happens After Import Section */}
        <section className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-200/20 via-purple-200/20 to-blue-200/20 rounded-3xl blur-xl"></div>
          <div className="relative rounded-3xl border border-border-subtle bg-white/95 backdrop-blur-md p-8 lg:p-12 shadow-[0_20px_60px_rgba(15,23,42,0.12)] surface-card">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 border border-primary-200 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Playbooks</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">What happens after import?</h2>
                <p className="mt-3 text-lg text-slate-600">See how we transform your resume into an editable masterpiece</p>
              </div>
              <Link href="/editor" className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-glow hover:scale-105 button-primary" style={{ background: 'var(--gradient-accent)' }}>
                Go to editor
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: 'Parse & normalize',
                  description:
                    'We map sections, experience, and bullet structure into the editor so you can start editing instantly.',
                  gradient: 'from-blue-50 to-cyan-50',
                  borderColor: 'border-blue-200',
                  iconColor: 'text-blue-600',
                },
                {
                  icon: AlertTriangle,
                  title: 'Flag risks automatically',
                  description:
                    'ATS diagnostics highlight missing keywords, tense issues, and filler language you can rewrite fast.',
                  gradient: 'from-amber-50 to-orange-50',
                  borderColor: 'border-amber-200',
                  iconColor: 'text-amber-600',
                },
                {
                  icon: Rocket,
                  title: 'Version & share',
                  description:
                    'Branch tailored versions, share via secure links, and see feedback without exporting a single PDF.',
                  gradient: 'from-purple-50 to-pink-50',
                  borderColor: 'border-purple-200',
                  iconColor: 'text-purple-600',
                },
              ].map((item) => {
                const IconComponent = item.icon
                return (
                  <div key={item.title} className={`group rounded-2xl border-2 ${item.borderColor} bg-gradient-to-br ${item.gradient} p-6 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1`}>
                    <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className={`w-10 h-10 ${item.iconColor}`} />
                    </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}


'use client'
import { SearchIcon, AlertIcon, RocketIcon, DocumentIcon } from '@/components/Icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useState, useRef } from 'react'
import UploadResume from '@/components/Editor/UploadResume'
import { ResumeAutomationFlow } from '@/features/resume-automation/components/ResumeAutomationFlow'
import { deduplicateSections } from '@/utils/sectionDeduplication'
import { Brain, Sparkles, Search, AlertTriangle, Rocket } from 'lucide-react'

const quickActions = [
  { icon: Brain, title: 'Match Job Description', description: 'Upload JD and tailor in minutes.', href: '/editor?view=jobs' },
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
          <div className="flex flex-col items-center">
            {/* Centered Headline */}
            <div className="text-center space-y-6 mb-12 max-w-3xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight">
                Drop in your resume
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                We'll prep it in seconds. Import from PDF or DOCX, keep every structured section, and unlock <span className="font-semibold text-primary-700">ATS-aware diagnostics</span> the moment it lands in the editor.
              </p>
            </div>

            {/* Main Upload Card - Centered */}
            <div className="w-full max-w-[600px]">
              <div className="relative group">
                <div className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                  <UploadResume variant="modal" onUploadSuccess={handleUploadSuccess} />
                  
                  {/* Features at bottom */}
                  <div className="mt-6 flex items-center justify-center gap-6 flex-wrap text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">PDF & DOCX</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Smart Parsing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Horizontal Row Below */}
            <div className="w-full max-w-[600px] mt-8">
              <p className="text-xs text-slate-500 mb-4 text-center">Other ways to start:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                        {typeof item.icon === 'string' ? item.icon : <item.icon className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 mb-1">{item.title}</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
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
                  className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Generate Resume</div>
                      <p className="text-xs text-slate-600 leading-relaxed">Generate resume from job in minutes.</p>
                    </div>
                  </div>
                </button>
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


import Link from 'next/link'
import Image from 'next/image'
import Tooltip from '@/components/Shared/Tooltip'

const aiHighlights = [
  'Write polished bullet points in seconds.',
  'Pull keywords straight from any job post.',
  'Stay ATS-friendly with every export.',
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f4f7ff] to-white">
      {/* Logo */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center bg-white/95 backdrop-blur-md border border-border-subtle rounded-lg shadow-[0_4px_12px_rgba(15,23,42,0.08)] p-2 hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-200">
          <Image 
            src="/logo.jpg" 
            alt="editresume.io" 
            width={480} 
            height={240}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-primary-100 blur-[140px]" />
        <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-primary-200 blur-[160px]" />
      </div>
      <div className="container-padding mx-auto max-w-7xl pt-24 pb-0 sm:pt-28 sm:pb-2 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16">
          <div className="relative z-10">
            <span className="badge-gradient">AI RESUME BUILDER</span>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight text-text-primary sm:text-5xl lg:text-[56px]">
              Build a job-ready resume with AI, layouts, and guidance that recruiters trust.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              Import your resume or start fresh. editresume.io pairs recruiter-approved templates with guided AI so every
              section is tailored, scannable, and ready to send.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Tooltip text="Upload your existing resume file (PDF or DOCX) and we'll parse it into our editor for easy editing" position="bottom" color="gray">
                <Link href="/upload" className="button-primary text-sm">
                  import your resume
                </Link>
              </Tooltip>
              <Tooltip text="Start from scratch with a blank template and build your resume step by step with AI assistance" position="bottom" color="gray">
                <Link href="/editor?new=true" className="button-secondary text-sm">
                  create a new resume
                </Link>
              </Tooltip>
            </div>
            <div className="mt-6">
              <a
                href="https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp?utm_source=ext_app_menu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-colors"
              >
                <Image 
                  src="/extension-icon.png" 
                  alt="EditResume Extension" 
                  width={20} 
                  height={20}
                  className="w-5 h-5"
                />
                <span>Install Chrome Extension</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="mt-2 text-xs text-text-muted">
                Save LinkedIn jobs directly to editresume.io • One-click installation
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-text-muted">
              <span className="surface-pill">Works on desktop and mobile</span>
              <span className="surface-pill">No credit card needed</span>
              <span className="surface-pill">Download as PDF or DOCX</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="animate-glow-pulse absolute inset-0 -z-10 rounded-[32px] bg-primary-200 blur-[100px]" />
            <div className="relative overflow-hidden rounded-[32px] border border-border-subtle bg-white shadow-card">
              {/* CV Header */}
              <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-600 mb-2">Try AI first</p>
                    <h3 className="text-xl font-bold text-text-primary leading-tight">Sarah Chen</h3>
                    <p className="mt-0.5 text-sm font-semibold text-text-secondary">Senior Product Designer</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
                      <span>sarah.chen@email.com</span>
                      <span>•</span>
                      <span>+1 (555) 123-4567</span>
                      <span>•</span>
                      <span>San Francisco, CA</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary-50 px-3 py-0.5 text-[10px] font-semibold text-primary-700 whitespace-nowrap">
                    Live preview
                  </span>
                </div>
              </div>

              {/* CV Content */}
              <div className="p-4 space-y-4">
                {/* Professional Summary */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-1.5 border-b border-border-subtle pb-0.5">
                    Professional Summary
                  </h4>
                  <p className="text-[10px] leading-relaxed text-text-secondary mt-1.5">
                    Product designer with 8+ years of experience creating user-centered digital experiences. 
                    Specialized in accessibility, growth loops, and design systems. Led design initiatives 
                    that increased user engagement by 40% and improved conversion rates.
                  </p>
                </div>

                {/* Experience */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-2 border-b border-border-subtle pb-0.5">
                    Experience
                  </h4>
                  <div className="space-y-3 mt-2">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-text-primary">Senior Product Designer</p>
                          <p className="text-[10px] text-text-muted">TechCorp Inc. • San Francisco, CA</p>
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">2020 - Present</span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5 ml-3">
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Designed and shipped 15+ features improving user engagement by 40%</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Led accessibility initiatives ensuring WCAG 2.1 AA compliance</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Built growth loops that increased conversion rates by 25%</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-text-primary">Product Designer</p>
                          <p className="text-[10px] text-text-muted">StartupXYZ • San Francisco, CA</p>
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">2018 - 2020</span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5 ml-3">
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Collaborated with cross-functional teams to launch 3 major products</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Established design system used across 5 product teams</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-2 border-b border-border-subtle pb-0.5">
                    Skills
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['Figma', 'Accessibility', 'Growth loops', 'Design Systems', 'User Research', 'Prototyping', 'HTML/CSS', 'JavaScript'].map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded border border-border-subtle bg-primary-50/50 px-2 py-0.5 text-[10px] font-medium text-primary-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Enhancements */}
                <div className="mt-4 space-y-2 pt-4 border-t border-border-subtle">
                  {aiHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50/40 px-2.5 py-1.5"
                    >
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] font-semibold text-white">
                        AI
                      </span>
                      <p className="text-[10px] text-text-secondary leading-relaxed">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

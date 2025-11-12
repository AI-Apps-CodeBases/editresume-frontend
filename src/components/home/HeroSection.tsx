import Link from 'next/link'

const logos = ['Amazon', 'Pinterest', 'Nike', 'Kaiser Permanente', 'Sephora'] as const

const aiHighlights = [
  'Write polished bullet points in seconds.',
  'Pull keywords straight from any job post.',
  'Stay ATS-friendly with every export.',
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f4f7ff] to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-primary-100 blur-[140px]" />
        <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-primary-200 blur-[160px]" />
      </div>
      <div className="container-padding mx-auto max-w-7xl py-24 sm:py-28 lg:py-32">
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
              <Link href="/upload" className="button-primary text-sm">
                Import your resume
              </Link>
              <Link href="/editor?new=true" className="button-secondary text-sm">
                Create my resume
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-text-muted">
              <span className="surface-pill">Works on desktop and mobile</span>
              <span className="surface-pill">No credit card needed</span>
              <span className="surface-pill">Download as PDF or DOCX</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="animate-glow-pulse absolute inset-0 -z-10 rounded-[32px] bg-primary-200 blur-[100px]" />
            <div className="relative overflow-hidden rounded-[32px] border border-border-subtle bg-white p-8 shadow-card">
              <div className="flex items-center justify-between gap-6 border-b border-border-subtle pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">Try AI first</p>
                  <h3 className="mt-2 text-xl font-semibold text-text-primary">Senior Product Designer</h3>
                  <p className="text-sm text-text-muted">Figma • Accessibility • Growth loops</p>
                </div>
                <span className="rounded-full bg-primary-50 px-4 py-1 text-xs font-semibold text-primary-700">
                  Live preview
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {aiHighlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-primary-50/60 px-4 py-3"
                  >
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                      AI
                    </span>
                    <p className="text-sm text-text-secondary">{highlight}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-primary-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">ATS score</p>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold text-text-primary">
                    <span>93 / 100</span>
                    <span className="text-accent-teal text-xs font-medium uppercase tracking-[0.2em]">Ready to send</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-primary-100">
                    <div className="h-2 w-[93%] rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border-subtle bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">Collaboration</p>
                    <p className="mt-2 text-sm text-text-secondary">Clara & Dev are editing with you</p>
                  </div>
                  <div className="flex -space-x-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-200 text-sm font-semibold text-primary-700">
                      C
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-300 text-sm font-semibold text-primary-700">
                      D
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-xs font-semibold text-text-muted">
                      +3
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="font-semibold text-text-secondary">Our customers have been hired by:</span>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-primary-50 px-4 py-1 text-xs font-semibold text-primary-600">14,900+ reviews</span>
              <span>Excellent on Trustpilot</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-10 rounded-3xl border border-border-subtle bg-white px-8 py-6 shadow-[0_18px_32px_rgba(15,23,42,0.05)]">
            {logos.map((logo) => (
              <span key={logo} className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

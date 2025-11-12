import Link from 'next/link'
import { StatsPanel } from './StatsPanel'

const heroStats = [
  { value: '92%', label: 'ATS PASS RATE', caption: 'Average across 10k+ resumes', trend: 'up' as const },
  { value: '14d', label: 'TIME TO OFFER', caption: 'Median for premium users' },
  { value: '4.9★', label: 'RATING', caption: 'Community feedback', trend: 'steady' as const },
]

export default function HeroSection() {
  return (
    <section className="section-spacing relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-body-gradient opacity-90" />
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-accent-pink/30 blur-3xl" />
        <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-accent-gradientEnd/25 blur-[160px]" />
        <div className="absolute inset-x-0 top-1/2 h-96 -translate-y-1/2 bg-navy-glow opacity-70 blur-[120px]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="relative">
            <span className="badge-gradient">AI Resume OS</span>
            <h1 className="mt-6 text-balance text-display text-white">
              Stop wrangling docs. Ship a magnetic resume in minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              editresume.io transforms resume writing into a collaborative product workflow. Real-time AI refinement,
              version control, and ATS intelligence bundled into one sleek workspace.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/upload" className="button-primary text-sm">
                Edit your resume
              </Link>
              <Link href="/editor?new=true" className="button-secondary text-sm">
                Create a new resume
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-4 text-xs text-text-muted sm:text-sm">
              <span className="surface-pill">Real-time collaboration</span>
              <span className="surface-pill">AI job matching</span>
              <span className="surface-pill">Zero export friction</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 animate-glow-pulse rounded-[32px] bg-accent-pink/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-border-subtle bg-surface-500/60 p-8 shadow-card backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Live job match</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">Senior Product Designer</h3>
                  <p className="mt-1 text-sm text-text-secondary">Figma • Accessibility • Growth Loops</p>
                </div>
                <span className="rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-accent-teal">
                  +37% fit
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">ATS grade</span>
                    <span className="text-base font-semibold text-accent-teal">86 / 100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-[86%] rounded-full bg-gradient-to-r from-accent-gradientStart via-primary to-accent-gradientEnd" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">AI rewrite suggestions</span>
                    <span className="rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-text-primary">12 ready</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-accent-teal">●</span>
                      Tailor summary for mission-led growth
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-accent-teal">●</span>
                      Add quantified design-system impact
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-accent-teal">●</span>
                      Mirror language from job description
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between rounded-2xl border border-border-subtle bg-white/5 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Collaboration</p>
                  <p className="mt-2 text-sm font-medium text-text-secondary">Realtime edits from Clara & Dev</p>
                </div>
                <div className="flex -space-x-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-gradientEnd/30 text-sm font-semibold text-white">
                    C
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-pink/40 text-sm font-semibold text-white">
                    D
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-text-secondary">
                    +3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatsPanel stats={heroStats} />
      </div>
    </section>
  )
}



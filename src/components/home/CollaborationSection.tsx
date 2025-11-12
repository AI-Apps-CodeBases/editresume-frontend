import Link from 'next/link'

export default function CollaborationSection() {
  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] border border-border-subtle bg-surface-500/80 p-10 shadow-card backdrop-blur">
          <div className="absolute inset-0 bg-navy-glow opacity-70 blur-[120px]" />
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-accent-gradientEnd/30 blur-3xl" />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="badge-gradient">COLLABORATION</span>
              <h2 className="mt-6 text-heading text-white">A shared workspace for operators, jobseekers, and teams.</h2>
              <p className="mt-4 text-base text-text-secondary">
                Loop in mentors, recruiters, or managers without the download dance. Live cursors, contextual comments,
                and a tidy audit trail keep everything crisp.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-text-secondary">
                <span className="surface-pill">Share-by-link with permissions</span>
                <span className="surface-pill">Comment + suggest mode</span>
                <span className="surface-pill">Version history & restore</span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/auth/signup" className="button-primary text-sm text-center">
                Invite collaborators
              </Link>
              <Link href="/shared/demo" className="button-secondary text-sm text-center">
                Preview reviewer mode
              </Link>
              <span className="text-xs text-text-muted">No downloads. Just a clean, live resume workspace.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}



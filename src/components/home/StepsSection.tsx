const steps = [
  {
    number: '01',
    title: 'Drop in your current resume or start blank',
    description:
      'Import from DOCX, PDF, or LinkedIn. Auto-structure sections, keep all formatting intact, and prime the editor with your content.',
  },
  {
    number: '02',
    title: 'Pair AI with version control',
    description:
      'Spin up drafts with guided AI flows, compare changes side-by-side, and ship the version that best matches the job in play.',
  },
  {
    number: '03',
    title: 'Match jobs, send, track',
    description:
      'Sync job posts, tailor your resume automatically, and push applications with Jobright. Every outcome rolls into analytics.',
  },
]

function StepCard({ number, title, description }: (typeof steps)[0]) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-border-subtle bg-surface-500/70 p-8 shadow-card transition hover:border-border-strong hover:shadow-glow">
      <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[48px] bg-accent-pink/20 transition group-hover:bg-accent-gradientEnd/25" />
      <div className="relative z-10 flex flex-col gap-4">
        <span className="inline-flex w-fit items-center rounded-pill border border-border-subtle bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.35em] text-text-secondary">
          {number}
        </span>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  )
}

export default function StepsSection() {
  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.5fr_1fr]">
          <div>
            <span className="badge">HOW IT WORKS</span>
            <h2 className="mt-6 text-heading text-white">Ship a tailored resume in less time than it takes to brew coffee.</h2>
            <p className="mt-4 text-base text-text-secondary">
              Every workflow in editresume.io is designed for speed—no wrestling with formatting, no exporting every
              single update. Just build, tailor, and ship.
            </p>
          </div>
          <div className="grid gap-6">
            {steps.map((step) => (
              <StepCard key={step.number} {...step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}



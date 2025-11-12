import { FeatureCard } from './FeatureCard'

const features = [
  {
    icon: '✨',
    title: 'Realtime AI rewrite playground',
    description:
      'Pair every bullet with a tuning dial. Generate targeted rewrites that blend your voice with job-specific language and measurable impact.',
    href: '/editor',
    cta: 'Open the editor',
    badge: 'Live',
  },
  {
    icon: '🛰️',
    title: 'ATS intelligence with signal tracking',
    description:
      'Know exactly why a resume ranks. We benchmark your content against 30+ ATS systems and surface missing keywords with confidence scores.',
    href: '/editor',
    cta: 'See ATS insights',
  },
  {
    icon: '🤝',
    title: 'Collaborate without docs or downloads',
    description:
      'Share a secure link, gather feedback inline, and commit changes with version control. No more exporting PDFs for every revision.',
    href: '/shared/demo',
    cta: 'Share a live resume',
  },
  {
    icon: '📈',
    title: 'Upload, analyze, and tailor',
    description:
      'Drop in any resume, sync from LinkedIn, and watch smart diagnostics highlight risks, gaps, and quick wins in seconds.',
    href: '/upload',
    cta: 'Start with upload',
  },
]

export default function FeatureGrid() {
  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 text-center">
          <span className="badge-gradient mx-auto">WHY TEAMS SWITCH</span>
          <h2 className="text-heading text-white">
            Replace your markdown, Google Docs, and scattered exports with a single live workspace.
          </h2>
          <p className="mx-auto max-w-3xl text-base text-text-secondary">
            editresume.io is the structured resume stack designed for builders and operators. Every component is built
            to move faster—from drafting to collaboration to applying.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}



import Link from 'next/link'

interface FeatureCardProps {
  icon: string
  title: string
  description: string
  href?: string
  cta?: string
  badge?: string
}

export function FeatureCard({ icon, title, description, href, cta, badge }: FeatureCardProps) {
  const content = (
    <div className="h-full rounded-[28px] border border-border-subtle bg-surface-500/75 p-8 shadow-card transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-glow">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">{icon}</div>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-text-secondary">{description}</p>
      {cta && href && (
        <span className="mt-6 inline-flex items-center text-sm font-semibold text-text-secondary transition hover:text-text-primary">
          {cta} →
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gradientEnd/60 focus-visible:ring-offset-0">
        {content}
      </Link>
    )
  }

  return content
}



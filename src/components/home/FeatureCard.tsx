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
    <div className="h-full rounded-[28px] border border-border-subtle bg-white p-8 shadow-[0_18px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_26px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-2xl text-primary-700 shadow-[0_12px_20px_rgba(15,23,42,0.06)]">
          {icon}
        </div>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-text-primary">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">{description}</p>
      {cta && href && (
        <span className="mt-6 inline-flex items-center text-sm font-semibold text-primary-600 transition hover:text-primary-700">
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



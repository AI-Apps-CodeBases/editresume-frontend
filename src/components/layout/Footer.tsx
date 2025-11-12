import Link from 'next/link'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { href: '/editor', label: 'Editor' },
      { href: '/upload', label: 'Upload' },
      { href: '/profile', label: 'Profile' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: 'mailto:support@editresume.io', label: 'Support' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/docs', label: 'Documentation' },
      { href: '/changelog', label: 'Changelog' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-500/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white shadow-glow">
                ER
              </div>
              <span className="text-lg font-semibold text-white">editresume.io</span>
            </div>
            <p className="mt-6 max-w-sm text-sm text-text-muted">
              Build resumes that cut through the noise. Powerful collaboration, ATS insights, and a polished editor in
              one workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs text-text-secondary">
              <span className="surface-pill">Made for modern builders</span>
              <span className="surface-pill">AI-native resume OS</span>
            </div>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.32em] text-text-secondary">{section.title}</h3>
              <ul className="mt-6 space-y-3 text-sm text-text-muted">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border-subtle pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} editresume.io. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="transition hover:text-text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-text-primary">
              Privacy
            </Link>
            <Link href="mailto:support@editresume.io" className="transition hover:text-text-primary">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}



'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const footerSections = [
  {
    title: 'Resume',
    links: [
      { href: '/editor', label: 'AI Resume Builder' },
      { href: '#', label: 'Resume Templates' },
      { href: '#', label: 'Resume Examples' },
      { href: '#', label: 'ATS Resume Checker' },
    ],
  },
  {
    title: 'Cover Letter',
    links: [
      { href: '#', label: 'Cover Letter Builder' },
      { href: '#', label: 'Cover Letter Templates' },
      { href: '#', label: 'Cover Letter Examples' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '#', label: 'Job Resources' },
      { href: '#', label: 'Resume Tips' },
      { href: '#', label: 'Interview Guides' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: 'mailto:support@editresume.io', label: 'Contact' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
] as const

export default function Footer() {
  const pathname = usePathname()

  if (pathname?.startsWith('/dashboard')) return null

  return (
    <footer className="border-t border-border-subtle bg-[#f1f5ff]">
      <div className="container-padding mx-auto max-w-7xl py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 text-lg font-semibold text-white shadow-[0_18px_30px_rgba(15,98,254,0.28)]">
                ER
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-text-primary">editresume.io</span>
                <span className="text-xs font-medium uppercase tracking-[0.25em] text-text-muted">Resume Workspace</span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Build resumes that cut through the noise. Powerful AI assistance, recruiter-approved templates, and export
              options that keep you ready for every application.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
              <span className="surface-pill">AI-powered content suggestions</span>
              <span className="surface-pill">ATS friendly formats</span>
              <span className="surface-pill">Built for teams & coaches</span>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-text-muted">{section.title}</h3>
              <ul className="space-y-3 text-sm text-text-muted">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-primary-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-border-subtle pt-6 text-xs text-text-muted md:grid-cols-[2fr_1fr] md:items-center">
          <p>
            Customer service:{' '}
            <a href="tel:8443517484" className="font-semibold text-primary-700">
              844-351-7484
            </a>{' '}
            •{' '}
            <a href="mailto:support@editresume.io" className="font-semibold text-primary-700">
              support@editresume.io
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-4 md:justify-end">
            <Link href="#" className="transition hover:text-primary-700">
              Accessibility
            </Link>
            <Link href="#" className="transition hover:text-primary-700">
              Sitemap
            </Link>
            <Link href="#" className="transition hover:text-primary-700">
              Press
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-xs text-text-muted md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} editresume.io. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/privacy" className="transition hover:text-primary-700">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-primary-700">
              Terms of Use
            </Link>
            <Link href="#" className="transition hover:text-primary-700">
              Do Not Sell My Info
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigation = [
  { href: '/editor', label: 'Editor' },
  { href: '/upload', label: 'Upload' },
  { href: '/profile', label: 'Profile' },
  { href: '/billing', label: 'Billing' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between rounded-3xl border border-border-subtle bg-surface-500/75 px-5 py-3 shadow-frosted backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white shadow-glow">
              ER
            </div>
            <Link href="/" className="text-base font-semibold text-white sm:text-lg">
              editresume.io
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-white/15 text-white shadow-glow'
                    : 'text-text-muted hover:bg-white/10 hover:text-text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/auth/login" className="button-ghost text-sm">
              Sign in
            </Link>
            <Link href="/auth/signup" className="button-primary text-sm">
              Start Free
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border-subtle bg-white/5 text-white transition hover:border-border-strong hover:bg-white/10 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {open && (
          <div className="mt-3 overflow-hidden rounded-3xl border border-border-subtle bg-surface-500/90 shadow-frosted backdrop-blur-xl md:hidden">
            <nav className="flex flex-col divide-y divide-border-subtle">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`px-5 py-4 text-sm font-medium ${
                    isActive(item.href) ? 'bg-white/10 text-white' : 'text-text-secondary hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3 px-5 py-4">
              <Link href="/auth/login" onClick={() => setOpen(false)} className="button-secondary text-sm">
                Sign in
              </Link>
              <Link href="/auth/signup" onClick={() => setOpen(false)} className="button-primary text-sm text-center">
                Start Free
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}



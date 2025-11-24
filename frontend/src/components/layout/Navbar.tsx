'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

const primaryNav = [
  { href: '/editor', label: 'Builder' },
  { href: '/upload', label: 'Resumes' },
  { href: '/profile', label: 'Profiles' },
  { href: '/billing', label: 'Plans' },
  { href: '/#resources', label: 'Resources' },
] as const

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/#resources') return pathname === '/'
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_12px_20px_rgba(15,23,42,0.06)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.jpg" 
              alt="editresume.io" 
              width={480} 
              height={240}
              className="h-24 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`relative text-xs font-semibold transition ${
                  isActive(item.href) ? 'text-primary-700' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary-600" />
                )}
              </Link>
            ))}
          </nav>


          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-white text-text-primary transition hover:border-border-strong lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
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
          <div className="pb-6 lg:hidden">
            <nav className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_18px_30px_rgba(15,23,42,0.06)]">
              {primaryNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive(item.href) ? 'bg-primary-50 text-primary-700' : 'text-text-muted hover:bg-primary-50/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}



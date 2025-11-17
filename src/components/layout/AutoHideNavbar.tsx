'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'

const primaryNav = [
  { href: '/editor', label: 'Builder' },
  { href: '/upload', label: 'Resumes' },
  { href: '/profile', label: 'Profiles' },
  { href: '/billing', label: 'Plans' },
  { href: '/#resources', label: 'Resources' },
] as const

function AutoHideNavbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const isActive = (href: string) => {
    if (href === '/#resources') return pathname === '/'
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    const handleMouseMove = (e: MouseEvent) => {
      // Show navbar when mouse is in top 50px of screen
      if (e.clientY <= 50) {
        setIsVisible(true)
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = undefined
        }
      } else if (e.clientY > 80 && isVisible && !open) {
        // Hide navbar after 1 second when mouse leaves top area
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
          setIsVisible(false)
        }, 1000)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isVisible, open])

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] bg-white shadow-[0_12px_20px_rgba(15,23,42,0.06)] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        if (!open) {
          setTimeout(() => setIsVisible(false), 1500)
        }
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.jpg" 
              alt="editresume.io" 
              width={400} 
              height={200}
              className="h-16 w-auto"
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

export default AutoHideNavbar
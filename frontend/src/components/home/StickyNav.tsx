'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StickyNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-user-menu]')) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-border-subtle shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="w-full px-[10%] flex items-center justify-between h-16">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.jpg"
            alt="editresume.io"
            width={480}
            height={240}
            className="h-14 w-auto mix-blend-multiply"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/extension"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Job Saver
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/tutorial"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Tutorial
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Contact
          </Link>
          <Link
            href="/terms"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Privacy
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" data-user-menu>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-primary-50/50"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm" style={{ background: 'var(--gradient-accent)' }}>
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline">{user?.name || user?.email || 'Account'}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-border-subtle py-2 z-50 backdrop-blur-sm">
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-primary-50/50 transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={async () => {
                      await logout()
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="button-primary text-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}


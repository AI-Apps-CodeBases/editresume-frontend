'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function StickyNav() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-border-subtle shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-padding mx-auto max-w-7xl flex items-center justify-between h-16">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.jpg"
            alt="editresume.io"
            width={480}
            height={240}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="/editor?view=templates"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/extension"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Job Saver
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </nav>
    </header>
  )
}


'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BackButtonProps {
  fallbackHref?: string
  className?: string
}

export default function BackButton({ fallbackHref = '/', className = '' }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  )
}


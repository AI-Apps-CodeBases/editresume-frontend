import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Account Access',
  description: 'Sign in or create an account to access editresume.io features.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-body-gradient px-4 py-16 text-text-primary">
      <div className="absolute top-10 left-1/2 z-10 -translate-x-1/2 text-xs text-text-secondary">
        <Link href="/" className="rounded-pill border border-border-subtle bg-white/5 px-4 py-2 font-semibold uppercase tracking-[0.35em] transition hover:border-border-strong hover:text-text-primary">
          ← Back to site
        </Link>
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}



'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/contexts/AuthContext'

const getErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'That email is already registered.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      default:
        return error.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Unable to create account. Please try again.'
}

function SignupPageContent() {
  const { signUp, signInWithGoogle } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp({ email: email.trim(), password, name: name.trim() })
      const next = searchParams.get('next')
      router.replace(next || '/editor')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      const next = searchParams.get('next')
      router.replace(next || '/editor')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

  return (
    <div className="w-full rounded-[32px] border border-border-subtle bg-surface-500/85 p-10 shadow-card backdrop-blur">
      <div className="mb-8 text-center">
        <div className="mb-4 text-4xl">✨</div>
        <h1 className="text-3xl font-semibold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-text-secondary">Build resumes that actually convert and track every send.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-border-subtle bg-surface-500/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Alex Johnson"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-border-subtle bg-surface-500/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-border-subtle bg-surface-500/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 text-sm text-accent-warning">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-text-muted">
          <span className="h-px flex-1 bg-border-subtle" />
          Or continue with
          <span className="h-px flex-1 bg-border-subtle" />
        </div>
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isBusy}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-white/5 px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-xl">🔎</span>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-text-muted">
        By signing up, you agree to our{' '}
        <a href="/terms" className="font-semibold text-text-primary underline-offset-4 hover:underline">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="font-semibold text-text-primary underline-offset-4 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-body-gradient">
          <div className="rounded-[28px] border border-border-subtle bg-surface-500/85 px-10 py-8 text-center shadow-card">
            <div className="mb-4 text-3xl">✨</div>
            <p className="text-sm font-semibold text-text-secondary">Preparing signup form…</p>
          </div>
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  )
}


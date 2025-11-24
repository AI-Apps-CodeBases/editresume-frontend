'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/contexts/AuthContext'

const getErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.'
      default:
        return error.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Unable to sign in. Please try again.'
}

function LoginPageContent() {
  const { signIn, signInWithGoogle } = useAuth()
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
      await signIn(email.trim(), password)
      const next = searchParams.get('next')
      const extensionAuth = searchParams.get('extensionAuth')
      if (extensionAuth === '1') {
        router.replace(`/?extensionAuth=1`)
      } else {
        router.replace(next || '/editor')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      const next = searchParams.get('next')
      const extensionAuth = searchParams.get('extensionAuth')
      if (extensionAuth === '1') {
        router.replace(`/?extensionAuth=1`)
      } else {
        router.replace(next || '/editor')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

  return (
    <div className="w-full rounded-[32px] border border-border-subtle bg-white p-10 shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-8 text-center">
        <div className="mb-4 text-4xl">🔐</div>
        <h1 className="text-3xl font-semibold text-text-primary">Welcome back</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to continue building magnetic resumes.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">
            <label htmlFor="password">Password</label>
            <Link href="/auth/reset" className="text-text-muted hover:text-text-primary">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="••••••••"
            autoComplete="current-password"
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
          {loading ? 'Signing in…' : 'Sign in'}
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
          onClick={handleGoogleSignIn}
          disabled={isBusy}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-xl">🔎</span>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-text-secondary">
        No account yet?{' '}
        <Link href="/auth/signup" className="font-semibold text-text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-text-muted">
        Need help?{' '}
        <a href="mailto:support@editresume.io" className="font-semibold text-text-primary underline-offset-4 hover:underline">
          Contact support
        </a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-body-gradient">
          <div className="rounded-[28px] border border-border-subtle bg-white px-10 py-8 text-center shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-4 text-3xl">🔐</div>
            <p className="text-sm font-semibold text-text-muted">Preparing login form…</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}


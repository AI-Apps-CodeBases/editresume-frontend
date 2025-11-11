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
      router.replace(next || '/editor')
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
      router.replace(next || '/editor')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl">
      <div className="mb-8 text-center">
        <div className="mb-4 text-4xl">🔐</div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in to manage your resumes and saved jobs.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
            <label htmlFor="password">Password</label>
            <Link href="/auth/reset" className="text-purple-600 hover:text-purple-500">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100"
            placeholder="••••••••"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200"></span>
          <span className="text-xs uppercase tracking-wide text-gray-400">or continue with</span>
          <span className="h-px flex-1 bg-gray-200"></span>
        </div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isBusy}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-purple-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-xl">🔎</span>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        No account yet?{' '}
        <Link href="/auth/signup" className="font-semibold text-purple-600 hover:text-purple-500">
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-gray-400">
        Need help? <a href="mailto:support@editresume.io" className="underline">Contact support</a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-blue-600 to-purple-600">
          <div className="rounded-3xl bg-white/90 px-10 py-8 text-center shadow-2xl">
            <div className="mb-4 text-3xl">🔐</div>
            <p className="text-sm font-semibold text-gray-700">Preparing login form…</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}


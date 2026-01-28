'use client'
import { MailIcon } from '@/components/Icons'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/contexts/AuthContext'

const getErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found for that email.'
      case 'auth/invalid-email':
        return 'Enter a valid email address.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.'
      default:
        return error.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Unable to send reset email. Please try again.'
}

export default function ResetPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await resetPassword(email.trim())
      setSuccess('If an account exists for that email, we sent a reset link to your inbox.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full rounded-[32px] border border-border-subtle bg-white p-10 shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <MailIcon size={48} color="#0f62fe" />
        </div>
        <h1 className="text-3xl font-semibold text-text-primary">Reset your password</h1>
        <p className="mt-2 text-sm text-text-muted">
          Enter your email and we’ll send a fresh reset link.
        </p>
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

        {error && (
          <div className="rounded-2xl border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 text-sm text-accent-warning">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-accent-teal/50 bg-accent-teal/10 px-4 py-3 text-sm text-accent-teal">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Sending link…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-8 space-y-2 text-center text-sm text-text-secondary">
        <p>
          Remembered your password?{' '}
          <Link href={`/auth/login${queryString ? `?${queryString}` : ''}`} className="font-semibold text-text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
        <p>
          Need an account?{' '}
          <Link href={`/auth/signup${queryString ? `?${queryString}` : ''}`} className="font-semibold text-text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

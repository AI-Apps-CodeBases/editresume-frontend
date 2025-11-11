'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl">
      <div className="mb-8 text-center">
        <div className="mb-4 text-4xl">📮</div>
        <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email and we will send you a reset link.
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

        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Sending link…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-8 space-y-2 text-center text-sm text-gray-500">
        <p>
          Remembered your password?{' '}
          <Link href="/auth/login" className="font-semibold text-purple-600 hover:text-purple-500">
            Sign in
          </Link>
        </p>
        <p>
          Need an account?{' '}
          <Link href="/auth/signup" className="font-semibold text-purple-600 hover:text-purple-500">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}



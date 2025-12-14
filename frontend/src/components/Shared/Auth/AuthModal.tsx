'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLinkedIn } from '@/hooks/useLinkedIn'

const EXTENSION_AUTH_KEY = 'extensionAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'signup' | 'reset'
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentMode, setCurrentMode] = useState<typeof mode>(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkedInLoading, setLinkedInLoading] = useState(false)
  const { signIn, signUp, resetPassword, signInWithGoogle, isAuthenticated } = useAuth()
  const { connectLinkedIn } = useLinkedIn()

  const getExtensionAuth = () => {
    if (typeof window === 'undefined') return null
    return searchParams.get('extensionAuth') || sessionStorage.getItem(EXTENSION_AUTH_KEY)
  }

  const handlePostLogin = () => {
    const extensionAuth = getExtensionAuth()
    if (extensionAuth === '1') {
      sessionStorage.setItem(EXTENSION_AUTH_KEY, '1')
      router.push('/?extensionAuth=1')
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (currentMode === 'login') {
        await signIn(email, password)
        handlePostLogin()
      } else if (currentMode === 'signup') {
        await signUp({ email, password, name })
        handlePostLogin()
      } else {
        await resetPassword(email)
        setSuccess('Reset link sent to your inbox.')
      }
    } catch (err: any) {
      const message = err?.message ?? 'Authentication failed. Try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (nextMode: typeof currentMode) => {
    setCurrentMode(nextMode)
    setError('')
    setSuccess('')
    if (nextMode !== 'signup') {
      setName('')
    }
    if (nextMode === 'reset') {
      setPassword('')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccess('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      handlePostLogin()
    } catch (err: any) {
      const message = err?.message ?? 'Google sign in failed. Try again.'
      setError(message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleLinkedInConnect = async () => {
    setError('')
    setSuccess('')
    if (!isAuthenticated) {
      setError('Please sign in first to connect LinkedIn')
      return
    }
    setLinkedInLoading(true)
    try {
      await connectLinkedIn()
    } catch (err: any) {
      const message = err?.message ?? 'LinkedIn connection failed. Try again.'
      setError(message)
    } finally {
      setLinkedInLoading(false)
    }
  }

  const isBusy = loading || googleLoading || linkedInLoading

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentMode === 'login' && 'Welcome Back'}
            {currentMode === 'signup' && 'Create Account'}
            {currentMode === 'reset' && 'Reset Password'}
          </h2>
          <p className="text-gray-600 mt-2">
            {currentMode === 'login' && 'Sign in to save and export your resume'}
            {currentMode === 'signup' && 'Sign up to unlock all features'}
            {currentMode === 'reset' && 'Enter your email to receive a reset link'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentMode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          {currentMode !== 'reset' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 text-green-600 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all"
          >
            {isBusy && currentMode !== 'reset' && '⏳ Processing...'}
            {isBusy && currentMode === 'reset' && '⏳ Sending...'}
            {!isBusy && currentMode === 'login' && '🚀 Sign In'}
            {!isBusy && currentMode === 'signup' && '✨ Create Account'}
            {!isBusy && currentMode === 'reset' && '📮 Send Reset Link'}
          </button>
        </form>

        {currentMode !== 'reset' && (
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
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLinkedInConnect}
                disabled={isBusy}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#0077B5] px-4 py-3 text-sm font-semibold text-[#0077B5] transition-all hover:bg-[#0077B5] hover:text-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                {linkedInLoading ? 'Connecting...' : 'Connect LinkedIn'}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 text-center space-y-3">
          {currentMode !== 'reset' && (
            <button
              onClick={() => toggleMode(currentMode === 'login' ? 'signup' : 'login')}
              className="block w-full text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              {currentMode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          )}

          {currentMode === 'login' && (
            <button
              onClick={() => toggleMode('reset')}
              className="block w-full text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
              Forgot password?
            </button>
          )}

          <div className="text-xs text-gray-400">
            Prefer full page?{' '}
            <Link href="/auth/login" className="text-purple-600 hover:text-purple-500 font-semibold">
              Open auth portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

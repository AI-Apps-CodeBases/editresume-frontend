'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'signup' | 'reset'
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
  const [currentMode, setCurrentMode] = useState<typeof mode>(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (currentMode === 'login') {
        await signIn(email, password)
        onClose()
      } else if (currentMode === 'signup') {
        await signUp({ email, password, name })
        onClose()
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
      onClose()
    } catch (err: any) {
      const message = err?.message ?? 'Google sign in failed. Try again.'
      setError(message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

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

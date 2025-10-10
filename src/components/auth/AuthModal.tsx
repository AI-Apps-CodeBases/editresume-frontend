'use client'
import { useState } from 'react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: (user: { email: string; name: string; isPremium: boolean }) => void
  mode?: 'login' | 'signup'
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, mode = 'login' }: AuthModalProps) {
  const [currentMode, setCurrentMode] = useState(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = currentMode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(currentMode === 'signup' && { name })
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onAuthSuccess(data.user)
        onClose()
      } else {
        setError(data.message || 'Authentication failed')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
            {currentMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-2">
            {currentMode === 'login' 
              ? 'Sign in to save and export your resume' 
              : 'Sign up to unlock all features'}
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

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all"
          >
            {loading ? '⏳ Processing...' : currentMode === 'login' ? '🚀 Sign In' : '✨ Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setCurrentMode(currentMode === 'login' ? 'signup' : 'login')
              setError('')
            }}
            className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            {currentMode === 'login' 
              ? "Don't have an account? Sign up" 
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}


'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { useModal } from '@/contexts/ModalContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: Props) {
  const { user } = useAuth()
  const { showAlert } = useModal()
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [category, setCategory] = useState<string>('general')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is authenticated
  const isAuthenticated = !!user

  // Email validation regex
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return

    // Validate email for anonymous users
    if (!isAuthenticated) {
      if (!email.trim()) {
        await showAlert({
          message: 'Please provide your email address to submit feedback.',
          type: 'error',
        })
        return
      }
      if (!isValidEmail(email.trim())) {
        await showAlert({
          message: 'Please enter a valid email address.',
          type: 'error',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const userStr = localStorage.getItem('user')
      const userData = userStr ? JSON.parse(userStr) : null
      
      // Use authenticated user's email or the provided email from the form
      const userEmail = userData?.email || email.trim() || null
      
      const response = await fetch(`${config.apiBase}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim(),
          category,
          page_url: window.location.pathname,
          user_email: userEmail,
        }),
      })

      if (response.ok) {
        await showAlert({
          message: 'Thank you for your feedback!',
          type: 'success',
        })
        onClose()
        setFeedback('')
        setRating(null)
        setEmail('') // Reset email field
      } else {
        const error = await response.json()
        await showAlert({
          message: error.detail || 'Failed to submit feedback. Please try again.',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      await showAlert({
        message: 'Failed to submit feedback. Please try again.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Share Your Feedback</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="ui">UI/UX</option>
                <option value="performance">Performance</option>
              </select>
            </div>

            {/* Email field - only show for anonymous users */}
            {!isAuthenticated && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this to follow up on your feedback if needed.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Rating (Optional)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`w-10 h-10 rounded-full transition-all ${
                      rating && num <= rating
                        ? 'bg-yellow-400 scale-110'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us about your experience..."
                className="w-full px-3 py-2 border rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  !feedback.trim() || 
                  (!isAuthenticated && (!email.trim() || !isValidEmail(email.trim())))
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


'use client'
import { useState, useEffect } from 'react'
import FeedbackModal from './FeedbackModal'

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    const submitted = localStorage.getItem('feedback_submitted')
    if (submitted) {
      const submittedDate = new Date(submitted)
      const daysSince = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) {
        setHasSubmitted(true)
      } else {
        localStorage.removeItem('feedback_submitted')
      }
    }
  }, [])

  if (hasSubmitted) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
        aria-label="Send feedback"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      </button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}


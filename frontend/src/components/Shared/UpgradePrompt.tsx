'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTrial } from '@/hooks/useTrial'
import { type FeatureType } from '@/lib/usageLimits'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  featureType: FeatureType
  currentUsage: number
  limit: number | null
  period: string
  message?: string
}

export default function UpgradePrompt({
  isOpen,
  onClose,
  featureType,
  currentUsage,
  limit,
  period,
  message,
}: UpgradePromptProps) {
  const { user, isAuthenticated } = useAuth()
  const { startTrial, isTrialActive, checkTrialEligibility, loading: trialLoading } = useTrial()
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [startingTrial, setStartingTrial] = useState(false)

  const featureLabels: Record<FeatureType, string> = {
    improvement: 'AI Improvements',
    ats: 'ATS Scoring',
    ats_enhanced: 'Enhanced ATS Scoring',
    cover_letter: 'Cover Letter Generation',
    content_generation: 'Content Generation',
    section_assistant: 'Section Assistant',
    job_matching: 'Job Matching',
    exports: 'Resume Exports',
  }

  const featureLabel = featureLabels[featureType] || featureType

  const handleStartTrial = async () => {
    setStartingTrial(true)
    const result = await startTrial()
    if (result.success) {
      onClose()
      window.location.reload()
    } else {
      alert(result.message)
    }
    setStartingTrial(false)
  }

  const checkEligibility = async () => {
    const eligible = await checkTrialEligibility()
    setTrialEligible(eligible)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Upgrade Required</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            You've reached your limit for <strong>{featureLabel}</strong>.
          </p>
          
          {limit !== null && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Usage</span>
                <span className="text-sm font-semibold text-gray-900">
                  {currentUsage} / {limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Limit resets {period === 'monthly' ? 'monthly' : period === 'daily' ? 'daily' : 'per session'}
              </p>
            </div>
          )}

          {message && (
            <p className="text-sm text-gray-600 mb-4">{message}</p>
          )}
        </div>

        <div className="space-y-3">
          {isAuthenticated && !user?.isPremium && !isTrialActive && (
            <>
              {trialEligible === null && (
                <button
                  onClick={checkEligibility}
                  disabled={trialLoading}
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trialLoading ? 'Checking...' : 'Check for 3-Day Free Trial'}
                </button>
              )}
              
              {trialEligible === true && (
                <button
                  onClick={handleStartTrial}
                  disabled={startingTrial}
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingTrial ? 'Starting Trial...' : 'Start 3-Day Free Trial'}
                </button>
              )}
            </>
          )}

          <Link
            href="/billing"
            className="block w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center"
          >
            {isAuthenticated ? 'Upgrade to Premium' : 'Sign Up & Upgrade'}
          </Link>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}


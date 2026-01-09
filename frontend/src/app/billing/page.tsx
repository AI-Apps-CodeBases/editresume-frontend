'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/Shared/Auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { useTrial } from '@/hooks/useTrial'
import config from '@/lib/config'
import { auth } from '@/lib/firebaseClient'

interface SubscriptionStatus {
  isPremium: boolean
  subscriptionStatus?: string | null
  subscriptionCurrentPeriodEnd?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}

interface CheckoutSessionResponse {
  url: string
}

interface Plan {
  id: string
  name: string
  price: string
  cadence: string
  headline: string
  features: string[]
  highlight?: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0',
    cadence: 'forever',
    headline: 'Great for getting started with structured resumes',
    features: [
      'Visual resume editor',
      '3 PDF/DOCX exports per month',
      '5 AI improvements per session',
      'Unlimited ATS scores (always free)',
      'Job match analytics (1 resume)',
      '1 cover letter per month'
    ]
  },
  {
    id: 'trial',
    name: 'Trial Plan',
    price: '$6.99',
    cadence: 'for 2 weeks',
    headline: 'Try all premium features for 14 days',
    features: [
      'All Premium features',
      'Unlimited everything',
      'Full access for 14 days',
      'Perfect to try everything'
    ],
    highlight: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    cadence: 'per month',
    headline: 'Unlock all resume exports, premium templates, and job tools',
    features: [
      'Unlimited PDF/DOCX exports',
      'All premium templates',
      'Unlimited AI improvements',
      'Unlimited ATS scoring',
      'Unlimited cover letters',
      'Job match analytics & insights',
      'Version history & comparisons',
      'Priority support'
    ]
  }
]

function BillingContent() {
  const { user, isAuthenticated } = useAuth()
  const { usageStats, usageLimits, refreshUsage } = useUsageTracking()
  const { trialStatus, startTrial, isTrialActive, daysRemaining, checkTrialEligibility } = useTrial()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [startingTrial, setStartingTrial] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [trialPaymentType, setTrialPaymentType] = useState<'subscription' | 'onetime'>('subscription')
  const apiBase = config.apiBase

  const isPremium = subscription?.isPremium ?? false
  const subscriptionStatus = subscription?.subscriptionStatus ?? (isPremium ? 'active' : 'inactive')
  const nextBillingDate = useMemo(() => {
    if (!subscription?.subscriptionCurrentPeriodEnd) return null
    try {
      return new Date(subscription.subscriptionCurrentPeriodEnd).toLocaleDateString()
    } catch (error) {
      return null
    }
  }, [subscription?.subscriptionCurrentPeriodEnd])

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = await currentUser.getIdToken()
      const res = await fetch(`${apiBase}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data: SubscriptionStatus = await res.json()
        setSubscription(data)
      } else {
        setSubscription(null)
      }
    } catch (error) {
      console.error('Failed to load subscription', error)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, isAuthenticated])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  useEffect(() => {
    if (isAuthenticated && !user?.isPremium && !isTrialActive) {
      checkTrialEligibility().then(setTrialEligible)
    }
  }, [isAuthenticated, user?.isPremium, isTrialActive, checkTrialEligibility])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const trialType = urlParams.get('trialType')
      if (trialType === 'onetime' || trialType === 'subscription') {
        setTrialPaymentType(trialType)
      }
    }
  }, [])

  const handleStartTrial = async () => {
    setStartingTrial(true)
    const result = await startTrial()
    if (result.success) {
      await refreshUsage()
      alert('Trial started! You now have 3 days of premium access.')
      window.location.reload()
    } else {
      alert(result.message)
    }
    setStartingTrial(false)
  }

  const handleCheckout = async (period: 'monthly' | 'annual' = 'monthly', planType: 'trial' | 'trial-onetime' | 'premium' = 'premium') => {
    if (checkoutLoading) return
    const currentUser = auth.currentUser
    if (!currentUser) {
      alert('Please sign in again to start checkout.')
      return
    }

    setCheckoutLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const returnUrl = origin ? `${origin}/billing` : undefined

      const res = await fetch(`${apiBase}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          successUrl: returnUrl,
          cancelUrl: returnUrl,
          planType: planType,
          period: period
        })
      })

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Unable to start checkout.')
      }

      const data: CheckoutSessionResponse = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('Checkout URL missing in response.')
      }
    } catch (error) {
      console.error('Checkout error', error)
      alert(error instanceof Error ? error.message : 'Failed to start checkout.')
    } finally {
      setCheckoutLoading(false)
    }
  }


  const handleManageSubscription = async () => {
    if (portalLoading) return
    const currentUser = auth.currentUser
    if (!currentUser) {
      alert('Please sign in again to manage your subscription.')
      return
    }

    if (!subscription?.stripeCustomerId) {
      alert('No Stripe subscription found. If this is unexpected, contact support@editresume.io.')
      return
    }

    setPortalLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(`${apiBase}/api/billing/create-portal-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Unable to open customer portal.')
      }

      const data: CheckoutSessionResponse = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('Customer portal URL missing in response.')
      }
    } catch (error) {
      console.error('Portal error', error)
      alert(error instanceof Error ? error.message : 'Failed to open customer portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="w-full px-[10%] py-16">
      <div className="rounded-[32px] border border-border-subtle bg-white p-10 shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="badge">SUBSCRIPTION OVERVIEW</span>
            <h1 className="mt-4 text-3xl font-semibold text-text-primary">
              {isPremium ? 'Premium unlocked — keep shipping resumes.' : 'Upgrade to unlock the full resume OS'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-text-muted">
              Manage billing, sync invoices, and stay on top of your plan with clear pricing and instant plan controls.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-text-muted sm:items-end sm:text-right">
            <span className="surface-pill">
              Status:{' '}
              <span className="font-semibold text-text-primary">{loading ? 'Checking…' : subscriptionStatus}</span>
            </span>
            {nextBillingDate && (
              <span className="surface-pill">
                Renews on <span className="font-semibold text-text-primary">{nextBillingDate}</span>
              </span>
            )}
            {isTrialActive && (
              <span className="surface-pill bg-primary-50 text-primary-700">
                Trial active — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </span>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 text-xs text-text-muted sm:text-sm">
          <span className="surface-pill">Signed in as {user?.email}</span>
          {subscription?.stripeSubscriptionId && (
            <span className="surface-pill">Subscription ID: {subscription.stripeSubscriptionId}</span>
          )}
          {subscription?.stripeCustomerId && (
            <span className="surface-pill">Customer ID: {subscription.stripeCustomerId}</span>
          )}
        </div>
        <div className="mt-8 flex flex-wrap gap-4 text-xs text-text-muted">
          <Link href="/profile?tab=billing" className="button-secondary text-xs sm:text-sm">
            Back to dashboard
          </Link>
          <Link href="/editor" className="button-primary text-xs sm:text-sm">
            Open editor
          </Link>
        </div>
      </div>

      {trialEligible && !isPremium && !isTrialActive && (
        <div className="mt-8 rounded-[28px] border-2 border-primary-200 bg-primary-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-900">Start Your 3-Day Free Trial</h3>
              <p className="mt-1 text-sm text-primary-700">
                Get full premium access for 3 days. No credit card required.
              </p>
            </div>
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingTrial ? 'Starting...' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      )}

      {usageStats && (
        <div className="mt-8 rounded-[28px] border border-border-subtle bg-white p-8 shadow-[0_18px_32px_rgba(15,23,42,0.05)]">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Usage Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageStats.exports && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Exports</span>
                  <span className="text-sm text-gray-600">
                    {usageStats.exports.current_usage} / {usageStats.exports.limit ?? '∞'}
                  </span>
                </div>
                {usageStats.exports.limit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (usageStats.exports.current_usage / usageStats.exports.limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {usageStats.features.improvement && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">AI Improvements</span>
                  <span className="text-sm text-gray-600">
                    {usageStats.features.improvement.current_usage} / {usageStats.features.improvement.limit ?? '∞'}
                  </span>
                </div>
                {usageStats.features.improvement.limit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (usageStats.features.improvement.current_usage / usageStats.features.improvement.limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {usageStats.features.ats && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">ATS Scores</span>
                  <span className="text-sm text-gray-600 font-semibold text-green-600">
                    Always Free - Unlimited
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = (plan.id === 'premium' && (isPremium || isTrialActive)) || (plan.id === 'free' && !isPremium && !isTrialActive) || (plan.id === 'trial' && isTrialActive)
          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_14px_24px_rgba(15,23,42,0.04)] ${
                plan.highlight ? 'ring-2 ring-primary-200' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute right-2.5 top-2.5 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                  Best Value
                </div>
              )}
              <h2 className="text-lg font-semibold text-text-primary">{plan.name}</h2>
              <p className="mt-1 text-xs text-text-muted">{plan.headline}</p>
              {plan.id === 'trial' && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => setTrialPaymentType('subscription')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      trialPaymentType === 'subscription'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Subscription
                  </button>
                  <button
                    onClick={() => setTrialPaymentType('onetime')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      trialPaymentType === 'onetime'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    One-Time
                  </button>
                </div>
              )}
              {plan.id === 'premium' && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      billingPeriod === 'monthly'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annual')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      billingPeriod === 'annual'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    3 Months
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-text-primary">
                  {plan.id === 'trial' && trialPaymentType === 'onetime' 
                    ? '$14.99' 
                    : plan.id === 'premium' && billingPeriod === 'annual' 
                    ? '$26.99' 
                    : plan.price}
                </span>
                <span className="text-xs text-text-muted">
                  {plan.id === 'trial' && trialPaymentType === 'onetime'
                    ? ' one-time'
                    : plan.id === 'premium' && billingPeriod === 'annual'
                    ? 'every 3 months'
                    : plan.cadence}
                </span>
                {plan.id === 'premium' && billingPeriod === 'annual' && (
                  <span className="text-[10px] text-green-600 font-medium">Save $3</span>
                )}
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                {(plan.id === 'trial' && trialPaymentType === 'onetime'
                  ? [
                      'All Premium features',
                      'Unlimited everything',
                      'Full access for 1 month',
                      'One-time payment, no recurring charges'
                    ]
                  : plan.features
                ).map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5">
                    <span className="text-primary-600 text-xs">●</span>
                    <span className="text-text-muted">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2">
                {plan.id === 'premium' ? (
                  isPremium || isTrialActive ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading || isTrialActive}
                      className="button-secondary justify-center text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {portalLoading ? 'Opening portal…' : isTrialActive ? 'Trial Active' : 'Manage subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout(billingPeriod, 'premium')}
                      disabled={checkoutLoading}
                      className="button-primary justify-center text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {checkoutLoading ? 'Starting checkout…' : `Upgrade (${billingPeriod === 'annual' ? '$26.99/3mo' : '$9.99/mo'})`}
                    </button>
                  )
                ) : plan.id === 'trial' ? (
                  <button
                    onClick={() => handleCheckout('monthly', trialPaymentType === 'onetime' ? 'trial-onetime' : 'trial')}
                    disabled={checkoutLoading}
                    className="button-primary justify-center text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {checkoutLoading ? 'Starting checkout…' : trialPaymentType === 'onetime' ? 'Buy Now ($14.99)' : 'Start Trial ($6.99)'}
                  </button>
                ) : (
                  <div className="rounded-lg border border-border-subtle bg-primary-50/60 px-3 py-2 text-xs text-text-muted">
                    Always available with every account.
                  </div>
                )}
                {isCurrent && <span className="text-[10px] uppercase tracking-wider text-primary-600">Current plan</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-12 rounded-[28px] border border-border-subtle bg-white p-8 text-text-muted shadow-[0_18px_32px_rgba(15,23,42,0.05)]">
        <h3 className="text-lg font-semibold text-text-primary">Need a hand?</h3>
        <p className="mt-2 text-sm">
          Something off with billing or invoices? Reach us at{' '}
          <a className="font-semibold text-primary-700 underline" href="mailto:support@editresume.io">
            support@editresume.io
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-body-gradient">
        <BillingContent />
      </main>
    </ProtectedRoute>
  )
}



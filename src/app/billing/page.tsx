'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/Shared/Auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { auth } from '@/lib/firebaseClient'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

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
      'Limited resume exports',
      'Basic analytics dashboard',
      'AI resume improvements (limited)'
    ]
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
      'Job match analytics & ATS insights',
      'Priority support and roadmap input'
    ],
    highlight: true
  }
]

function BillingContent() {
  const { user, isAuthenticated } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
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

  const handleCheckout = async () => {
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
          cancelUrl: returnUrl
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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-border-subtle bg-surface-500/80 p-10 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="badge">SUBSCRIPTION OVERVIEW</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              {isPremium ? 'Premium unlocked — keep shipping resumes.' : 'Upgrade to unlock the full resume OS'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-text-secondary">
              Manage billing, sync invoices, and stay on top of your plan in a dark, cinematic workspace.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-text-secondary sm:items-end sm:text-right">
            <span className="surface-pill">
              Status:{' '}
              <span className="font-semibold text-text-primary">{loading ? 'Checking…' : subscriptionStatus}</span>
            </span>
            {nextBillingDate && (
              <span className="surface-pill">
                Renews on <span className="font-semibold text-text-primary">{nextBillingDate}</span>
              </span>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 text-xs text-text-secondary sm:text-sm">
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

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = (plan.id === 'premium' && isPremium) || (plan.id === 'free' && !isPremium)
          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-[32px] border border-border-subtle bg-surface-500/75 p-8 shadow-card transition hover:border-border-strong hover:shadow-glow ${
                plan.highlight ? 'bg-gradient-to-br from-accent-gradientStart/35 via-surface-500/90 to-accent-gradientEnd/35' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute right-5 top-5 rounded-pill bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">
                  Most loved
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-sm text-text-secondary">{plan.headline}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-white">{plan.price}</span>
                <span className="text-sm text-text-muted">{plan.cadence}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-text-secondary">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-accent-teal">●</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3">
                {plan.id === 'premium' ? (
                  isPremium ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="button-secondary justify-center disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {portalLoading ? 'Opening portal…' : 'Manage subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="button-primary justify-center disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {checkoutLoading ? 'Starting checkout…' : 'Upgrade to Premium'}
                    </button>
                  )
                ) : (
                  <div className="rounded-[20px] border border-border-subtle bg-white/5 px-5 py-3 text-sm text-text-secondary">
                    Always available with every account.
                  </div>
                )}
                {isCurrent && <span className="text-xs uppercase tracking-[0.3em] text-text-secondary">Current plan</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-12 rounded-[28px] border border-border-subtle bg-surface-500/75 p-8 text-text-secondary shadow-card">
        <h3 className="text-lg font-semibold text-white">Need a hand?</h3>
        <p className="mt-2 text-sm">
          Something off with billing or invoices? Reach us at{' '}
          <a className="font-semibold text-text-primary underline" href="mailto:support@editresume.io">
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
      <>
        <Navbar />
        <main className="min-h-screen">
          <BillingContent />
        </main>
        <Footer />
      </>
    </ProtectedRoute>
  )
}



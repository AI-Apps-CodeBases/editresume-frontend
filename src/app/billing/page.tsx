'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/Shared/Auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-semibold text-white hover:text-indigo-300 transition">
            editresume.io
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/profile?tab=billing"
              className="rounded-xl border border-white/20 px-4 py-2 text-white hover:border-indigo-400 hover:text-indigo-200 transition"
            >
              Back to dashboard
            </Link>
            <Link
              href="/editor"
              className="rounded-xl bg-indigo-500/90 px-4 py-2 font-semibold text-white hover:bg-indigo-400 transition"
            >
              Open editor
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl bg-white/10 p-8 shadow-2xl shadow-indigo-900/40 backdrop-blur-lg">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">Subscription Overview</p>
              <h1 className="mt-3 text-3xl font-bold text-white">
                {isPremium ? 'You’re on Premium 🎉' : 'Upgrade to unleash every feature'}
              </h1>
              <p className="mt-2 max-w-xl text-indigo-100">
                Manage your plan, access premium tools, and keep your resume optimized for every job.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right text-sm text-indigo-100">
              <span className="rounded-full border border-indigo-300/40 px-4 py-1 font-semibold uppercase tracking-wide">
                Status: <span className="text-white">{loading ? 'Checking…' : subscriptionStatus}</span>
              </span>
              {nextBillingDate && (
                <span className="rounded-full border border-indigo-300/40 px-4 py-1">
                  Renews on <span className="font-semibold text-white">{nextBillingDate}</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-indigo-100">
            <span className="rounded-full bg-white/10 px-3 py-1">Signed in as {user?.email}</span>
            {subscription?.stripeSubscriptionId && (
              <span className="rounded-full bg-white/10 px-3 py-1">
                Subscription ID: {subscription.stripeSubscriptionId}
              </span>
            )}
            {subscription?.stripeCustomerId && (
              <span className="rounded-full bg-white/10 px-3 py-1">
                Customer ID: {subscription.stripeCustomerId}
              </span>
            )}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = (plan.id === 'premium' && isPremium) || (plan.id === 'free' && !isPremium)
            const isPremiumPlan = plan.id === 'premium'

            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-3xl border ${
                  plan.highlight
                    ? 'border-indigo-500/80 bg-gradient-to-br from-indigo-600/70 via-indigo-500/60 to-purple-600/70'
                    : 'border-white/15 bg-white/5'
                } p-8 shadow-lg transition hover:shadow-2xl`}
              >
                {plan.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Most popular
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-sm text-indigo-100">{plan.headline}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-indigo-100">{plan.cadence}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-indigo-100">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
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
                        className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {portalLoading ? 'Opening portal…' : 'Manage subscription'}
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-lg hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {checkoutLoading ? 'Starting checkout…' : 'Upgrade to Premium'}
                      </button>
                    )
                  ) : (
                    <div className="rounded-xl border border-white/20 px-4 py-3 text-sm text-indigo-100">
                      Always available with every account.
                    </div>
                  )}
                  {isCurrent && (
                    <span className="text-xs uppercase tracking-wider text-indigo-200">
                      Currently on this plan
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-indigo-100">
          <h3 className="text-xl font-semibold text-white">Have a question?</h3>
          <p className="mt-2 text-sm">
            Need help with billing, invoices, or something doesn’t look right? Reach us at{' '}
            <a className="font-semibold text-white underline" href="mailto:support@editresume.io">
              support@editresume.io
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  )
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  )
}


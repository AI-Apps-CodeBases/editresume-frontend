'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Pricing() {
  const { isAuthenticated, user } = useAuth()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [trialPaymentType, setTrialPaymentType] = useState<'subscription' | 'onetime'>('subscription')
  const isFreeUser = !user?.isPremium && !user?.trialActive

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary mb-2 tracking-wider">PRICING</h2>
          <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more. Try Premium free for 3 days.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 hover:border-primary/50 transition-all hover:-translate-y-1">
            <div className="mb-3">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Free Plan</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">$0</span>
                <span className="text-gray-600 text-sm">forever</span>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {[
                'Visual resume editor',
                'All professional templates',
                '3 PDF/DOCX exports per month',
                '5 AI improvements per session',
                'Unlimited ATS scores (always free)',
                'Job match analytics (1 resume)',
                '1 cover letter per month'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-xs">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? "/billing" : "/auth/signup"}
              className="block w-full text-center px-3 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              {isAuthenticated ? 'View Plan' : 'Get Started Free'}
            </Link>
          </div>

          {/* Trial Plan */}
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-xl border-2 border-blue-300 hover:border-blue-400 transition-all hover:-translate-y-1">
            <div className="absolute -top-2 -right-2 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
              Best Value
            </div>

            <div className="mb-3">
              <h3 className="text-xl font-bold text-white mb-1">Trial Plan</h3>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setTrialPaymentType('subscription')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    trialPaymentType === 'subscription'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Subscription
                </button>
                <button
                  onClick={() => setTrialPaymentType('onetime')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    trialPaymentType === 'onetime'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  One-Time
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {trialPaymentType === 'onetime' ? '$14.99' : '$6.99'}
                </span>
                <span className="text-blue-100 text-sm">
                  {trialPaymentType === 'onetime' ? ' one-time' : ' for 2 weeks'}
                </span>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {[
                'All Premium features',
                'Unlimited everything',
                trialPaymentType === 'onetime' ? 'Full access for 1 month' : 'Full access for 14 days',
                trialPaymentType === 'onetime' ? 'One-time payment, no recurring charges' : 'Perfect to try everything'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-50 text-xs">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? `/billing?trialType=${trialPaymentType}` : "/auth/signup"}
              className="block w-full text-center px-3 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-md"
            >
              {isAuthenticated ? 'Start Trial' : 'Get Started'}
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-4 shadow-2xl transform hover:scale-105 transition-all">
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
              Most Popular
            </div>

            <div className="mb-3">
              <h3 className="text-xl font-bold text-white mb-1">Premium</h3>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    billingPeriod === 'monthly'
                      ? 'bg-white text-primary-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    billingPeriod === 'annual'
                      ? 'bg-white text-primary-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Annual
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {billingPeriod === 'annual' ? '$79' : '$9.99'}
                </span>
                <span className="text-blue-100 text-sm">
                  {billingPeriod === 'annual' ? '/year' : '/month'}
                </span>
                {billingPeriod === 'annual' && (
                  <span className="text-yellow-300 text-xs font-medium ml-1">Save $40</span>
                )}
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {[
                'Everything in Free',
                'Unlimited PDF/DOCX exports',
                'All premium templates',
                'Unlimited AI improvements',
                'Unlimited ATS scoring',
                'Unlimited cover letters',
                'Job match analytics'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-50 text-xs">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? "/billing" : "/auth/signup"}
              className="block w-full text-center px-3 py-2 bg-white text-primary-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-md"
            >
              {isAuthenticated ? 'Upgrade' : 'Start Free Trial'}
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-12 text-sm">
          All plans include our core resume builder. Upgrade to Premium for unlimited AI features and advanced tools.
        </p>
      </div>
    </section>
  )
}

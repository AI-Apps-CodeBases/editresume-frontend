'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Pricing() {
  const { isAuthenticated, user } = useAuth()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const isFreeUser = !user?.isPremium && !user?.trialActive

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
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

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="relative bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200 hover:border-primary/50 transition-all hover:-translate-y-1">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">$0</span>
                <span className="text-gray-600">forever</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Visual resume editor',
                'All professional templates',
                '3 PDF/DOCX exports per month',
                '5 AI improvements per session',
                '10 grammar checks per day',
                '1 ATS score per day',
                '1 cover letter per month',
                'Cloud save (3 resumes)',
                'Shareable resume links',
                'Basic version history',
                'Eligible for 3-day free trial'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? "/billing" : "/auth/signup"}
              className="block w-full text-center px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              {isAuthenticated ? 'View Plan' : 'Get Started Free'}
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full shadow-lg">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    billingPeriod === 'monthly'
                      ? 'bg-white text-primary-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    billingPeriod === 'annual'
                      ? 'bg-white text-primary-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Annual
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">
                  {billingPeriod === 'annual' ? '$79' : '$9.99'}
                </span>
                <span className="text-blue-100">
                  {billingPeriod === 'annual' ? '/year' : '/month'}
                </span>
                {billingPeriod === 'annual' && (
                  <span className="text-yellow-300 text-sm font-medium ml-2">Save $40</span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Everything in Free',
                'Unlimited PDF/DOCX exports',
                'All premium templates',
                'Unlimited AI improvements',
                'Unlimited grammar checks',
                'Unlimited ATS scoring',
                'Unlimited cover letters',
                'Job match analytics & insights',
                'Full version history & comparisons',
                'Collaboration & comments',
                'Multi-resume management',
                'Priority support'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-50 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? "/billing" : "/auth/signup"}
              className="block w-full text-center px-6 py-3 bg-white text-primary-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              {isAuthenticated ? 'Upgrade to Premium' : 'Start Free Trial'}
            </Link>
            {isFreeUser && isAuthenticated && (
              <p className="text-center text-blue-100 text-xs mt-3">
                Start your 3-day free trial • No credit card required
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 mt-12 text-sm">
          All plans include our core resume builder. Upgrade to Premium for unlimited AI features and advanced tools.
        </p>
      </div>
    </section>
  )
}

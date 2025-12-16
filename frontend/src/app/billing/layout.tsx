import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing & Subscription',
  description: 'Manage your subscription and billing settings for EditResume.',
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children
}


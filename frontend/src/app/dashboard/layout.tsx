import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View analytics and manage your EditResume account.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}


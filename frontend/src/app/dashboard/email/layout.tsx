import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Email Management',
  description: 'Manage email settings and templates on EditResume.',
}

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return children
}


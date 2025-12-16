import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile Settings',
  description: 'Manage your profile, settings, and resume history on EditResume.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}


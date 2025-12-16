import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Users Management',
  description: 'Manage users and view user analytics on EditResume.',
}

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return children
}


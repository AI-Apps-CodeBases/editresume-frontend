import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shared Resume',
  description: 'View and comment on a shared resume from EditResume.',
}

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children
}


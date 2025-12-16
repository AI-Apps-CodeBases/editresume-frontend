import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browser Extension',
  description: 'Install the EditResume browser extension to save LinkedIn job descriptions and match them with your resume.',
}

export default function ExtensionLayout({ children }: { children: React.ReactNode }) {
  return children
}


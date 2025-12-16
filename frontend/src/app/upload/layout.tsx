import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upload Resume',
  description: 'Upload your existing resume or start creating a new one with EditResume.',
}

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children
}


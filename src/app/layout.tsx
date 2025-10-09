import '../styles/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'editresume.io – Structured resume editor',
  description: 'Edit your resume like code — structured, clean, and exportable to PDF or DOCX.',
  openGraph: {
    title: 'editresume.io',
    description: 'Edit your resume like code.',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}


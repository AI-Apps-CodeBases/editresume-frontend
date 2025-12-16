import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ModalProvider } from '@/contexts/ModalContext'
import Footer from '@/components/layout/Footer'
import FeedbackWidget from '@/components/Feedback/FeedbackWidget'
import ExtensionAuthHandler from '@/components/extension/ExtensionAuthHandler'
import { Analytics } from '@vercel/analytics/react'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'editresume.io – Structured resume editor',
    template: '%s | editresume.io',
  },
  description: 'Edit your resume like code — structured, clean, and exportable to PDF or DOCX.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '48x48', type: 'image/png' },
      { url: '/logo.jpg', sizes: 'any', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EditResume',
  },
  openGraph: {
    title: 'editresume.io',
    description: 'Edit your resume like code.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            <ModalProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Suspense fallback={null}>
                <ExtensionAuthHandler />
              </Suspense>
              <FeedbackWidget />
              <Analytics />
            </ModalProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}


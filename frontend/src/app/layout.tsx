import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ModalProvider } from '@/contexts/ModalContext'
import StickyNav from '@/components/home/StickyNav'
import Footer from '@/components/layout/Footer'
import FeedbackWidget from '@/components/Feedback/FeedbackWidget'
import ExtensionAuthHandler from '@/components/extension/ExtensionAuthHandler'
import MobileWebAppMeta from '@/components/Shared/MobileWebAppMeta'
import { Analytics } from '@vercel/analytics/react'
import { Inter } from 'next/font/google'

const inter = Inter({
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            <ModalProvider>
              <div className="flex min-h-screen flex-col">
                <StickyNav />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Suspense fallback={null}>
                <ExtensionAuthHandler />
              </Suspense>
              <MobileWebAppMeta />
              <FeedbackWidget />
              <Analytics />
            </ModalProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}


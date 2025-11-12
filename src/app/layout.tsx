import '../styles/globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ModalProvider } from '@/contexts/ModalContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

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
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            <ModalProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ModalProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}


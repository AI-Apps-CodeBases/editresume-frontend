import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account Access | editresume.io',
  description: 'Sign in or create an account to access editresume.io features.'
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary via-blue-600 to-purple-600 p-6 text-gray-900">
      {children}
    </div>
  )
}


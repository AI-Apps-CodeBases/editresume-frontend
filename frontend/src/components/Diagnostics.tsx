'use client'

import { useEffect, useState } from 'react'

export default function Diagnostics() {
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({})

  useEffect(() => {
    const check = async () => {
      const diag: Record<string, any> = {}

      // Check environment variables
      diag.env = {
        apiBase: process.env.NEXT_PUBLIC_API_BASE || 'NOT SET',
        logoToken: process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ? 'SET' : 'NOT SET',
        firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
        firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
      }

      // Check backend connectivity
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/docs`, {
          method: 'HEAD',
          mode: 'cors',
        })
        diag.backend = {
          accessible: response.ok,
          status: response.status,
        }
      } catch (error) {
        diag.backend = {
          accessible: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }

      // Check logo.dev API
      const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
      if (token) {
        try {
          const logoUrl = `https://img.logo.dev/google.com?token=${token}&size=48`
          const imgResponse = await fetch(logoUrl, { method: 'HEAD', mode: 'no-cors' })
          diag.logoApi = {
            tokenPresent: true,
            url: logoUrl,
          }
        } catch (error) {
          diag.logoApi = {
            tokenPresent: true,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      } else {
        diag.logoApi = { tokenPresent: false }
      }

      setDiagnostics(diag)
      console.log('🔍 Diagnostics:', diag)
    }

    check()
  }, [])

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-xs max-w-sm z-50">
      <div className="font-bold mb-2">🔍 Diagnostics</div>
      <pre className="whitespace-pre-wrap break-words text-[10px]">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  )
}

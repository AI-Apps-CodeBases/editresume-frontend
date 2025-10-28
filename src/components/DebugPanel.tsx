'use client'
import { useState, useEffect } from 'react'

export default function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    // Gather environment information
    const info = {
      apiBase: process.env.NEXT_PUBLIC_API_BASE,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      location: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: new Date().toISOString()
    }
    setDebugInfo(info)
  }, [])

  const testApiConnection = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://editresume-staging.onrender.com'
    
    try {
      // Test 1: Health check
      console.log('Testing API connection to:', apiBase)
      const healthResponse = await fetch(`${apiBase}/health`)
      const healthData = await healthResponse.json()
      
      // Test 2: CORS preflight
      const corsResponse = await fetch(`${apiBase}/api/resume/upload`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })
      
      // Test 3: Simple upload test
      const testFormData = new FormData()
      testFormData.append('file', new Blob(['test resume content'], { type: 'text/plain' }), 'test.txt')
      
      const uploadResponse = await fetch(`${apiBase}/api/resume/upload`, {
        method: 'POST',
        body: testFormData
      })
      
      const uploadData = await uploadResponse.text()
      
      setTestResults({
        health: {
          status: healthResponse.status,
          data: healthData
        },
        cors: {
          status: corsResponse.status,
          headers: Object.fromEntries(corsResponse.headers.entries())
        },
        upload: {
          status: uploadResponse.status,
          data: uploadData.substring(0, 500) // Limit response size
        }
      })
      
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-lg mb-2">🐛 Debug Panel</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Environment Info:</h4>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      
      <button
        onClick={testApiConnection}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2"
      >
        Test API Connection
      </button>
      
      {Object.keys(testResults).length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Test Results:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

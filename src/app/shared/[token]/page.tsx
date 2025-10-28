'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PreviewPanel from '@/components/editor/PreviewPanel'
import { sharedResumeService, SharedResumeData } from '@/lib/services/sharedResume'

export default function SharedResumePage() {
  const params = useParams()
  const shareToken = params.token as string
  
  const [resumeData, setResumeData] = useState<any>(null)
  const [sharedInfo, setSharedInfo] = useState<SharedResumeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    if (shareToken) {
      loadSharedResume()
    }
  }, [shareToken])

  const loadSharedResume = async (providedPassword?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await sharedResumeService.getSharedResume(shareToken, providedPassword)
      setSharedInfo(result)
      
      // Convert resume data to the format expected by PreviewPanel
      const formattedData = {
        name: result.resume_data.personalInfo?.name || result.resume.name,
        title: result.resume.title,
        email: result.resume_data.personalInfo?.email || '',
        phone: result.resume_data.personalInfo?.phone || '',
        location: result.resume_data.personalInfo?.location || '',
        summary: result.resume_data.summary || '',
        sections: result.resume_data.sections || []
      }
      
      setResumeData(formattedData)
      
      // Track the view
      try {
        await sharedResumeService.trackView(shareToken)
      } catch (err) {
        console.log('Failed to track view:', err)
      }
      
    } catch (err: any) {
      if (err.message.includes('401')) {
        setShowPasswordForm(true)
        setError('This resume is password protected')
      } else if (err.message.includes('410')) {
        setError('This shared resume has expired')
      } else if (err.message.includes('404')) {
        setError('Shared resume not found')
      } else {
        setError('Failed to load resume')
      }
      console.error('Failed to load shared resume:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadSharedResume(password)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resume...</p>
        </div>
      </div>
    )
  }

  if (error && !showPasswordForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="text-center mb-6">
              <svg className="w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">Password Required</h2>
              <p className="text-gray-600 mt-2">This resume is password protected</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Access Resume
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!resumeData || !sharedInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No resume data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {sharedInfo.resume.name}
              </h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                Shared Resume
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Shared on {new Date(sharedInfo.shared_info.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* Resume Preview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resume Preview</h2>
              <div className="text-sm text-gray-600">
                Template: {sharedInfo.resume.template}
              </div>
            </div>
          </div>
          <div className="p-6">
            <PreviewPanel
              data={resumeData}
              template={(sharedInfo.resume.template || 'tech') as 'tech' | 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern'}
              replacements={{}}
              key="shared-resume-preview"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>This resume was shared using EditResume.io</p>
            <p className="mt-1">
              {sharedInfo.shared_info.expires_at && (
                <>Expires on {new Date(sharedInfo.shared_info.expires_at).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}


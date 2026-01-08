'use client'
import { useState } from 'react'
import { sharedResumeService, SharedResumeInfo } from '@/lib/services/sharedResume'

interface ShareResumeModalProps {
  isOpen: boolean
  onClose: () => void
  resumeId: number
  resumeName: string
  resumeData?: any // Add resume data to save before sharing
  variant?: 'modal' | 'panel'
}

export default function ShareResumeModal({
  isOpen,
  onClose,
  resumeId,
  resumeName,
  resumeData,
  variant = 'modal',
}: ShareResumeModalProps) {
  const [password, setPassword] = useState('')
  const [expiresDays, setExpiresDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [sharedInfo, setSharedInfo] = useState<SharedResumeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateShare = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (!currentUser.email) {
        setError('Please log in first to share your resume.')
        return
      }
      
      let actualResumeId = resumeId && resumeId > 0 ? resumeId : null
      
      if (!actualResumeId && resumeData) {
        try {
          const { versionControlService } = await import('@/lib/services/versionControl')
          const saveResult = await versionControlService.saveResume(resumeData)
          actualResumeId = saveResult.resume_id
          console.log('Resume saved with ID:', actualResumeId)
        } catch (saveError: any) {
          // Properly extract error message from various error formats
          let saveErrorMessage = 'Unknown error'
          if (saveError?.message) {
            saveErrorMessage = saveError.message
          } else if (Array.isArray(saveError)) {
            // Handle array of errors
            saveErrorMessage = saveError.map((err: any) => 
              typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
            ).join(', ')
          } else if (typeof saveError === 'string') {
            saveErrorMessage = saveError
          } else if (saveError?.detail) {
            saveErrorMessage = saveError.detail
          } else if (saveError?.error) {
            saveErrorMessage = saveError.error
          } else {
            try {
              saveErrorMessage = JSON.stringify(saveError)
            } catch {
              saveErrorMessage = String(saveError)
            }
          }
          setError(`Failed to save resume: ${saveErrorMessage}. Please try saving the resume first using the Save button.`)
          return
        }
      }
      
      if (!actualResumeId || actualResumeId === 0) {
        setError('Resume ID is required. Please save the resume first using the Save button, then try sharing again.')
        return
      }
      
      const result = await sharedResumeService.createSharedResume(
        actualResumeId,
        password || undefined,
        expiresDays || undefined
      )
      setSharedInfo(result)
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      setError(`Failed to create shared link: ${errorMessage}`)
      console.error('Failed to create shared link:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (sharedInfo?.share_url) {
      try {
        await navigator.clipboard.writeText(sharedInfo.share_url)
        // Could show a toast notification here
        console.log('Link copied to clipboard')
      } catch (err) {
        console.error('Failed to copy link:', err)
      }
    }
  }

  const handleClose = () => {
    setPassword('')
    setExpiresDays(null)
    setSharedInfo(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const modalBody = (
    <>
      {!sharedInfo ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Protection (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for public access"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration (Optional)
            </label>
            <select
              value={expiresDays || ''}
              onChange={(e) => setExpiresDays(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Never expires</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreateShare}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Share Link'}
            </button>
            {variant === 'modal' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">Share link created successfully!</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Share Link
            </label>
            <div className="flex">
              <input
                type="text"
                value={sharedInfo.share_url}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Password Protected:</span>
              <span className={sharedInfo.password_protected ? 'text-red-600' : 'text-green-600'}>
                {sharedInfo.password_protected ? 'Yes' : 'No'}
              </span>
            </div>
            {sharedInfo.expires_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expires:</span>
                <span className="text-gray-900">
                  {new Date(sharedInfo.expires_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">How to share:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Copy the link above and send it to anyone</li>
              <li>• They can view your resume without logging in</li>
              <li>• You can track views in the analytics dashboard</li>
              <li>• Deactivate the link anytime to stop sharing</li>
            </ul>
          </div>

          <div className="flex gap-3">
            {variant === 'modal' && (
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Done
              </button>
            )}
            <button
              onClick={() => {
                setSharedInfo(null)
                setPassword('')
                setExpiresDays(null)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </>
  )

  if (variant === 'panel') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Share Resume</h2>
            <span className="text-xs text-gray-500">"{resumeName}"</span>
          </div>
        </div>
        <div className="p-4">{modalBody}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Share Resume</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Share "{resumeName}" with others</p>
        </div>

        <div className="p-4">{modalBody}</div>
      </div>
    </div>
  )
}

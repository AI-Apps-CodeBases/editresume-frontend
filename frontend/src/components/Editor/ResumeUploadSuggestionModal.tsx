'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ResumeUploadSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: () => void
}

export default function ResumeUploadSuggestionModal({
  isOpen,
  onClose,
  onUpload
}: ResumeUploadSuggestionModalProps) {
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleUpload = () => {
    if (onUpload) {
      onUpload()
    } else {
      router.push('/upload')
    }
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl max-w-md w-full p-4 sm:p-6 lg:p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-4 sm:mb-6">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📄</div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Upload Your Resume
          </h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 lg:p-5 mb-4 sm:mb-6">
          <div className="text-left leading-relaxed text-gray-700 text-sm sm:text-base">
            <p className="mb-3">
              To get started with the editor, you'll need to upload your resume. You can:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Upload a PDF or DOCX file</li>
              <li>Paste your resume text</li>
              <li>Create a new resume from scratch</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpload}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold tracking-wide text-white outline-none transition-all duration-200 bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Resume
          </button>
          <button
            onClick={onClose}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold tracking-wide outline-none transition-all duration-200 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

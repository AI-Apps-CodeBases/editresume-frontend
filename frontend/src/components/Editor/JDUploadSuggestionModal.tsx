'use client'
import { useEffect, useState } from 'react'

interface JDUploadSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenMatchJD?: () => void
}

export default function JDUploadSuggestionModal({
  isOpen,
  onClose,
  onOpenMatchJD
}: JDUploadSuggestionModalProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

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

  const handleOpenMatchJD = () => {
    if (onOpenMatchJD) {
      onOpenMatchJD()
    }
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl max-w-lg w-full p-4 sm:p-6 lg:p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
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
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎯</div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Match Your Resume to Job Descriptions
          </h2>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 sm:p-4 lg:p-5 mb-4 sm:mb-6">
          <div className="text-left leading-relaxed text-gray-700 text-sm sm:text-base">
            <p className="mb-3 sm:mb-4 font-semibold text-gray-900">
              Use the Match JD section to optimize your resume for specific job postings:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Open Match JD Section</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {isMobile ? (
                      <>Tap the <strong>"Match"</strong> button in the bottom navigation or menu to open the job description matching section.</>
                    ) : (
                      <>Click the <strong>"Match JD"</strong> button in the right panel to open the job description matching section.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Upload or Select Job Description</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    In the Match JD section, you can paste a job description, use the Chrome extension to save from LinkedIn, or select from previously saved jobs using the dropdown.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Analyze & Improve</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Click <strong>"Analyze Match"</strong> to see your ATS score and get keyword suggestions to improve your resume.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-purple-200">
              <p className="text-xs text-gray-500">
                💡 Tip: {isMobile ? (
                  <>Look for the <strong>"Match"</strong> button in the bottom navigation bar.</>
                ) : (
                  <>Look for the <strong>"Match JD"</strong> tab button in the right panel of the editor.</>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleOpenMatchJD}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold tracking-wide text-white outline-none transition-all duration-200 bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isMobile ? 'Open Match Section' : 'Open Match JD Section'}
          </button>
          <button
            onClick={onClose}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold tracking-wide outline-none transition-all duration-200 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

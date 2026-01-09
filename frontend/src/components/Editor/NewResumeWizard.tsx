'use client'
import { useState } from 'react'
import UploadResume from './UploadResume'
import PasteResume from './PasteResume'

interface Props {
  onComplete: (data: any, template: string, layoutConfig?: any) => void
  onCancel: () => void
}

export default function NewResumeWizard({ onComplete, onCancel }: Props) {
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste' | 'scratch' | null>(null)
  const [resumeData, setResumeData] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const handleMethodSelect = (method: 'upload' | 'paste' | 'scratch') => {
    setInputMethod(method)
    setCurrentStep(2)
  }

  const handleResumeData = (data: any) => {
    setResumeData(data)
    setCurrentStep(3)
    // Go directly to editor with default template
    onComplete(data, 'classic', {})
  }

  const handleStartFromScratch = () => {
    setCurrentStep(3)
    // Create empty resume data and go directly to editor
    const emptyResumeData = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: ''
      },
      sections: [
        {
          id: '1',
          title: 'Professional Summary',
          bullets: [{ id: '1', text: '', params: {} }]
        },
        {
          id: '2', 
          title: 'Experience',
          bullets: [{ id: '2', text: '', params: {} }]
        },
        {
          id: '3',
          title: 'Skills', 
          bullets: [{ id: '3', text: '', params: {} }]
        }
      ]
    }
    onComplete(emptyResumeData, 'classic', {})
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      if (currentStep === 2) {
        setInputMethod(null)
      }
    }
  }

  if (inputMethod === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i + 1 <= currentStep 
                        ? 'bg-white text-blue-600' 
                        : 'bg-white/20 text-white/60'
                    }`}>
                      {i + 1}
                    </div>
                    {i < totalSteps - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        i + 1 < currentStep ? 'bg-white' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm">
                Step {currentStep} of {totalSteps}: Upload/Paste Content
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-xl font-bold text-white">Upload Your Resume</h2>
              <div></div>
            </div>
            <UploadResume onUploadSuccess={handleResumeData} />
          </div>
        </div>
      </div>
    )
  }

  if (inputMethod === 'paste') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i + 1 <= currentStep 
                        ? 'bg-white text-blue-600' 
                        : 'bg-white/20 text-white/60'
                    }`}>
                      {i + 1}
                    </div>
                    {i < totalSteps - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        i + 1 < currentStep ? 'bg-white' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm">
                Step {currentStep} of {totalSteps}: Upload/Paste Content
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-xl font-bold text-white">Paste Your Resume Text</h2>
              <div></div>
            </div>
            <PasteResume onPasteSuccess={handleResumeData} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i + 1 <= currentStep 
                      ? 'bg-white text-blue-600' 
                      : 'bg-white/20 text-white/60'
                  }`}>
                    {i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      i + 1 < currentStep ? 'bg-white' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/80 text-sm">
              Step {currentStep} of {totalSteps}: {
                currentStep === 1 ? 'Choose Input Method' :
                currentStep === 2 ? 'Upload/Paste Content' :
                'Complete Setup'
              }
            </p>
          </div>
        </div>

        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Create Your Resume</h1>
          <p className="text-lg md:text-xl text-blue-100">Choose how you'd like to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <button
            onClick={() => handleMethodSelect('upload')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-6 md:p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl mobile-button"
          >
            <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Upload Existing</h3>
            <p className="text-purple-100 mb-4 text-sm md:text-base">Upload your current resume to edit</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>PDF, DOC, DOCX</span>
            </div>
          </button>

          <button
            onClick={() => handleMethodSelect('paste')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-6 md:p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl mobile-button"
          >
            <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Paste Text</h3>
            <p className="text-purple-100 mb-4 text-sm md:text-base">Copy and paste your resume text</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>Quick import</span>
            </div>
          </button>

          <button
            onClick={handleStartFromScratch}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-6 md:p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl mobile-button"
          >
            <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform">✨</div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Start Fresh</h3>
            <p className="text-purple-100 mb-4 text-sm md:text-base">Create a new resume from scratch</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>Blank canvas</span>
            </div>
          </button>
        </div>

        <div className="text-center mt-8 md:mt-12">
          <button
            onClick={onCancel}
            className="px-6 md:px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm mobile-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
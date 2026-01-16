'use client'

import Image from 'next/image'
import { useState } from 'react'
import Tooltip from '@/components/Shared/Tooltip'

const steps = [
  {
    step: 1,
    title: 'Upload or Create Resume',
    description: 'Upload your existing resume or create a new one from scratch using the "Upload Resume" button in the top right corner of the editor.',
    mediaType: 'video' as const,
    mediaUrl: '/videos/onboarding/editor-step1-upload.mp4',
  },
  {
    step: 2,
    title: 'Match Job Description',
    description: 'Go to the right panel "Match JD" section. Upload a job description from LinkedIn using the extension or use a previously saved JD. Then click "Analyze Match" to see your ATS score.',
    mediaType: 'video' as const,
    mediaUrl: '/videos/onboarding/editor-step2-match-jd.mp4',
    extensionLink: 'https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp',
  },
  {
    step: 3,
    title: 'Add Keywords to Increase ATS Score',
    description: 'Start adding keywords from the job description to your resume to increase your ATS score. Aim for a score around 80 to maximize your chances.',
    mediaType: 'video' as const,
    mediaUrl: '/videos/onboarding/editor-step3-add-keywords.mp4',
  },
  {
    step: 4,
    title: 'Save Resume and Job Description',
    description: 'Once you\'ve optimized your resume, save both the resume and the job description to the jobs page for future reference.',
    mediaType: 'image' as const,
    mediaUrl: '/images/onboarding/editor-step4-save.png',
  },
  {
    step: 5,
    title: 'Export Your Resume',
    description: 'Export your tailored resume as a PDF or DOCX file to use in your job applications.',
    mediaType: 'video' as const,
    mediaUrl: '/videos/onboarding/editor-step5-export.mp4',
  },
  {
    step: 6,
    title: 'Create Cover Letter (Optional)',
    description: 'You can also create a cover letter from the jobs page based on the company and job description.',
    mediaType: 'video' as const,
    mediaUrl: '/videos/onboarding/editor-step6-cover-letter.mp4',
  },
]

interface OnboardingSlideshowProps {
  onComplete?: () => void
  onSkip?: () => void
  onDisable?: () => void
}

export default function OnboardingSlideshow({ onComplete, onSkip, onDisable }: OnboardingSlideshowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else if (onComplete) {
      onComplete()
    }
  }

  const handleSkip = () => {
    if (dontShowAgain && onDisable) {
      onDisable()
    }
    if (onSkip) {
      onSkip()
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length)
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {(onSkip || onComplete) && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
            {onSkip && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-800 select-none">
                    Don't show again
                  </span>
                </label>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Skip"
                >
                  Skip
                </button>
              </div>
            )}
            <button
              onClick={onSkip || onComplete}
              className="w-10 h-10 rounded-full bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 pt-8 pb-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 border border-primary-200/50 mb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Onboarding</span>
              </div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-primary-700 to-purple-700">
                How to Use the Editor
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/50 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                <div className="flex-1 space-y-6 order-2 lg:order-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-xl shadow-lg">
                      {currentStepData.step}
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold text-slate-900">{currentStepData.title}</h3>
                  </div>
                  <p className="text-base lg:text-lg text-slate-600 leading-relaxed">{currentStepData.description}</p>
                  {currentStepData.extensionLink && (
                    <a
                      href={currentStepData.extensionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Install Chrome Extension
                    </a>
                  )}
                </div>
                
                <div className="flex-1 relative order-1 lg:order-2 w-full">
                  <div className="relative rounded-xl shadow-xl overflow-hidden bg-white">
                    {currentStepData.mediaType === 'image' ? (
                      <Image
                        src={currentStepData.mediaUrl}
                        alt={`Step ${currentStepData.step}: ${currentStepData.title}`}
                        width={1200}
                        height={800}
                        className="w-full h-auto"
                        priority
                        quality={95}
                      />
                    ) : (
                      <video
                        src={currentStepData.mediaUrl}
                        controls
                        preload="metadata"
                        className="w-full h-auto"
                        aria-label={`Step ${currentStepData.step}: ${currentStepData.title}`}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Tooltip 
                  text={currentStep === 0 ? "You're on the first step" : `Go back to step ${currentStep}: ${steps[currentStep - 1].title}`}
                  position="top"
                  color="gray"
                >
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                </Tooltip>

                <div className="flex items-center gap-2">
                  {steps.map((step, index) => (
                    <Tooltip
                      key={index}
                      text={`Go to step ${index + 1}: ${step.title}`}
                      position="top"
                      color="gray"
                    >
                      <button
                        onClick={() => goToStep(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentStep
                            ? 'bg-gradient-to-r from-primary-600 to-purple-600 w-8'
                            : 'bg-slate-300 hover:bg-slate-400 w-2'
                        }`}
                        aria-label={`Go to step ${index + 1}`}
                      />
                    </Tooltip>
                  ))}
                </div>

                <Tooltip
                  text={currentStep === steps.length - 1 ? "Finish onboarding" : `Continue to step ${currentStep + 2}: ${steps[currentStep + 1].title}`}
                  position="top"
                  color="gray"
                >
                  <button
                    onClick={() => {
                      if (currentStep === steps.length - 1) {
                        if (onComplete) {
                          onComplete()
                        }
                      } else {
                        nextStep()
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                    {currentStep < steps.length - 1 && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

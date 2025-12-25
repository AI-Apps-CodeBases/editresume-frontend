'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import Tooltip from '@/components/Shared/Tooltip'

const steps = [
  {
    step: 1,
    title: 'Install and Access Extension',
    description: 'This is the view you\'ll see after installing the extension on your LinkedIn jobs page. Pin the extension to your browser toolbar and click the extension icon to see the right panel. If you don\'t see the job details in the panel, refresh the LinkedIn page.',
    image: '/images/onboarding/step1-dashboard.png',
  },
  {
    step: 2,
    title: 'Save Job from LinkedIn',
    description: 'Click the job and save it to editresume.io/jobs page. If you don\'t see the job details in the extension, refresh the LinkedIn page.',
    image: '/images/onboarding/step2-linkedin.png',
  },
  {
    step: 3,
    title: 'View Saved Jobs',
    description: 'After saving the job, navigate to the editresume.io/jobs page and you\'ll see the saved job from the extension.',
    image: '/images/onboarding/step3-jobs.png',
  },
  {
    step: 4,
    title: 'Select Your Resume',
    description: 'Go to the Resume section and upload your existing resume or use one of your saved resumes in the app.',
    image: '/images/onboarding/step4-jobs.png',
  },
  {
    step: 5,
    title: 'Tailor Resume with AI',
    description: 'Start tailoring your resume with AI features (prompts use the missing keywords from the job description) to increase your ATS score.',
    image: '/images/onboarding/step5-editor.png',
  },
  {
    step: 6,
    title: 'Preview Your Resume',
    description: 'You can see a preview of your resume layout from the preview section on the right side panel.',
    image: '/images/onboarding/step6-editor.png',
  },
  {
    step: 7,
    title: 'Customize Template',
    description: 'You can customize your resume template. Change templates and customize the content.',
    image: '/images/onboarding/step7-templates.png',
  },
  {
    step: 8,
    title: 'Export and Save',
    description: 'Once you\'re done with your edits and increase the ATS score to 80-85, export as PDF and save the tailored resume in the app with the job description.',
    image: '/images/onboarding/step8-export.png',
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length)
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-primary-200/20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative mx-auto flex w-full max-w-[1536px] 2xl:max-w-[1920px] flex-col gap-16 px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 border border-primary-200/50">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-700">Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-3xl lg:text-4xl 2xl:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-primary-700 to-purple-700 leading-tight">
            How to Tailor Your Resume Based on the Jobs
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Follow these steps to tailor your resume to any job posting using our powerful AI-powered feature.
          </p>
        </div>

        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl p-8 lg:p-16 2xl:p-20">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 2xl:gap-20">
            <div className="flex-1 space-y-8 order-2 lg:order-1">
              <div className="flex items-center gap-6">
                <div className="flex items-center justify-center w-16 h-16 2xl:w-20 2xl:h-20 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-2xl 2xl:text-3xl shadow-lg">
                  {currentStepData.step}
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-2xl 2xl:text-3xl font-bold text-slate-900">{currentStepData.title}</h2>
              </div>
              <p className="text-sm sm:text-base lg:text-lg 2xl:text-xl text-slate-600 leading-relaxed">{currentStepData.description}</p>
            </div>
            
            <div className="flex-1 relative order-1 lg:order-2 w-full">
              <div className="relative rounded-xl shadow-2xl overflow-hidden bg-white">
                <Image
                  src={currentStepData.image}
                  alt={`Step ${currentStepData.step}: ${currentStepData.title}`}
                  width={2400}
                  height={1600}
                  className="w-full h-auto"
                  priority
                  quality={95}
                  unoptimized={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between">
            <Tooltip 
              text={currentStep === 0 ? "You're on the first step" : `Go back to step ${currentStep}: ${steps[currentStep - 1].title}`}
              position="top"
              color="gray"
            >
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-3 px-8 py-4 2xl:px-10 2xl:py-5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-lg 2xl:text-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <svg className="w-6 h-6 2xl:w-7 2xl:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
            </Tooltip>

            <div className="flex items-center gap-3">
              {steps.map((step, index) => (
                <Tooltip
                  key={index}
                  text={`Go to step ${index + 1}: ${step.title}`}
                  position="top"
                  color="gray"
                >
                  <button
                    onClick={() => goToStep(index)}
                    className={`w-4 h-4 2xl:w-5 2xl:h-5 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-gradient-to-r from-primary-600 to-purple-600 w-10 2xl:w-12'
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                </Tooltip>
              ))}
            </div>

            <Tooltip
              text={currentStep === steps.length - 1 ? "You're on the last step" : `Continue to step ${currentStep + 2}: ${steps[currentStep + 1].title}`}
              position="top"
              color="gray"
            >
              <button
                onClick={nextStep}
                disabled={currentStep === steps.length - 1}
                className="flex items-center gap-3 px-8 py-4 2xl:px-10 2xl:py-5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold text-lg 2xl:text-xl hover:from-primary-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Next
                <svg className="w-6 h-6 2xl:w-7 2xl:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="sticky bottom-8 z-10 mt-12">
          <div className="flex justify-center">
            <Tooltip 
              text="Upload your existing resume or create a new one to start tailoring your resume to job postings with AI-powered features"
              position="top"
              color="gray"
            >
              <Link
                href="/upload"
                className="px-10 py-5 2xl:px-12 2xl:py-6 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold text-xl 2xl:text-2xl hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Try it Out
              </Link>
            </Tooltip>
          </div>
        </div>
      </main>
    </div>
  )
}


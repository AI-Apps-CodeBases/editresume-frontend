'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useResumeAccess } from '@/hooks/useResumeAccess'
import FloatingUIPreview from './FloatingUIPreview'
import AuthModal from '@/components/Shared/Auth/AuthModal'

export default function HeroSection() {
  const { launchEditor, promptLogin, authModalProps, authModalKey } = useResumeAccess()

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[90vh] flex items-center pt-16 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-primary-100/50 blur-[140px]" />
          <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-purple-100/50 blur-[160px]" />
        </div>

        <div className="container-padding mx-auto max-w-7xl relative z-10">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="badge-gradient inline-block mb-6"
              >
                AI RESUME BUILDER
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl sm:text-6xl lg:text-[72px] font-bold leading-[1.1] text-text-primary mb-6"
              >
                <span className="bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Build resumes
                </span>
                <br />
                that get you hired
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-xl sm:text-2xl text-text-muted leading-relaxed max-w-2xl mb-10"
              >
                The modern resume builder with AI-powered insights, ATS optimization, and
                recruiter-approved templates.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-row items-center gap-4 mb-4"
              >
                <button
                  onClick={() => launchEditor('new')}
                  className="relative group inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-xl font-semibold text-lg shadow-[0_8px_30px_rgba(15,98,254,0.4)] hover:shadow-[0_12px_40px_rgba(15,98,254,0.5)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  <span className="relative z-10">Get Started for Free</span>
                  <svg
                    className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                </button>

                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-border-subtle text-text-primary rounded-xl font-semibold text-lg hover:border-border-strong hover:bg-slate-50 transition-all duration-200"
                >
                  Import Resume
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="mb-6"
              >
                <Link
                  href="https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp?utm_source=ext_app_menu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-border-subtle text-text-primary rounded-xl font-semibold text-lg hover:border-border-strong hover:bg-slate-50 transition-all duration-200"
                >
                  Install Job Saver Extension
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-sm text-text-muted mb-8"
              >
                Joined by <span className="font-semibold text-text-primary">50,000+</span> job
                seekers. No credit card required.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap gap-4 text-sm text-text-muted"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Works on desktop and mobile
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export as PDF or DOCX
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative z-10 hidden lg:block"
            >
              <FloatingUIPreview />
            </motion.div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <AuthModal key={authModalKey} {...authModalProps} />
      </Suspense>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

const bulletPoints = [
  'Managed a team',
  'Led a team of 10+ increasing efficiency by 40%',
]

export default function BentoFeatureGrid() {
  const [currentBullet, setCurrentBullet] = useState(0)
  const [atsScore, setAtsScore] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBullet((prev) => (prev + 1) % bulletPoints.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setAtsScore((prev) => {
        if (prev >= 92) return 92
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="features" className="section-spacing bg-slate-50">
      <div className="w-full px-4 sm:px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge">THE MAGIC</span>
            <h2 className="mt-6 text-4xl sm:text-5xl font-semibold text-text-primary">
              Powerful features that work together
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-text-muted">
              Everything you need to create a resume that stands out
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 rounded-3xl border border-border-subtle bg-white p-8 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary">AI Bullet Generation</h3>
                <p className="text-sm text-text-muted">Transform your experience into impact</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-border-subtle">
              <div className="text-sm text-text-muted mb-2">Before:</div>
              <div className="text-base text-text-secondary line-through opacity-50 mb-4">
                Managed a team
              </div>
              <div className="text-sm text-text-muted mb-2">After:</div>
              <motion.div
                key={currentBullet}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-base font-semibold text-text-primary"
              >
                {bulletPoints[currentBullet]}
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-3xl border border-border-subtle bg-white p-8 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary">ATS Score Scanner</h3>
                <p className="text-sm text-text-muted">Real-time optimization</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-border-subtle flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-5xl font-bold text-green-600 mb-2"
              >
                {atsScore}+
              </motion.div>
              <div className="text-sm text-text-muted">ATS Score</div>
              <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${atsScore}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-green-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 rounded-3xl border border-border-subtle bg-gradient-to-br from-primary-50 to-purple-50 p-8 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Image
                      src="/extension-icon.png"
                      alt="Chrome Extension"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">Job Saver Extension</h3>
                    <p className="text-sm text-text-muted">Save LinkedIn jobs instantly</p>
                  </div>
                </div>
                <p className="text-text-secondary mb-6">
                  Install our Chrome extension to save LinkedIn job postings directly to your
                  editresume.io dashboard. One-click installation, seamless integration.
                </p>
                <Link
                  href="https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp?utm_source=ext_app_menu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 button-primary"
                >
                  <span>Install Extension</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </Link>
              </div>
              <div className="relative">
                <div className="bg-white rounded-xl p-6 border border-border-subtle shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                      <span className="text-sm">💼</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-slate-100 rounded" />
                    <div className="h-2 bg-slate-100 rounded w-5/6" />
                    <div className="h-2 bg-slate-100 rounded w-4/6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}


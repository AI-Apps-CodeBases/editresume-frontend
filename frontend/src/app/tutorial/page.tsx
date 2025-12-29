'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import BackButton from '@/components/Shared/BackButton'

export default function TutorialPage() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-primary-200/20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-200/20 via-purple-200/20 to-blue-200/20 rounded-3xl blur-xl"></div>
          <div className="relative rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-8 lg:p-12 shadow-xl">
            <div className="text-center space-y-6 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 border border-primary-200/50">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Tutorial</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-primary-700 to-purple-700 leading-tight">
                Learn how to use EditResume
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
                Watch these videos to get started with creating and editing your resume using our powerful editor.
              </p>
            </div>

            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Getting Started</h2>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl aspect-video w-full">
                    {isMounted ? (
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/qcGBFI1PEHo?rel=0&modestbranding=1"
                        title="EditResume Tutorial"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p>Loading video player...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Installing the Extension</h2>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl aspect-video w-full">
                    {isMounted ? (
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/hkPa-JS-7hc?rel=0&modestbranding=1"
                        title="Install EditResume Extension"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p>Loading video player...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/editor?new=true"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Start Creating Your Resume
              </Link>
              <Link
                href="/upload"
                className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
              >
                Upload Existing Resume
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: '📝',
              title: 'Create from scratch',
              description: 'Start with a blank template and build your resume step by step with AI assistance.',
              href: '/editor?new=true',
            },
            {
              icon: '📤',
              title: 'Upload your resume',
              description: 'Import your existing resume and we\'ll parse it into our editor for easy editing.',
              href: '/upload',
            },
            {
              icon: '🎨',
              title: 'Choose templates',
              description: 'Select from ATS-friendly templates designed with recruiters in mind.',
              href: '/editor?view=templates',
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}


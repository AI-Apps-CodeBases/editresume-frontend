'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Video {
  id: string
  title: string
  description: string
  youtubeId: string
  duration?: string
}

const videos: Video[] = [
  {
    id: 'getting-started',
    title: 'How to Tailor Your Resume',
    description: 'Learn how to use EditResume to create and tailor your resume for job applications',
    youtubeId: 'qcGBFI1PEHo',
    duration: '5:30'
  }
]

export default function VideoTutorialSection() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  return (
    <section className="pt-8 sm:pt-12 lg:pt-16 pb-20 sm:pb-24 lg:pb-28 bg-white">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <span className="badge-gradient">VIDEO TUTORIALS</span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Learn how to tailor your resume
          </h2>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            Watch quick tutorials to master EditResume and create job-ready resumes
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <Link
            href="/tutorial"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span>📚</span>
            <span>More Tutorial Videos</span>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-card hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-slate-900">
                {activeVideo === video.id ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <div
                      className="absolute inset-0 cursor-pointer flex items-center justify-center bg-cover bg-center"
                      style={{
                        backgroundImage: `url(https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg)`
                      }}
                      onClick={() => setActiveVideo(video.id)}
                    >
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                      <div className="relative z-10">
                        <div className="w-24 h-24 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          <svg className="w-14 h-14 text-primary-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-text-primary mb-2">{video.title}</h3>
                <p className="text-sm text-text-muted">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


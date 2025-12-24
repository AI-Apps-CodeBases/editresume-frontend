'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import { getAuthHeadersAsync } from '@/lib/auth'
import UploadResume from '@/components/Editor/UploadResume'
import { deduplicateSections } from '@/utils/sectionDeduplication'
import { FileUp, FolderOpen, ArrowLeft } from 'lucide-react'

export default function TailorSelectResumePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40 flex items-center justify-center">
          <div className="text-sm text-slate-600">Loading…</div>
        </div>
      }
    >
      <TailorSelectResumePageContent />
    </Suspense>
  )
}

interface Resume {
  id: number
  name: string
  title?: string
  template?: string
  created_at?: string
  updated_at?: string
}

function TailorSelectResumePageContent() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<'upload' | 'saved'>('saved')
  const [savedResumes, setSavedResumes] = useState<Resume[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false)

  const fetchSavedResumes = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setLoadingResumes(false)
      return
    }
    setLoadingResumes(true)
    try {
      let headers: HeadersInit = { 'Content-Type': 'application/json' }
      try {
        const authHeaders = await getAuthHeadersAsync()
        headers = { ...headers, ...authHeaders }
      } catch (authError) {
        console.warn('Auth headers not available:', authError)
      }

      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`, { 
        headers,
        signal: AbortSignal.timeout(15000)
      })
      if (res.ok) {
        const data = await res.json()
        setSavedResumes(data.resumes || [])
      }
    } catch (e) {
      console.error('Failed to load resumes:', e)
    } finally {
      setLoadingResumes(false)
    }
  }, [isAuthenticated, user?.email])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchSavedResumes()
    }
  }, [isAuthenticated, user?.email, fetchSavedResumes])

  const handleUploadSuccess = useCallback(
    (data: any) => {
      const sections = Array.isArray(data?.sections) ? data.sections : []
      const deduplicatedSections = deduplicateSections(sections)
      
      const normalizedResume = {
        name: data?.name || '',
        title: data?.title || '',
        email: data?.email || '',
        phone: data?.phone || '',
        location: data?.location || '',
        summary: data?.summary || '',
        sections: deduplicatedSections,
      }

      const template = data?.template || 'tech'
      const uploadToken = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`uploadedResume:${uploadToken}`, JSON.stringify({ resume: normalizedResume, template }))
      }

      router.push(`/tailor-suggestions?resumeUpload=1&uploadToken=${uploadToken}`)
    },
    [router]
  )

  const handleSelectResume = useCallback(
    (resumeId: number) => {
      router.push(`/tailor-suggestions?resumeId=${resumeId}`)
    },
    [router]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-primary-50/20">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Generate Resume for Job Description</h1>
          <p className="mt-2 text-slate-600">Select a saved resume or upload a new one to tailor it for a job description.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  <span>Select Saved Resume</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileUp className="w-5 h-5" />
                  <span>Upload New Resume</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === 'saved' && (
              <div>
                {!isAuthenticated ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">Please sign in to view your saved resumes.</p>
                    <button
                      onClick={() => router.push('/editor')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Sign In
                    </button>
                  </div>
                ) : loadingResumes ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading resumes...</p>
                  </div>
                ) : savedResumes.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">No saved resumes found.</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Upload a Resume
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedResumes.map((resume) => (
                      <button
                        key={resume.id}
                        onClick={() => handleSelectResume(resume.id)}
                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                              {resume.name}
                            </div>
                            {resume.title && (
                              <div className="text-sm text-slate-600 mt-1">{resume.title}</div>
                            )}
                            {resume.updated_at && (
                              <div className="text-xs text-slate-500 mt-1">
                                Updated {new Date(resume.updated_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                            →
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upload' && (
              <div>
                <div className="mb-6">
                  <p className="text-slate-600">Upload your resume file (PDF or DOCX) to tailor it for a job description.</p>
                </div>
                <UploadResume variant="page" onUploadSuccess={handleUploadSuccess} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


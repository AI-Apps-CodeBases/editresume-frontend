'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import config from '@/lib/config'
import ModernEditorLayout from '@/components/Editor/ModernEditorLayout'
import NewResumeWizard from '@/components/Editor/NewResumeWizard'
import AuthModal from '@/components/Shared/Auth/AuthModal'

const EditorV2Content = () => {
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [showWizard, setShowWizard] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentView, setCurrentView] = useState<'editor' | 'jobs' | 'resumes'>('editor')
  const [selectedTemplate, setSelectedTemplate] = useState<'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech'>('clean')
  const [resumeData, setResumeData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    sections: [] as Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params: Record<string, string>
      }>
    }>,
  })

  useEffect(() => {
    setMounted(true)
    
    // Load resume data from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resumeData')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setResumeData(parsed)
          setShowWizard(false)
        } catch (e) {
          console.error('Failed to parse saved resume data:', e)
        }
      }

      // Load template from localStorage
      const savedTemplate = localStorage.getItem('selectedTemplate')
      if (savedTemplate) {
        setSelectedTemplate(savedTemplate as 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech')
      }

      // Load from URL params if available
      const resumeIdParam = searchParams.get('resumeId')
      if (resumeIdParam && isAuthenticated && user?.email) {
        loadResumeFromServer(Number(resumeIdParam))
      }
    }
  }, [searchParams, isAuthenticated, user?.email])

  useEffect(() => {
    // Hide navbar and footer for editor-v2
    if (!mounted || showWizard) return
    
    const navbar = document.querySelector('header')
    const footer = document.querySelector('footer')
    if (navbar) navbar.style.display = 'none'
    if (footer) footer.style.display = 'none'
    
    return () => {
      // Restore navbar and footer when leaving
      if (navbar) navbar.style.display = ''
      if (footer) footer.style.display = ''
    }
  }, [mounted, showWizard])

  const loadResumeFromServer = async (resumeId: number) => {
    if (!user?.email) return
    
    try {
      const res = await fetch(`${config.apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        const resume = (data.resumes || []).find((r: any) => r.id === resumeId)
        if (resume) {
          // Load resume version data
          const versionId = resume.latest_version_id
          if (versionId) {
            const versionRes = await fetch(`${config.apiBase}/api/resume/version/${versionId}`)
            if (versionRes.ok) {
              const versionData = await versionRes.json()
              setResumeData({
                name: versionData.name || '',
                title: versionData.title || '',
                email: versionData.email || '',
                phone: versionData.phone || '',
                location: versionData.location || '',
                summary: versionData.summary || '',
                sections: versionData.sections || [],
              })
              setShowWizard(false)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load resume:', error)
    }
  }

  const handleWizardComplete = (data: any) => {
    setResumeData(data)
    setShowWizard(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('resumeData', JSON.stringify(data))
    }
  }

  const handleResumeUpdate = (updatedData: any) => {
    setResumeData(updatedData)
    if (typeof window !== 'undefined') {
      localStorage.setItem('resumeData', JSON.stringify(updatedData))
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-3xl animate-pulse">🛠️</div>
          <p className="text-sm font-semibold text-gray-600">Loading editor…</p>
        </div>
      </div>
    )
  }

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NewResumeWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <ModernEditorLayout
        resumeData={resumeData}
        onResumeUpdate={handleResumeUpdate}
        onViewChange={setCurrentView}
        currentView={currentView}
        template={selectedTemplate}
      />
      
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}

export default function EditorV2Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-3xl animate-pulse">🛠️</div>
            <p className="text-sm font-semibold text-gray-600">Loading editor…</p>
          </div>
        </div>
      }
    >
      <EditorV2Content />
    </Suspense>
  )
}


'use client'
import { useState } from 'react'
import ResumeForm from '@/components/editor/ResumeForm'
import PreviewPanel from '@/components/editor/PreviewPanel'
import GlobalReplacements from '@/components/editor/GlobalReplacements'
import UploadResume from '@/components/editor/UploadResume'
import PasteResume from '@/components/editor/PasteResume'
import TemplateSelector from '@/components/editor/TemplateSelector'
import SectionReorder from '@/components/editor/SectionReorder'

export default function EditorPage() {
  const [showUpload, setShowUpload] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTemplate') || 'clean'
    }
    return 'clean'
  })
  
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
    }>
  })

  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)

  const handleUploadSuccess = (data: any) => {
    console.log('handleUploadSuccess called with:', data)
    
    const newResumeData = {
      name: data.name || '',
      title: data.title || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      summary: data.summary || '',
      sections: data.sections || []
    }
    
    console.log('Setting resume data to:', newResumeData)
    setResumeData(newResumeData)
    
    if (data.detected_variables) {
      console.log('Setting detected variables:', data.detected_variables)
      setReplacements(data.detected_variables)
    }
    
    console.log('Hiding upload screen...')
    setShowUpload(false)
    console.log('Upload screen hidden, editor should be visible now')
  }

  const handleStartFresh = () => {
    setShowUpload(false)
  }

  const handleSectionReorder = (reorderedSections: any[]) => {
    setResumeData({ ...resumeData, sections: reorderedSections })
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    setIsExporting(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/export/${format}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: resumeData.name,
            title: resumeData.title,
            email: resumeData.email,
            phone: resumeData.phone,
            location: resumeData.location,
            summary: resumeData.summary,
            sections: resumeData.sections,
            replacements,
            template: selectedTemplate
          })
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resumeData.name || 'resume'}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert(`Export failed. Please try again.`)
      }
    } catch (error) {
      alert(`Export failed. Make sure backend is running.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-semibold text-primary">editresume.io</a>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-50"
            >
              Upload New
            </button>
            <button 
              onClick={() => handleExport('docx')}
              disabled={isExporting || !resumeData.name}
              className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export DOCX
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              disabled={isExporting || !resumeData.name}
              className="text-sm px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {showUpload ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <UploadResume onUploadSuccess={handleUploadSuccess} />
              <PasteResume onPasteSuccess={handleUploadSuccess} />
            </div>
            <div className="text-center">
              <button
                onClick={handleStartFresh}
                className="text-sm text-gray-600 hover:text-primary underline"
              >
                or start from scratch →
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <TemplateSelector
                selected={selectedTemplate}
                onChange={setSelectedTemplate}
              />
              {resumeData.sections.length > 0 && (
                <SectionReorder
                  sections={resumeData.sections}
                  onReorder={handleSectionReorder}
                />
              )}
              <GlobalReplacements
                replacements={replacements}
                onChange={setReplacements}
              />
              <ResumeForm
                data={resumeData}
                onChange={setResumeData}
                replacements={replacements}
              />
            </div>
            <div className="lg:sticky lg:top-24 h-fit">
              <PreviewPanel
                data={resumeData}
                replacements={replacements}
                template={selectedTemplate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


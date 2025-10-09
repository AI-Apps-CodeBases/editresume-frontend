'use client'
import { useState } from 'react'
import ResumeForm from '@/components/editor/ResumeForm'
import PreviewPanel from '@/components/editor/PreviewPanel'
import GlobalReplacements from '@/components/editor/GlobalReplacements'
import UploadResume from '@/components/editor/UploadResume'
import PasteResume from '@/components/editor/PasteResume'
import TemplateSelector from '@/components/editor/TemplateSelector'
import TwoColumnEditor from '@/components/editor/TwoColumnEditor'

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
          template: selectedTemplate,
          two_column_left: localStorage.getItem('twoColumnLeft') ? JSON.parse(localStorage.getItem('twoColumnLeft')!) : [],
          two_column_right: localStorage.getItem('twoColumnRight') ? JSON.parse(localStorage.getItem('twoColumnRight')!) : [],
          two_column_left_width: localStorage.getItem('twoColumnLeftWidth') ? Number(localStorage.getItem('twoColumnLeftWidth')!) : 50
          })
        }
      )
      
      // Debug logging
      const debugInfo = {
        template: selectedTemplate,
        left: localStorage.getItem('twoColumnLeft'),
        right: localStorage.getItem('twoColumnRight'),
        width: localStorage.getItem('twoColumnLeftWidth'),
        allLocalStorage: Object.keys(localStorage).reduce((obj, key) => {
          if (key.startsWith('twoColumn')) {
            obj[key] = localStorage.getItem(key)
          }
          return obj
        }, {} as Record<string, string | null>)
      }
      console.log('Export payload two-column settings:', debugInfo)

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

  const [previewScale, setPreviewScale] = useState(0.6)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-primary">editresume.io</a>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              📂 New
            </button>
            <button 
              onClick={() => handleExport('docx')}
              disabled={isExporting || !resumeData.name}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📄 DOCX
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              disabled={isExporting || !resumeData.name}
              className="text-sm px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? '⏳ Exporting...' : '📥 Export PDF'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-4 py-4">
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
          <div className="space-y-4">
            {/* Top Bar - Template & Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Template</label>
                  <TemplateSelector
                    selected={selectedTemplate}
                    onChange={setSelectedTemplate}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Global Replacements</label>
                  <GlobalReplacements
                    replacements={replacements}
                    onChange={setReplacements}
                  />
                </div>
              </div>
            </div>

            {/* Two Column Layout - Editor & Preview */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left - Editor */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {selectedTemplate === 'two-column' ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h2 className="text-lg font-bold text-blue-900 mb-2">🎨 Two-Column Layout Editor</h2>
                      <p className="text-sm text-blue-700">Assign sections to left/right columns and adjust widths. Changes appear live in preview →</p>
                    </div>
                    <TwoColumnEditor
                      sections={resumeData.sections}
                      onUpdate={(sections) => setResumeData({ ...resumeData, sections })}
                    />
                  </div>
                ) : (
                  <ResumeForm
                    data={resumeData}
                    onChange={setResumeData}
                    replacements={replacements}
                  />
                )}
              </div>

              {/* Right - Live Preview */}
              <div className="sticky top-4 h-fit">
                <div className="bg-white rounded-xl shadow-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700">📄 Live Preview</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFullscreenPreview(true)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark text-xs font-semibold transition-all flex items-center gap-1"
                        title="View fullscreen preview"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        Full Page
                      </button>
                      <button
                        onClick={() => setPreviewScale(Math.max(0.4, previewScale - 0.1))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
                      >
                        −
                      </button>
                      <span className="text-xs text-gray-600 min-w-[45px] text-center">{Math.round(previewScale * 100)}%</span>
                      <button
                        onClick={() => setPreviewScale(Math.min(1, previewScale + 0.1))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div 
                    className="overflow-auto border-2 rounded-lg bg-gray-50" 
                    style={{ 
                      maxHeight: 'calc(100vh - 220px)',
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      width: `${100 / previewScale}%`
                    }}
                  >
                    <PreviewPanel
                      data={resumeData}
                      replacements={replacements}
                      template={selectedTemplate}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {fullscreenPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
          <div className="relative w-full h-full max-w-[900px] max-h-full flex flex-col">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">Full Page Preview - {selectedTemplate}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  −
                </button>
                <span className="text-white font-semibold min-w-[60px] text-center">{Math.round(previewScale * 100)}%</span>
                <button
                  onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  +
                </button>
                <button
                  onClick={() => setFullscreenPreview(false)}
                  className="ml-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-8">
              <div 
                className="mx-auto bg-white shadow-2xl"
                style={{ 
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  width: `${100 / previewScale}%`,
                  maxWidth: '850px',
                  margin: '0 auto'
                }}
              >
                <PreviewPanel
                  data={resumeData}
                  replacements={replacements}
                  template={selectedTemplate}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting}
                className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export DOCX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


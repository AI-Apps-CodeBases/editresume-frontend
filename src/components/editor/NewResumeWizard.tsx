'use client'
import { useState } from 'react'
import UploadResume from './UploadResume'
import PasteResume from './PasteResume'

interface Props {
  onComplete: (data: any, template: string, layoutConfig?: any) => void
  onCancel: () => void
}

export default function NewResumeWizard({ onComplete, onCancel }: Props) {
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste' | 'scratch' | null>(null)
  const [resumeData, setResumeData] = useState<any>(null)

  const handleMethodSelect = (method: 'upload' | 'paste' | 'scratch') => {
    setInputMethod(method)
  }

  const handleResumeData = (data: any) => {
    setResumeData(data)
    // Go directly to editor with default template
    onComplete(data, 'tech', {})
  }

  const handleStartFromScratch = () => {
    // Create empty resume data and go directly to editor
    const emptyResumeData = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: ''
      },
      sections: [
        {
          id: '1',
          title: 'Professional Summary',
          bullets: [{ id: '1', text: '', params: {} }]
        },
        {
          id: '2', 
          title: 'Experience',
          bullets: [{ id: '2', text: '', params: {} }]
        },
        {
          id: '3',
          title: 'Skills', 
          bullets: [{ id: '3', text: '', params: {} }]
        }
      ]
    }
    onComplete(emptyResumeData, 'tech', {})
  }

  if (inputMethod === 'upload') {
    return (
      <UploadResume 
        onUploadSuccess={handleResumeData}
      />
    )
  }

  if (inputMethod === 'paste') {
    return (
      <PasteResume 
        onPasteSuccess={handleResumeData}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Create Your Resume</h1>
          <p className="text-xl text-blue-100">Choose how you'd like to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <button
            onClick={() => handleMethodSelect('upload')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
            <h3 className="text-2xl font-bold text-white mb-2">Upload Existing</h3>
            <p className="text-purple-100 mb-4">Upload your current resume to edit</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>PDF, DOC, DOCX</span>
            </div>
          </button>

          <button
            onClick={() => handleMethodSelect('paste')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
            <h3 className="text-2xl font-bold text-white mb-2">Paste Text</h3>
            <p className="text-purple-100 mb-4">Copy and paste your resume text</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>Quick import</span>
            </div>
          </button>

          <button
            onClick={handleStartFromScratch}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">✨</div>
            <h3 className="text-2xl font-bold text-white mb-2">Start Fresh</h3>
            <p className="text-purple-100 mb-4">Create a new resume from scratch</p>
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-purple-300">✓</span>
              <span>Blank canvas</span>
            </div>
          </button>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onCancel}
            className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
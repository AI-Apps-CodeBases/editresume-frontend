'use client'
import { useState } from 'react'

import config from '@/lib/config';
interface ResumeData {
  name: string
  title: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  sections: Array<{
    id: string
    title: string
    bullets: Array<{
      id: string
      text: string
      params?: Record<string, any>
    }>
    params?: Record<string, any>
  }>
  fieldsVisible?: Record<string, boolean>
}

interface CoverLetterData {
  opening: string
  body: string
  closing: string
  full_letter: string
}

interface Props {
  resumeData: ResumeData
  onClose: () => void
}

export default function CoverLetterGenerator({ resumeData, onClose }: Props) {
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState('professional')
  const [customRequirements, setCustomRequirements] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null)
  const [editingParagraph, setEditingParagraph] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal, corporate language' },
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable tone' },
    { value: 'concise', label: 'Concise', description: 'Direct, clear language' }
  ]

  const generateCoverLetter = async () => {
    if (!companyName || !positionTitle || !jobDescription) {
      alert('Please fill in company name, position title, and job description')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/cover_letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_data: {
            name: resumeData.name || '',
            title: resumeData.title || '',
            email: resumeData.email || '',
            phone: resumeData.phone || '',
            location: resumeData.location || '',
            summary: resumeData.summary || '',
            sections: (resumeData.sections || []).map((section: any) => ({
              id: section.id,
              title: section.title,
              bullets: (section.bullets || []).map((bullet: any) => ({
                id: bullet.id,
                text: bullet.text,
                params: {}
              }))
            }))
          },
          company_name: companyName,
          position_title: positionTitle,
          tone: tone,
          custom_requirements: customRequirements || null
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCoverLetter(data.cover_letter)
    } catch (error) {
      console.error('Cover letter generation failed:', error)
      alert('Failed to generate cover letter: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const editParagraph = (paragraphType: string) => {
    if (!coverLetter) return
    
    let content = ''
    switch (paragraphType) {
      case 'opening':
        content = coverLetter.opening
        break
      case 'body':
        content = coverLetter.body
        break
      case 'closing':
        content = coverLetter.closing
        break
    }
    
    setEditedContent(content)
    setEditingParagraph(paragraphType)
  }

  const saveParagraph = () => {
    if (!coverLetter || !editingParagraph) return
    
    const updatedCoverLetter = { ...coverLetter }
    updatedCoverLetter[editingParagraph as keyof CoverLetterData] = editedContent
    
    // Rebuild full letter
    updatedCoverLetter.full_letter = `${updatedCoverLetter.opening}\n\n${updatedCoverLetter.body}\n\n${updatedCoverLetter.closing}`
    
    setCoverLetter(updatedCoverLetter)
    setEditingParagraph(null)
    setEditedContent('')
  }

  const exportCoverLetter = async (format: 'pdf' | 'docx') => {
    if (!coverLetter) return

    try {
      const response = await fetch(`${config.apiBase}/api/resume/export/${format}`, {
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
          cover_letter: coverLetter.full_letter,
          template: 'tech',
          two_column_left: [],
          two_column_right: [],
          two_column_left_width: 50
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resumeData.name || 'cover_letter'}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Export failed. Please try again.')
      }
    } catch (error) {
      alert('Export failed. Make sure backend is running.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* Left Panel - Input Form */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">📝 Cover Letter Generator</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google, Microsoft, Amazon"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Position Title *
                </label>
                <input
                  type="text"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer, DevOps Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Description *
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste the job description here..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tone
                </label>
                <div className="space-y-2">
                  {tones.map((toneOption) => (
                    <label key={toneOption.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="tone"
                        value={toneOption.value}
                        checked={tone === toneOption.value}
                        onChange={(e) => setTone(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{toneOption.label}</div>
                        <div className="text-sm text-gray-500">{toneOption.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custom Requirements (Optional)
                </label>
                <textarea
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any specific points you want to emphasize..."
                />
              </div>

              <button
                onClick={generateCoverLetter}
                disabled={isGenerating}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? '🤖 Generating...' : '✨ Generate Cover Letter'}
              </button>
            </div>
          </div>

          {/* Right Panel - Generated Cover Letter */}
          <div className="w-1/2 p-6 flex flex-col max-h-[80vh]">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Generated Cover Letter</h3>
            
            {!coverLetter ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500">Fill in the details and generate your cover letter</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="space-y-4">
                    {/* Opening Paragraph */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-700">Opening</h4>
                        <button
                          onClick={() => editParagraph('opening')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{coverLetter.opening}</p>
                    </div>

                    {/* Body Paragraphs */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-700">Body</h4>
                        <button
                          onClick={() => editParagraph('body')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                      <div className="text-gray-800 leading-relaxed whitespace-pre-line">{coverLetter.body}</div>
                    </div>

                    {/* Closing Paragraph */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-700">Closing</h4>
                        <button
                          onClick={() => editParagraph('closing')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{coverLetter.closing}</p>
                    </div>
                  </div>
                </div>
                
                {/* Export Buttons - Always visible at bottom */}
                <div className="flex gap-3 pt-4 border-t bg-white">
                  <button
                    onClick={() => exportCoverLetter('pdf')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={() => exportCoverLetter('docx')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    📝 Export DOCX
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingParagraph && (
          <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Edit {editingParagraph.charAt(0).toUpperCase() + editingParagraph.slice(1)} Paragraph
                  </h3>
                  <button
                    onClick={() => {
                      setEditingParagraph(null)
                      setEditedContent('')
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={saveParagraph}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingParagraph(null)
                      setEditedContent('')
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { useModal } from '@/contexts/ModalContext'
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
  onCoverLetterChange?: (letter: string | null) => void
  initialCompanyName?: string
  initialPositionTitle?: string
  initialJobDescription?: string
  jobId?: number | null
  onSaveSuccess?: (savedLetter: any) => void
}

export default function CoverLetterGenerator({ 
  resumeData, 
  onClose, 
  onCoverLetterChange,
  initialCompanyName = '',
  initialPositionTitle = '',
  initialJobDescription = '',
  jobId = null,
  onSaveSuccess
}: Props) {
  const { showAlert, showConfirm } = useModal()
  const [companyName, setCompanyName] = useState(initialCompanyName)
  const [positionTitle, setPositionTitle] = useState(initialPositionTitle)
  const [jobDescription, setJobDescription] = useState(initialJobDescription)
  const [tone, setTone] = useState('professional')
  const [customRequirements, setCustomRequirements] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null)
  const [editingParagraph, setEditingParagraph] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [jdSentences, setJdSentences] = useState<string[]>([])
  const [selectedSentences, setSelectedSentences] = useState<Set<number>>(new Set())
  const [extractingSentences, setExtractingSentences] = useState(false)

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal, corporate language' },
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable tone' },
    { value: 'concise', label: 'Concise', description: 'Direct, clear language' }
  ]

  const extractImportantSentences = async () => {
    if (!jobDescription.trim()) {
      await showAlert({
        title: 'Missing Information',
        message: 'Please enter a job description first',
        type: 'warning'
      })
      return
    }

    setExtractingSentences(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/extract_jd_sentences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription
        })
      })

      if (response.ok) {
        const data = await response.json()
        setJdSentences(data.sentences || [])
        // Select all by default
        setSelectedSentences(new Set(data.sentences?.map((_: string, idx: number) => idx) || []))
      } else {
        await showAlert({
          title: 'Error',
          message: 'Failed to extract sentences from job description',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to extract sentences:', error)
      await showAlert({
        title: 'Error',
        message: 'Failed to extract sentences from job description',
        type: 'error'
      })
    } finally {
      setExtractingSentences(false)
    }
  }

  const toggleSentence = (index: number) => {
    setSelectedSentences(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const generateCoverLetter = async () => {
    if (!companyName || !positionTitle || !jobDescription) {
      await showAlert({
        title: 'Missing Information',
        message: 'Please fill in company name, position title, and job description',
        type: 'warning'
      })
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
          custom_requirements: customRequirements || null,
          selected_sentences: selectedSentences.size > 0 
            ? jdSentences.filter((_, idx) => selectedSentences.has(idx))
            : null
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      let coverLetterData = data.cover_letter

      // Handle case where cover_letter might be a string (raw JSON)
      if (typeof coverLetterData === 'string') {
        try {
          // Remove markdown code blocks if present
          let cleaned = coverLetterData
            .replace(/^```(?:json)?\s*\n?/gm, '')
            .replace(/\n?```\s*$/gm, '')
            .trim()
          
          // Try to parse as JSON
          coverLetterData = JSON.parse(cleaned)
        } catch (e) {
          console.error('Failed to parse cover letter string:', e)
          // Fallback: create structured response from raw string
          coverLetterData = {
            opening: `I am writing to express my strong interest in the ${positionTitle} position at ${companyName}.`,
            body: coverLetterData,
            closing: 'I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for your consideration.',
            full_letter: coverLetterData
          }
        }
      }

      // Clean JSON response - remove markdown code blocks and JSON artifacts if present
      if (coverLetterData && typeof coverLetterData === 'object') {
        const cleanField = (field: any): string => {
          if (typeof field !== 'string') {
            if (field === null || field === undefined) return ''
            return String(field)
          }
          let cleaned = field
            .replace(/^```(?:json)?\s*\n?/gm, '')
            .replace(/\n?```\s*$/gm, '')
            .replace(/^\{[\s\S]*?"(?:opening|body|closing|full_letter)":/gm, '')
            .replace(/^\s*["']/g, '')
            .replace(/["']\s*$/g, '')
          
          // Remove JSON markers like "opening", "body", "closing" if they appear in text
          cleaned = cleaned
            .replace(/["']opening["']\s*:\s*/gi, '')
            .replace(/["']body["']\s*:\s*/gi, '')
            .replace(/["']closing["']\s*:\s*/gi, '')
            .replace(/["']full_letter["']\s*:\s*/gi, '')
            .replace(/\{[\s\S]*?\}/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          
          return cleaned
        }

        // Ensure all required fields exist
        const cleaned = {
          opening: cleanField(coverLetterData.opening || ''),
          body: cleanField(coverLetterData.body || ''),
          closing: cleanField(coverLetterData.closing || ''),
          full_letter: cleanField(coverLetterData.full_letter || '')
        }

        // If full_letter is empty or contains JSON artifacts, rebuild it
        if (!cleaned.full_letter || (cleaned.full_letter.includes('{') && cleaned.full_letter.includes('"opening"')) || cleaned.full_letter.toLowerCase().includes('"body"') || cleaned.full_letter.toLowerCase().includes('"closing"')) {
          cleaned.full_letter = `${cleaned.opening}\n\n${cleaned.body}\n\n${cleaned.closing}`.trim()
        }

        // Final cleanup of full_letter to remove any remaining artifacts
        cleaned.full_letter = cleaned.full_letter
          .replace(/["']opening["']\s*:\s*/gi, '')
          .replace(/["']body["']\s*:\s*/gi, '')
          .replace(/["']closing["']\s*:\s*/gi, '')
          .replace(/\{[^}]*\}/g, '')
          .replace(/\s{3,}/g, '\n\n')
          .trim()

        coverLetterData = cleaned
      }

      // Validate that we have valid content
      if (!coverLetterData || (!coverLetterData.opening && !coverLetterData.body && !coverLetterData.full_letter)) {
        throw new Error('Invalid cover letter response format')
      }

      setCoverLetter(coverLetterData)
      onCoverLetterChange?.(coverLetterData?.full_letter ?? null)
    } catch (error) {
      console.error('Cover letter generation failed:', error)
      await showAlert({
        title: 'Generation Failed',
        message: 'Failed to generate cover letter: ' + (error as Error).message,
        type: 'error'
      })
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
    onCoverLetterChange?.(updatedCoverLetter.full_letter)
    setEditingParagraph(null)
    setEditedContent('')
  }

  const saveCoverLetter = async () => {
    if (!coverLetter) {
      await showAlert({
        title: 'No Cover Letter',
        message: 'Please generate a cover letter first.',
        type: 'warning'
      })
      return
    }

    if (!jobId) {
      await showAlert({
        title: 'Invalid Context',
        message: 'Please ensure you are saving from a job page.',
        type: 'warning'
      })
      return
    }

    // Ensure we have valid content to save and clean it
    let contentToSave = coverLetter.full_letter || 
      `${coverLetter.opening || ''}\n\n${coverLetter.body || ''}\n\n${coverLetter.closing || ''}`.trim()

    // Final cleanup to remove any JSON/body markers
    contentToSave = contentToSave
      .replace(/["']opening["']\s*:\s*/gi, '')
      .replace(/["']body["']\s*:\s*/gi, '')
      .replace(/["']closing["']\s*:\s*/gi, '')
      .replace(/["']full_letter["']\s*:\s*/gi, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\b(body|opening|closing)\s*[:=]\s*/gi, '')
      .replace(/\s{3,}/g, '\n\n')
      .trim()

    if (!contentToSave || contentToSave.length < 10) {
      await showAlert({
        title: 'Invalid Content',
        message: 'Cover letter content is too short. Please generate a new cover letter.',
        type: 'warning'
      })
      return
    }

    setIsSaving(true)
    try {
      // Create a proper title: "Company_name - Cover Letter"
      const coverLetterTitle = companyName 
        ? `${companyName} - Cover Letter`
        : 'Cover Letter'

      const response = await fetch(`${config.apiBase}/api/job-descriptions/${jobId}/cover-letters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: coverLetterTitle,
          content: contentToSave
        })
      })

      if (response.ok) {
        const saved = await response.json()
        await showAlert({
          title: 'Success',
          message: 'Cover letter saved successfully!',
          type: 'success',
          icon: '✅'
        })
        
        // Store in localStorage so it can be selected for export
        if (typeof window !== 'undefined' && saved.id) {
          localStorage.setItem('selectedCoverLetter', JSON.stringify({
            id: saved.id,
            content: contentToSave,
            title: coverLetterTitle,
            jobId: jobId,
            companyName: companyName || '',
            positionTitle: positionTitle || ''
          }))
          
          // Dispatch event to notify editor page
          window.dispatchEvent(new CustomEvent('coverLetterSelected', {
            detail: { content: contentToSave, title: coverLetterTitle }
          }))
        }
        
        // Pass the saved letter to the callback
        onSaveSuccess?.(saved)
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save cover letter' }))
        await showAlert({
          title: 'Error',
          message: errorData.detail || 'Failed to save cover letter',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to save cover letter:', error)
      await showAlert({
        title: 'Error',
        message: 'Failed to save cover letter. Please try again.',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportCoverLetter = async (format: 'pdf' | 'docx') => {
    if (!coverLetter) {
      await showAlert({
        title: 'No Cover Letter',
        message: 'Please generate a cover letter first.',
        type: 'warning'
      })
      return
    }

    // Ensure we have valid content to export
    const contentToExport = coverLetter.full_letter || 
      `${coverLetter.opening || ''}\n\n${coverLetter.body || ''}\n\n${coverLetter.closing || ''}`.trim()

    if (!contentToExport || contentToExport.length < 10) {
      await showAlert({
        title: 'Invalid Content',
        message: 'Cover letter content is too short. Please generate a new cover letter.',
        type: 'warning'
      })
      return
    }

    try {
      const response = await fetch(`${config.apiBase}/api/resume/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: resumeData.name || '',
          title: resumeData.title || '',
          email: '',
          phone: '',
          location: '',
          summary: '',
          sections: [],
          cover_letter: contentToExport,
          company_name: companyName || '',
          position_title: positionTitle || '',
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
        const fileName = companyName && positionTitle
          ? `${companyName}_${positionTitle}_CoverLetter.${format}`.replace(/[^a-z0-9]/gi, '_')
          : companyName
            ? `${companyName}_CoverLetter.${format}`.replace(/[^a-z0-9]/gi, '_')
            : `cover_letter.${format}`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorText = await response.text()
        console.error('Export failed:', errorText)
        await showAlert({
          title: 'Export Failed',
          message: 'Export failed. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      await showAlert({
        title: 'Export Failed',
        message: 'Export failed. Make sure backend is running.',
        type: 'error'
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Input Form */}
          <div className="w-1/2 p-6 border-r flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">📝 Cover Letter Generator</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Job Description *
                  </label>
                  <button
                    onClick={extractImportantSentences}
                    disabled={extractingSentences || !jobDescription.trim()}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {extractingSentences ? 'Extracting...' : '📋 Extract Key Points'}
                  </button>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste the job description here..."
                />
                {jdSentences.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Select Important Sentences from JD ({selectedSentences.size} selected)
                      </label>
                      <button
                        onClick={() => {
                          if (selectedSentences.size === jdSentences.length) {
                            setSelectedSentences(new Set())
                          } else {
                            setSelectedSentences(new Set(jdSentences.map((_, idx) => idx)))
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedSentences.size === jdSentences.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {jdSentences.map((sentence, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedSentences.has(idx)
                              ? 'bg-blue-100 border border-blue-300'
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSentences.has(idx)}
                            onChange={() => toggleSentence(idx)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">{sentence}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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

            </div>
            </div>
            
            <div className="flex-shrink-0 pt-4 border-t mt-4">
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
          <div className="w-1/2 p-6 flex flex-col overflow-hidden">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex-shrink-0">Generated Cover Letter</h3>
            
            {!coverLetter ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500">Fill in the details and generate your cover letter</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto pr-2">
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
                
                {/* Action Buttons - Always visible at bottom, fixed position */}
                <div className="flex gap-3 pt-4 border-t bg-white flex-shrink-0">
                  {jobId && (
                    <button
                      onClick={saveCoverLetter}
                      disabled={isSaving || !coverLetter}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? '💾 Saving...' : '💾 Save'}
                    </button>
                  )}
                  <button
                    onClick={() => exportCoverLetter('pdf')}
                    disabled={!coverLetter}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={() => exportCoverLetter('docx')}
                    disabled={!coverLetter}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
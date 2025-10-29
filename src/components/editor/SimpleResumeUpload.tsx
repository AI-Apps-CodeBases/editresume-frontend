'use client'
import { useState } from 'react'

import config from '@/lib/config';
interface Props {
  onUploadSuccess: (data: any) => void
  onClose?: () => void
  showCloseButton?: boolean
}

export default function SimpleResumeUpload({ onUploadSuccess, onClose, showCloseButton = false }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [parseMode, setParseMode] = useState<'file' | 'text'>('file')
  const [parsingStep, setParsingStep] = useState('')

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = (file: File) => {
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
    const validExtensions = ['pdf', 'docx', 'doc', 'txt']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      setError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.')
      return
    }

    setUploadedFile(file)
    setParseMode('file')
    setError('')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const parseResumeWithAI = async () => {
    console.log('=== SIMPLE RESUME UPLOAD ===')
    console.log('Parse mode:', parseMode)
    console.log('Uploaded file:', uploadedFile)
    console.log('Resume text:', resumeText)
    
    if (parseMode === 'file' && !uploadedFile) {
      setError('Please upload a file first')
      return
    }
    
    if (parseMode === 'text' && !resumeText.trim()) {
      setError('Please enter resume text first')
      return
    }

    setIsUploading(true)
    setError('')
    setParsingStep('Starting AI analysis...')

    try {
      let response
      
      if (parseMode === 'file' && uploadedFile) {
        setParsingStep('Validating file...')
        console.log('Uploading file:', uploadedFile.name)
        
        // Validate file size
        if (uploadedFile.size > 10 * 1024 * 1024) {
          throw new Error('File too large. Maximum size is 10MB.')
        }
        
        // Validate file type
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
        const validExtensions = ['pdf', 'docx', 'doc', 'txt']
        const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase()
        
        if (!validTypes.includes(uploadedFile.type) && !validExtensions.includes(fileExtension || '')) {
          throw new Error('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.')
        }
        
        setParsingStep('Uploading and processing file...')
        const formData = new FormData()
        formData.append('file', uploadedFile)
        
        response = await fetch(`${config.apiBase}/api/resume/parse-file`, {
          method: 'POST',
          body: formData
        })
      } else {
        setParsingStep('Sending to AI for analysis...')
        console.log('Sending text to AI...')
        
        response = await fetch(`${config.apiBase}/api/resume/parse-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: resumeText
          })
        })
      }
      
      const responseText = await response.text()
      console.log('=== RESPONSE DEBUG ===')
      console.log('Response received:', responseText)
      console.log('Response length:', responseText.length)
      console.log('Response type:', typeof responseText)
      console.log('Response is empty:', responseText === '')
      console.log('Response is null:', responseText === null)
      console.log('Response is undefined:', responseText === undefined)
      console.log('First 200 chars:', responseText.substring(0, 200))
      console.log('Last 200 chars:', responseText.substring(responseText.length - 200))
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText)
        console.error('Error response:', responseText)
        throw new Error(`Failed to parse resume: ${response.status} ${response.statusText}`)
      }
      
      // Check if response is empty or not JSON
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server')
      }
      
      // Check if response looks like JSON
      const trimmedResponse = responseText.trim()
      if (!trimmedResponse.startsWith('{') && !trimmedResponse.startsWith('[')) {
        console.error('Response does not start with JSON')
        console.error('Response starts with:', trimmedResponse.substring(0, 100))
        throw new Error('Server returned non-JSON response')
      }
      
      let result
      try {
        result = JSON.parse(responseText)
        console.log('Parsed response:', result)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text:', responseText)
        console.error('Response starts with:', responseText.substring(0, 100))
        console.error('Response ends with:', responseText.substring(responseText.length - 100))
        throw new Error('Failed to parse server response as JSON')
      }
      
      if (!result.success) {
        console.error('Parsing failed:', result.error)
        
        // Check if the error is due to malformed JSON from AI
        if (result.error && result.error.includes('Failed to parse AI response as JSON')) {
          console.log('AI returned malformed JSON, attempting to clean and parse raw response')
          setParsingStep('Cleaning AI response...')
          
          try {
            // Clean the raw response by removing markdown code blocks
            let cleanedResponse = result.raw_response || ''
            console.log('Raw AI response:', cleanedResponse)
            
            // Remove markdown code blocks
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            console.log('Cleaned AI response:', cleanedResponse)
            
            // Try to parse the cleaned JSON
            const aiData = JSON.parse(cleanedResponse)
            console.log('Successfully parsed AI data:', aiData)
            console.log('AI personal_info:', aiData.personal_info)
            console.log('AI sections structure:', aiData.sections)
            console.log('AI jobs structure:', aiData.jobs)
            console.log('First section bullets:', aiData.sections?.[0]?.bullets)
            
            // Create resume data from AI response
            const resumeData = {
              personalInfo: {
                name: aiData.personal_info?.name || '',
                email: aiData.personal_info?.email || '',
                phone: aiData.personal_info?.phone || '',
                location: aiData.personal_info?.location || '',
                linkedin: aiData.personal_info?.linkedin || '',
                website: aiData.personal_info?.website || ''
              },
              sections: [
                // Add work experience section from jobs array if it exists
                ...(aiData.jobs && aiData.jobs.length > 0 ? [{
                  id: 'work-experience',
                  title: 'Work Experience',
                  bullets: aiData.jobs.map((job: any, jobIndex: number) => [
                    // Company header
                    {
                      id: `job-header-${jobIndex}`,
                      text: `**${job.company || 'Company'} / ${job.role || 'Role'} / ${job.date || 'Date'}**`,
                      params: {}
                    },
                    // Job bullets
                    ...(job.bullets || []).map((bullet: any, bulletIndex: number) => ({
                      id: `job-${jobIndex}-bullet-${bulletIndex}`,
                      text: `• ${bullet}`,
                      params: {}
                    }))
                  ]).flat()
                }] : []),
                // Add other sections
                ...(aiData.sections || []).map((section: any, index: number) => ({
                  id: `section-${index}`,
                  title: section.title || `Section ${index + 1}`,
                  bullets: (section.bullets || []).map((bullet: any, bulletIndex: number) => ({
                    id: `bullet-${index}-${bulletIndex}`,
                    text: bullet.text || bullet || '',
                    params: {}
                  }))
                }))
              ]
            }
            
            setParsingStep('Complete!')
            console.log('Final resume data from AI:', resumeData)
            onUploadSuccess(resumeData)
            return
            
          } catch (cleanError) {
            console.error('Failed to clean AI response:', cleanError)
            // Fall through to fallback
          }
        }
        
        // If OpenAI is not available, create a fallback resume structure
        if (result.error && result.error.includes('OpenAI')) {
          console.log('OpenAI not available, creating fallback resume structure')
          setParsingStep('Creating fallback resume structure...')
          
          const fallbackData = {
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
                title: 'Work Experience',
                bullets: [{ id: '2', text: '', params: {} }]
              }
            ]
          }
          
          setParsingStep('Complete!')
          console.log('Fallback resume data:', fallbackData)
          onUploadSuccess(fallbackData)
          return
        }
        
        throw new Error(result.error || 'Parsing failed')
      }
      
      setParsingStep('Processing results...')
      
      console.log('Normal success - result.data:', result.data)
      console.log('Normal success - sections:', result.data.sections)
      console.log('Normal success - jobs:', result.data.jobs)
      console.log('Normal success - first section bullets:', result.data.sections?.[0]?.bullets)
      
      // Create simple resume data structure
      const resumeData = {
        personalInfo: {
          name: result.data.name || result.data.personal_info?.name || '',
          email: result.data.email || result.data.personal_info?.email || '',
          phone: result.data.phone || result.data.personal_info?.phone || '',
          location: result.data.location || result.data.personal_info?.location || '',
          linkedin: result.data.linkedin || result.data.personal_info?.linkedin || '',
          website: result.data.website || result.data.personal_info?.website || ''
        },
        sections: [
          // Add work experience section from jobs array if it exists
          ...(result.data.jobs && result.data.jobs.length > 0 ? [{
            id: 'work-experience',
            title: 'Work Experience',
            bullets: result.data.jobs.map((job: any, jobIndex: number) => [
              // Company header
              {
                id: `job-header-${jobIndex}`,
                text: `**${job.company || 'Company'} / ${job.role || 'Role'} / ${job.date || 'Date'}**`,
                params: {}
              },
              // Job bullets
              ...(job.bullets || []).map((bullet: any, bulletIndex: number) => ({
                id: `job-${jobIndex}-bullet-${bulletIndex}`,
                text: `• ${bullet}`,
                params: {}
              }))
            ]).flat()
          }] : []),
          // Add other sections
          ...(result.data.sections || []).map((section: any, index: number) => ({
            id: `section-${index}`,
            title: section.title || `Section ${index + 1}`,
            bullets: (section.bullets || []).map((bullet: any, bulletIndex: number) => ({
              id: `bullet-${index}-${bulletIndex}`,
              text: bullet.text || bullet || '',
              params: {}
            }))
          }))
        ]
      }
      
      setParsingStep('Complete!')
      console.log('Final resume data:', resumeData)
      onUploadSuccess(resumeData)
      
    } catch (error) {
      console.error('Error parsing resume:', error)
      setError('Failed to parse resume: ' + (error as Error).message)
      setParsingStep('Error occurred during parsing')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Resume Upload</h3>
        <p className="text-sm text-gray-600">
          Upload your resume file (PDF/DOCX) or paste text and AI will help organize it.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setParseMode('file')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            parseMode === 'file' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📄 Upload File
        </button>
        <button
          onClick={() => setParseMode('text')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            parseMode === 'text' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📝 Paste Text
        </button>
      </div>

      {/* File Upload */}
      {parseMode === 'file' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Resume File (PDF, DOCX)
          </label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm text-gray-600">
                {uploadedFile ? (
                  <div>
                    <div className="font-medium text-green-600">✓ {uploadedFile.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Ready to upload</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Click to upload or drag and drop</div>
                    <div className="text-xs text-gray-500 mt-1">PDF, DOCX files only</div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Text Input */}
      {parseMode === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Resume Text
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            {resumeText.length} characters
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Parsing Step */}
      {parsingStep && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600">{parsingStep}</p>
        </div>
      )}

      {/* Upload Button */}
      <div className="mt-6">
        <button
          onClick={parseResumeWithAI}
          disabled={isUploading || (parseMode === 'file' && !uploadedFile) || (parseMode === 'text' && !resumeText.trim())}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isUploading ? '🤖 Processing Resume...' : '🚀 Upload Resume'}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>What AI will do:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Extract personal information (name, email, phone, etc.)</li>
          <li>Organize content into resume sections</li>
          <li>Structure the data for easy editing</li>
          <li>Prepare for modern resume editing</li>
        </ul>
      </div>

      {/* Close Button */}
      {showCloseButton && onClose && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

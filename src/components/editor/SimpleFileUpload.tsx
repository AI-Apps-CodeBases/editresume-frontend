'use client'
import { useState } from 'react'

import config from '@/lib/config';
interface SimpleFileUploadProps {
  onUploadSuccess: (data: any) => void
  onClose: () => void
}

export default function SimpleFileUpload({ onUploadSuccess, onClose }: SimpleFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${config.apiBase}/api/resume/parse-file`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Convert the response to the expected format
      const resumeData = {
        personalInfo: {
          name: result.data.personal_info?.name || '',
          email: result.data.personal_info?.email || '',
          phone: result.data.personal_info?.phone || '',
          location: result.data.personal_info?.location || '',
          linkedin: result.data.personal_info?.linkedin || '',
          website: result.data.personal_info?.website || ''
        },
        sections: [
          // Add work experience from jobs array
          ...(result.data.jobs && result.data.jobs.length > 0 ? [{
            id: 'work-experience',
            title: 'Work Experience',
            bullets: result.data.jobs.map((job: any, jobIndex: number) => [
              {
                id: `job-header-${jobIndex}`,
                text: `**${job.company || 'Company'} / ${job.role || 'Role'} / ${job.date || 'Date'}**`,
                params: {}
              },
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

      onUploadSuccess(resumeData)
      onClose()

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload resume. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Resume</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose PDF or DOCX file
          </label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {isUploading && (
          <div className="text-sm text-gray-600">
            Analyzing resume...
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

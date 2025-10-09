'use client'
import { useState } from 'react'

interface Props {
  onUploadSuccess: (data: any) => void
}

export default function UploadResume({ onUploadSuccess }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ]
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or DOCX file')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file:', file.name)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Upload result:', result)
      console.log('Parsed data details:', JSON.stringify(result.data, null, 2))

      if (result.success) {
        console.log('Calling onUploadSuccess with:', result.data)
        onUploadSuccess(result.data)
        console.log('onUploadSuccess called successfully')
      } else {
        const errorMsg = result.error || 'Upload failed'
        setError(errorMsg)
        console.error('Upload error:', result.error)
        
        if (errorMsg.includes('image-based') || errorMsg.includes('encrypted')) {
          setTimeout(() => {
            if (window.confirm(
              'Your PDF appears to be image-based or encrypted.\n\n' +
              'Would you like to manually enter your resume information instead?\n\n' +
              'Click OK to start with a blank form.'
            )) {
              onUploadSuccess({
                name: '',
                title: '',
                email: '',
                phone: '',
                location: '',
                summary: '',
                sections: [],
                detected_variables: {}
              })
            }
          }, 100)
        }
      }
    } catch (err) {
      console.error('Upload exception:', err)
      setError('Upload failed. Make sure backend is running.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary transition">
      <div className="space-y-4">
        <div className="text-4xl">📄</div>
        <div>
          <h3 className="text-lg font-semibold">
            {isUploading ? 'Parsing Your Resume...' : 'Upload Your Resume'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isUploading 
              ? 'Extracting sections, bullets, and contact info...' 
              : 'Upload PDF or DOCX and we\'ll extract all details automatically'}
          </p>
        </div>
        
        <label className="inline-block">
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <span className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium cursor-pointer hover:bg-primary-dark disabled:opacity-50">
            {isUploading ? 'Uploading...' : 'Choose PDF or DOCX File'}
          </span>
        </label>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 font-medium mb-2">❌ {error}</div>
            {(error.includes('image-based') || error.includes('encrypted')) && (
              <div className="text-xs text-red-600 mt-2">
                <strong>Tip:</strong> Your PDF seems to be a scanned document. 
                You can either:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Use the manual entry option (click OK in the popup)</li>
                  <li>Or convert your PDF to text-based format first</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Supports PDF & DOCX • Extracts sections, bullets & contact info • Auto-detects variables
        </p>
      </div>
    </div>
  )
}


'use client'
import { useState } from 'react'

interface Props {
  onUploadSuccess: (data: any) => void
}

export default function UploadResume({ onUploadSuccess }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

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

  const handleFile = async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      setError('Please upload a PDF or DOCX file')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      const result = await response.json()
      console.log('Upload response:', result)

      if (result.success) {
        console.log('Upload successful, calling onUploadSuccess with:', result.data)
        onUploadSuccess(result.data)
      } else {
        const errorMsg = result.error || 'Upload failed'
        setError(errorMsg)
        
        if (errorMsg.includes('image-based') || errorMsg.includes('encrypted')) {
          setTimeout(() => {
            setError('')
          }, 5000)
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div 
          className={`relative bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-purple-500 bg-purple-50 scale-105 shadow-2xl' 
              : isUploading
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400 hover:shadow-xl'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className={`inline-block text-6xl transition-all duration-500 ${isUploading ? 'animate-bounce' : 'scale-100'}`}>
                {isUploading ? '⚡' : '📄'}
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  {isUploading ? 'Processing Your Resume...' : 'Upload Your Resume'}
                </h3>
                <p className="text-gray-600 mt-2">
                  {isUploading ? 'Extracting all the details with AI magic...' : 'Drag & drop your resume or click to browse'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.docx,.doc"
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Processing...' : 'Choose File'}
              </label>

              {error && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❌</span>
                    <span className="text-sm font-semibold text-red-700">{error}</span>
                  </div>
                  {error.includes('image-based') && (
                    <div className="mt-3 text-xs text-red-600">
                      <p className="font-semibold">This appears to be an image-based PDF. Try:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Use the manual entry option (click OK in the popup)</li>
                        <li>Or convert your PDF to text-based format first</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Features List */}
        <div className="flex items-center justify-center gap-6 text-xs text-white/80 pt-4">
          <div className="flex items-center gap-1">
            <span className="text-purple-200">✓</span>
            <span>PDF & DOCX</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-200">✓</span>
            <span>Auto-extract</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-200">✓</span>
            <span>AI-powered</span>
          </div>
        </div>
      </div>
    </div>
  )
}
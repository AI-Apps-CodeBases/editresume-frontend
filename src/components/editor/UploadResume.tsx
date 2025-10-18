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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  return (
    <div 
      className={`relative bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
        isDragging 
          ? 'border-blue-500 bg-blue-50 scale-105 shadow-2xl' 
          : isUploading
          ? 'border-purple-400 bg-purple-50'
          : 'border-gray-300 hover:border-blue-400 hover:shadow-xl'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${isUploading ? 'animate-pulse' : ''}`}></div>
        <div className={`absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-200 to-yellow-200 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${isUploading ? 'animate-pulse' : ''}`}></div>
      </div>

      <div className="relative space-y-6">
        {/* Animated Icon */}
        <div className={`inline-block transition-all duration-500 ${isUploading ? 'animate-bounce' : isDragging ? 'scale-125' : 'scale-100'}`}>
          <div className="text-7xl">
            {isUploading ? '⚡' : isDragging ? '🎯' : '📄'}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isUploading ? 'Parsing Your Resume...' : isDragging ? 'Drop it here!' : 'Upload Your Resume'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {isUploading 
              ? 'Extracting sections, bullets, and contact info with AI...' 
              : 'Drag & drop your PDF or DOCX, or click to browse'}
          </p>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-3">
            <div className="w-64 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}
        
        {/* Upload Button */}
        {!isUploading && (
          <label className="inline-block group cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose File
            </span>
          </label>
        )}

        {/* Error Message */}
        {error && (
          <div className="animate-shake p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-red-700 mb-1">{error}</div>
                {(error.includes('image-based') || error.includes('encrypted')) && (
                  <div className="text-xs text-red-600 mt-2 space-y-1">
                    <p className="font-medium">💡 Your PDF seems to be a scanned document.</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Use the manual entry option (click OK in the popup)</li>
                      <li>Or convert your PDF to text-based format first</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Features List */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-4">
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>PDF & DOCX</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Auto-extract</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>AI-powered</span>
          </div>
        </div>
      </div>
    </div>
  )
}


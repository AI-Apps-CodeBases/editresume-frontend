'use client'
import { useState } from 'react'

interface Props {
  onUploadSuccess: (data: any) => void
  variant?: 'page' | 'modal'
}

export default function UploadResume({ onUploadSuccess, variant = 'page' }: Props) {
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

    console.log('=== UPLOAD DEBUG START ===')
    console.log('File selected:', file.name, file.size, file.type)
    console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE)
    console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server')

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'https://editresume-staging.onrender.com'}/api/resume/upload`
      console.log('Upload URL:', uploadUrl)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

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
      console.error('=== UPLOAD ERROR ===')
      console.error('Error type:', typeof err)
      console.error('Error message:', err instanceof Error ? err.message : String(err))
      console.error('Error stack:', err instanceof Error ? err.stack : undefined)
      console.error('Full error:', err)
      
      if (err instanceof Error && err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. Please check your internet connection and try again.')
      } else if (err instanceof Error && err.name === 'TypeError' && err.message.includes('CORS')) {
        setError('CORS error: The server is not allowing requests from this domain.')
      } else {
        setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
      }
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

  const dropZone = (
    <div 
      className={`relative rounded-3xl border-2 border-dashed text-center transition-all duration-300 px-8 py-10 sm:px-12 sm:py-12 ${
        isDragging 
          ? 'border-purple-500 bg-purple-50 scale-[1.02] shadow-xl' 
          : isUploading
          ? 'border-purple-400 bg-purple-50'
          : 'border-gray-300 hover:border-purple-400 hover:shadow-lg'
      } ${variant === 'page' ? 'bg-white/90 backdrop-blur-sm' : 'bg-white'}`}
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
            <h3 className={`${variant === 'page' ? 'text-2xl' : 'text-xl'} font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent`}>
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
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-lg text-left">
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
  )

  const featureList = (
    <div className={`flex items-center justify-center gap-6 text-xs ${variant === 'page' ? 'text-white/80 pt-4' : 'text-gray-500 pt-3'}`}>
      <div className="flex items-center gap-1">
        <span className={variant === 'page' ? 'text-purple-200' : 'text-purple-400'}>✓</span>
        <span>PDF & DOCX</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={variant === 'page' ? 'text-purple-200' : 'text-purple-400'}>✓</span>
        <span>Auto-extract</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={variant === 'page' ? 'text-purple-200' : 'text-purple-400'}>✓</span>
        <span>AI-powered</span>
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="space-y-4">
        {dropZone}
        {featureList}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {dropZone}
        {featureList}
      </div>
    </div>
  )
}
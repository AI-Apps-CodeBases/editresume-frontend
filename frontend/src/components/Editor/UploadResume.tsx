'use client'
import { useState, useRef } from 'react'
import config from '@/lib/config'
import { FileText, Zap, AlertTriangle } from 'lucide-react'

interface Props {
  onUploadSuccess: (data: any) => void
  variant?: 'page' | 'modal'
}

export default function UploadResume({ onUploadSuccess, variant = 'page' }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    console.log('📤 File selected from LOCAL machine:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    })
    console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE)
    console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server')

    // Show scanning animation (non-blocking)
    setSelectedFileName(file.name)
    setIsScanning(true)
    setError('')
    setScanProgress(0)

    // Animate progress bar in the background while upload runs
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 95) {
          return prev
        }
        return prev + Math.random() * 10
      })
    }, 200)

    setIsUploading(true)

    try {
      let baseUrl = process.env.NEXT_PUBLIC_API_BASE || config.apiBase
      baseUrl = baseUrl.replace(/\/$/, '')
      const uploadUrl = `${baseUrl}/api/resume/upload`
      console.log('Upload URL:', uploadUrl)

      const healthCheckUrl = `${baseUrl}/health`
      try {
        const healthResponse = await fetch(healthCheckUrl, { method: 'GET' })
        if (!healthResponse.ok) {
          throw new Error(`Backend health check failed: ${healthResponse.status}`)
        }
        console.log('✅ Backend is reachable')
      } catch (healthErr) {
        console.error('❌ Backend health check failed:', healthErr)
        setError(`Cannot connect to backend at ${baseUrl}. Please ensure the backend server is running.`)
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => {
        controller.abort()
      }, 65000) // a bit above backend max_parsing_time_seconds (60s)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        throw new Error(errorData.error || errorData.message || `Server returned ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload response:', result)

      if (result.success) {
        console.log('✅ Upload successful! File processed:', file.name)
        console.log('📋 Extracted data:', result.data)
        
        // Validate data before processing
        if (!result.data) {
          setError('Upload succeeded but no data was extracted. Please try again or use manual entry.')
          return
        }
        
        const hasName = result.data.name && result.data.name.trim()
        const hasSections = result.data.sections && Array.isArray(result.data.sections) && result.data.sections.length > 0
        
        if (!hasName && !hasSections) {
          setError('Upload succeeded but no meaningful content was extracted. The file might be empty or in an unsupported format.')
          return
        }
        
        console.log('📤 Calling onUploadSuccess with uploaded resume data')
        console.log('📊 Data summary:', {
          name: result.data.name,
          sectionsCount: result.data.sections?.length || 0,
          hasEmail: !!result.data.email,
          hasPhone: !!result.data.phone
        })
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
      
      let baseUrl = process.env.NEXT_PUBLIC_API_BASE || config.apiBase
      baseUrl = baseUrl.replace(/\/$/, '')
      
      if (err instanceof Error && err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError(`Cannot connect to backend at ${baseUrl}. Please ensure the backend server is running on the correct port.`)
      } else if (err instanceof Error && err.name === 'TypeError' && err.message.includes('CORS')) {
        setError('CORS error: The server is not allowing requests from this domain.')
      } else {
        setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
      }
    } finally {
      setIsUploading(false)
      setIsScanning(false)
      setScanProgress(100)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (fileInputRef.current && !isUploading && !isScanning) {
      fileInputRef.current.click()
    }
  }

  const dropZone = (
    <div 
      className={`relative rounded-2xl border-2 border-dashed text-center transition-all duration-500 px-6 py-12 sm:px-8 sm:py-16 ${
        isDragging 
          ? 'border-primary-500 bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 scale-[1.01] shadow-2xl ring-4 ring-primary-200/50' 
          : isUploading
          ? 'border-primary-400 bg-gradient-to-br from-primary-50/80 to-purple-50/80'
          : 'border-slate-300 hover:border-primary-400 hover:bg-gradient-to-br hover:from-slate-50 hover:to-primary-50/30 hover:shadow-xl'
      } ${variant === 'page' ? 'bg-white/90 backdrop-blur-sm' : 'bg-white'}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="space-y-8">
        <div className="text-center space-y-5">
          <div className="relative inline-block">
            <div className={`transition-all duration-500 ${isUploading ? 'animate-bounce scale-110' : 'scale-100 hover:scale-110'}`}>
              {isUploading ? (
                <Zap className="w-20 h-20 text-primary-600" />
              ) : (
                <FileText className="w-20 h-20 text-primary-600" />
              )}
            </div>
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className={`${variant === 'page' ? 'text-2xl' : 'text-xl'} font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-blue-600 bg-clip-text text-transparent`}>
              {isUploading ? 'Processing Your Resume...' : isDragging ? 'Drop it here!' : 'Upload Your Resume'}
            </h3>
            <p className={`${isDragging ? 'text-primary-700 font-medium' : 'text-slate-600'} transition-colors`}>
              {isUploading 
                ? 'Extracting all the details with AI magic...' 
                : isDragging
                ? 'Release to upload'
                : 'Drag & drop your resume or click to browse'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            accept=".pdf,.docx,.doc"
            className="hidden"
            id="file-upload"
            disabled={isUploading || isScanning}
          />
          
          {/* Scanning Animation Overlay */}
          {isScanning && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl mx-4">
                {/* PDF Document Preview */}
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                  {/* PDF Header */}
                  <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white font-semibold text-sm truncate max-w-xs">{selectedFileName}</span>
                    </div>
                  </div>
                  
                  {/* PDF Content Area */}
                  <div className="relative bg-gray-50 p-8 min-h-[400px]">
                    {/* Scanning Line Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="scanning-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent shadow-lg"></div>
                    </div>
                    
                    {/* Document Content Preview */}
                    <div className="relative z-10 space-y-4">
                      {/* Title */}
                      <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      
                      {/* Lines */}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-4 bg-gray-200 rounded animate-pulse`}
                          style={{
                            width: `${Math.random() * 40 + 60}%`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scanning Status */}
                  <div className="bg-white border-t border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Scanning Document...</p>
                          <p className="text-xs text-gray-500">Extracting text and structure</p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-primary-600">
                        {Math.floor(scanProgress)}%
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-gray-100">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-blue-500 transition-all duration-300 ease-out relative overflow-hidden"
                        style={{ width: `${scanProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <label
            htmlFor="file-upload"
            onClick={handleLabelClick}
            className={`group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 via-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden ${
              isUploading || isScanning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="relative z-10">Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="relative z-10">Choose File</span>
              </>
            )}
          </label>

          {error && (
            <div className="p-5 bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border-2 border-red-200 rounded-xl shadow-lg text-left animate-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-red-700 block">{error}</span>
                  {error.includes('image-based') && (
                    <div className="mt-3 text-xs text-red-600 space-y-1">
                      <p className="font-semibold">This appears to be an image-based PDF. Try:</p>
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
        </div>
      </div>
    </div>
  )

  const featureList = (
    <div className={`flex items-center justify-center gap-6 flex-wrap text-xs ${variant === 'page' ? 'text-white/80 pt-4' : 'text-slate-500 pt-4'}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-slate-200/50">
        <span className={`${variant === 'page' ? 'text-primary-500' : 'text-primary-600'} font-bold`}>✓</span>
        <span className="font-medium">PDF & DOCX</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-slate-200/50">
        <span className={`${variant === 'page' ? 'text-primary-500' : 'text-primary-600'} font-bold`}>✓</span>
        <span className="font-medium">Auto-extract</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-slate-200/50">
        <span className={`${variant === 'page' ? 'text-primary-500' : 'text-primary-600'} font-bold`}>✓</span>
        <span className="font-medium">AI-powered</span>
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
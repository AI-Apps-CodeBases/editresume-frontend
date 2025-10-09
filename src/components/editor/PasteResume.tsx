'use client'
import { useState } from 'react'

interface Props {
  onPasteSuccess: (data: any) => void
}

export default function PasteResume({ onPasteSuccess }: Props) {
  const [text, setText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [charCount, setCharCount] = useState(0)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    setCharCount(newText.length)
    if (error) setError('')
  }

  const handleParse = async () => {
    if (!text.trim()) {
      setError('Please paste your resume text')
      return
    }

    setIsParsing(true)
    setError('')

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/parse-text`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        }
      )

      const result = await response.json()

      if (result.success) {
        onPasteSuccess(result.data)
      } else {
        setError(result.error || 'Parsing failed')
      }
    } catch (err) {
      setError('Parsing failed. Make sure backend is running.')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-white to-purple-50 rounded-3xl border-2 border-purple-200 p-8 shadow-xl">
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className={'absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-20 transition-all duration-1000' + (isParsing ? ' animate-pulse' : '')}></div>
        <div className={'absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-20 transition-all duration-1000' + (isParsing ? ' animate-pulse' : '')}></div>
      </div>

      <div className="relative space-y-6">
        <div className="text-center space-y-2">
          <div className={'inline-block text-6xl transition-all duration-500 ' + (isParsing ? 'animate-bounce' : 'scale-100')}>
            {isParsing ? '⚡' : '📋'}
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {isParsing ? 'Parsing Your Text...' : 'Paste Your Resume'}
          </h3>
          <p className="text-gray-600">
            {isParsing ? 'Extracting all the details with AI magic...' : 'Copy & paste your entire resume text here'}
          </p>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="John Doe&#10;Senior Software Engineer&#10;&#10;Email: john@example.com | Phone: (555) 123-4567&#10;&#10;Professional Summary&#10;Experienced software engineer...&#10;&#10;Work Experience&#10;• Led development of...&#10;• Improved performance by..."
            className="w-full h-80 px-5 py-4 border-2 border-purple-200 rounded-2xl resize-none text-sm font-mono bg-white/80 backdrop-blur-sm focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 shadow-inner"
            disabled={isParsing}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg">
            {charCount} characters
          </div>
        </div>

        {isParsing && (
          <div className="space-y-3">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">❌</span>
              <span className="text-sm font-semibold text-red-700">{error}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleParse}
          disabled={isParsing || !text.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isParsing ? 'Parsing...' : 'Parse Resume'}
        </button>

        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-2">
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Auto-extract sections</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Detect variables</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Parse contact info</span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'

import config from '@/lib/config';
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
        `${config.apiBase}/api/resume/parse-text`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        }
      )

      const result = await response.json()
      console.log('Parse response:', result)

      if (result.success) {
        console.log('Parse successful, calling onPasteSuccess with:', result.data)
        onPasteSuccess(result.data)
      } else {
        setError(result.error || 'Failed to parse resume')
      }
    } catch (err) {
      console.error('Parse error:', err)
      setError('Failed to parse resume. Please try again.')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-purple-200 p-8 shadow-xl">
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

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Paste your resume text here..."
                  className="w-full h-64 p-4 border-2 border-gray-200 rounded-2xl resize-none focus:border-purple-400 focus:outline-none transition-colors text-sm"
                  disabled={isParsing}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {charCount} characters
                </div>
              </div>

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
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'

interface Props {
  onPasteSuccess: (data: any) => void
}

export default function PasteResume({ onPasteSuccess }: Props) {
  const [text, setText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')

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
    <div className="bg-white rounded-2xl border p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">📋 Or Paste Your Resume Text</h3>
          <p className="text-sm text-gray-600 mt-1">
            Copy all text from your resume and paste it here
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your entire resume text here..."
          className="w-full h-64 px-4 py-3 border rounded-xl resize-none text-sm font-mono"
        />

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        <button
          onClick={handleParse}
          disabled={isParsing || !text.trim()}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isParsing ? 'Parsing...' : 'Parse Resume'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          We'll automatically extract sections, bullets & contact info
        </p>
      </div>
    </div>
  )
}


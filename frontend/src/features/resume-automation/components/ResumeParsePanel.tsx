"use client"

import { useState, type ChangeEvent } from 'react'

interface ResumeParsePanelProps {
  onParseResumeText?: (text: string) => Promise<number>
  onParseResumeFile?: (file: File) => Promise<number>
  onParsed: (resumeId: number) => void
}

export function ResumeParsePanel({
  onParseResumeText,
  onParseResumeFile,
  onParsed,
}: ResumeParsePanelProps) {
  const [resumeText, setResumeText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleParseText = async () => {
    if (!onParseResumeText || !resumeText.trim()) return
    setIsParsing(true)
    setParseError(null)
    try {
      const newId = await onParseResumeText(resumeText.trim())
      onParsed(newId)
      setResumeText('')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse resume text')
    } finally {
      setIsParsing(false)
    }
  }

  const handleParseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!onParseResumeFile || !event.target.files || event.target.files.length === 0) {
      return
    }
    const file = event.target.files[0]
    setIsUploading(true)
    setParseError(null)
    try {
      const newId = await onParseResumeFile(file)
      onParsed(newId)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse resume file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Add a new resume
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Parse & save
        </span>
      </div>
      <textarea
        className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        placeholder="Paste resume text to parse"
        value={resumeText}
        onChange={(event) => setResumeText(event.target.value)}
        disabled={isParsing || isUploading}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          We parse and save this resume so it can be tailored automatically.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleParseText}
            disabled={!resumeText.trim() || isParsing || isUploading || !onParseResumeText}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isParsing ? 'Parsing…' : 'Parse text'}
          </button>
          <label className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleParseFile}
              disabled={isUploading || isParsing || !onParseResumeFile}
            />
            {isUploading ? 'Uploading…' : 'Upload file'}
          </label>
        </div>
      </div>
      {parseError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {parseError}
        </div>
      )}
    </div>
  )
}


"use client"

import { useMemo, useState } from 'react'

import type { Job } from '@/features/jobs/types'
import type { ExtractedJobKeywords } from '../types'

interface JobManualEntryPanelProps {
  onCreateJob?: (payload: { title: string; company?: string; description: string; skills: string[] }) => Promise<Job>
  onExtractKeywords?: (description: string) => Promise<ExtractedJobKeywords>
  onSelect: (job: Job) => void
}

export function JobManualEntryPanel({
  onCreateJob,
  onExtractKeywords,
  onSelect,
}: JobManualEntryPanelProps) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const normalizedKeywords = useMemo(
    () => Array.from(new Set(keywords.map((skill) => skill.trim()).filter(Boolean))).slice(0, 15),
    [keywords]
  )

  const canSubmitManual = title.trim().length > 2 && description.trim().length > 40 && !!onCreateJob

  const handleExtract = async () => {
    if (!onExtractKeywords || description.trim().length < 40) {
      setLocalError('Paste at least 40 characters to scan keywords.')
      return
    }
    setIsExtracting(true)
    setLocalError(null)
    try {
      const result = await onExtractKeywords(description)
      const mergedKeywords = [
        ...(result.high_priority_keywords ?? []),
        ...(result.high_intensity_keywords ?? []),
        ...(result.technical_keywords ?? []),
        ...(result.soft_skills ?? []),
      ]
      setKeywords(mergedKeywords)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to extract keywords')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleCreateAndSelect = async () => {
    if (!canSubmitManual || !onCreateJob) return
    setIsSubmitting(true)
    setLocalError(null)
    try {
      const job = await onCreateJob({
        title: title.trim(),
        company: company.trim() || undefined,
        description: description.trim(),
        skills: normalizedKeywords,
      })
      onSelect(job)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save job')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Paste a new JD
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Keyword scan
        </span>
      </div>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        placeholder="Role title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={isSubmitting}
      />
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        placeholder="Company (optional)"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        disabled={isSubmitting}
      />
      <textarea
        className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        placeholder="Paste the full job description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        disabled={isSubmitting}
      />
      <div className="flex flex-wrap gap-2 text-xs">
        {normalizedKeywords.map((keyword) => (
          <span key={keyword} className="rounded-full bg-white px-3 py-1 font-medium text-indigo-700">
            {keyword}
          </span>
        ))}
        {normalizedKeywords.length === 0 && <span className="text-slate-500">Keywords will appear after scanning</span>}
      </div>
      {localError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {localError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">We use the keywords to compare against your resumes.</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || description.trim().length < 40}
            className="rounded-full border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {isExtracting ? 'Scanning…' : 'Scan keywords'}
          </button>
          <button
            type="button"
            onClick={handleCreateAndSelect}
            disabled={!canSubmitManual || isSubmitting}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isSubmitting ? 'Saving…' : 'Continue with this JD'}
          </button>
        </div>
      </div>
    </div>
  )
}


"use client"

import { useEffect, useMemo, useState } from 'react'

import { ResumeParsePanel } from './ResumeParsePanel'

interface ResumeOption {
  id: number
  name: string
  title?: string | null
  updated_at?: string | null
  summary?: string | null
}

interface ResumeSelectionModalProps {
  resumes: ResumeOption[]
  isOpen: boolean
  loading?: boolean
  error?: string | null
  maxSelectable?: number
  initialSelectedIds?: number[]
  onClose: () => void
  onConfirm: (selected: number[]) => void
  onRefresh?: () => void
  onUploadResume?: () => void
  allowParsing?: boolean
  onParseResumeText?: (text: string) => Promise<number>
  onParseResumeFile?: (file: File) => Promise<number>
}

export function ResumeSelectionModal({
  resumes,
  isOpen,
  loading = false,
  error = null,
  maxSelectable = 3,
  initialSelectedIds: initialSelectedIdsProp,
  onClose,
  onConfirm,
  onRefresh,
  onUploadResume,
  allowParsing = false,
  onParseResumeText,
  onParseResumeFile,
}: ResumeSelectionModalProps) {
  const normalizedInitialIds = useMemo<number[]>(
    () => (initialSelectedIdsProp ? initialSelectedIdsProp.map((id) => Number(id)) : []),
    [initialSelectedIdsProp]
  )
  const [selectedIds, setSelectedIds] = useState<number[]>(normalizedInitialIds)

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(normalizedInitialIds)
    }
  }, [isOpen, normalizedInitialIds])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const toggleSelection = (resumeId: number) => {
    const key = Number(resumeId)
    setSelectedIds((prev) => {
      if (prev.includes(key)) {
        return prev.filter((id) => id !== key)
      }
      if (prev.length >= maxSelectable) {
        return prev
      }
      return [...prev, key]
    })
  }

  const addParsedResume = (resumeId: number) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, resumeId])).slice(0, maxSelectable))
  }

  const remainingSlots = useMemo(() => Math.max(maxSelectable - selectedIds.length, 0), [maxSelectable, selectedIds.length])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Step 2</p>
            <h2 className="text-lg font-semibold text-slate-900">Select or add resumes</h2>
            <p className="text-sm text-slate-500">Pick up to {maxSelectable} resumes. We’ll blend the best parts from each.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close resume selection modal"
          >
            ✕
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Saved resumes</h3>
              {onRefresh && (
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                  type="button"
                  onClick={onRefresh}
                >
                  Refresh
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-500">
                Loading resumes…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">{error}</div>
            ) : resumes.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-700">No saved resumes found</h3>
                <p className="mt-2 text-sm text-slate-500">Save a resume in the editor or paste one to use it immediately.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {resumes.map((resume) => {
                  const resumeId = Number(resume.id)
                  const selected = selectedIds.includes(resumeId)
                  return (
                    <li key={resume.id}>
                      <button
                        type="button"
                        onClick={() => toggleSelection(resumeId)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          selected
                            ? 'border-indigo-300 bg-indigo-50/60'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                {selected ? 'Selected' : remainingSlots === 0 ? 'Max selected' : 'Tap to select'}
                              </span>
                              <h3 className="text-base font-semibold text-slate-900">{resume.name}</h3>
                            </div>
                            {resume.title && <p className="mt-1 text-sm text-slate-500">{resume.title}</p>}
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            {resume.updated_at ? `Updated ${new Date(resume.updated_at).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                        {resume.summary && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{resume.summary}</p>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {allowParsing && (
            <ResumeParsePanel
              onParseResumeText={onParseResumeText}
              onParseResumeFile={onParseResumeFile}
              onParsed={addParsedResume}
            />
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-400">Select at least one resume to continue</div>
          <div className="flex items-center gap-3">
            {onUploadResume && (
              <button
                type="button"
                onClick={onUploadResume}
                className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                Upload in editor
              </button>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Refresh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedIds)}
              disabled={selectedIds.length === 0}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Continue
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

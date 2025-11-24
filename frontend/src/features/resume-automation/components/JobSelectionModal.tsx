"use client"

import { useEffect } from 'react'

import type { Job } from '@/features/jobs/types'

interface JobSelectionModalProps {
  jobs: Job[]
  isOpen: boolean
  loading?: boolean
  error?: string | null
  onClose: () => void
  onSelect: (job: Job) => void
  onRefresh?: () => void
  onAddJob?: () => void
}

export function JobSelectionModal({
  jobs,
  isOpen,
  loading = false,
  error = null,
  onClose,
  onSelect,
  onRefresh,
  onAddJob,
}: JobSelectionModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Step 1
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Choose the target job
            </h2>
            <p className="text-sm text-slate-500">
              We’ll tailor your resumes to match this description
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close job selection modal"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              Loading saved jobs…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <h3 className="text-lg font-semibold text-slate-700">
                No saved jobs yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Capture a job description from LinkedIn or paste one manually to
                begin.
              </p>
              {onRefresh && (
                <button
                  className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                  type="button"
                  onClick={onRefresh}
                >
                  Refresh
                </button>
              )}
              {onAddJob && (
                <button
                  className="mt-3 rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  type="button"
                  onClick={onAddJob}
                >
                  Parse a new job description
                </button>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(job)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {job.title}
                        </h3>
                        {job.company && (
                          <p className="text-sm text-slate-500">{job.company}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                        Saved {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {job.description}
                    </p>
                    {job.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.skills.slice(0, 6).map((skill) => (
                          <span
                            key={`${job.id}-${skill}`}
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-400">
            You can save jobs through the browser extension or dashboard.
          </div>
          <div className="flex items-center gap-3">
            {onAddJob && (
              <button
                type="button"
                onClick={onAddJob}
                className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                Parse new job
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
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}


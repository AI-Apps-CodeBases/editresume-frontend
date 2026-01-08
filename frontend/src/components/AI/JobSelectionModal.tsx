"use client"

import { useEffect } from 'react'
import { useSavedJobs } from '@/features/jobs/hooks/useSavedJobs'
import { JobCard } from '@/features/jobs/components/JobCard'
import type { Job } from '@/features/jobs/types'

interface JobSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (jobId: number) => void
}

export function JobSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: JobSelectionModalProps) {
  const { jobs, loading, error, refresh } = useSavedJobs()

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      refresh()
    }
  }, [isOpen, refresh])

  const handleJobSelect = (job: Job) => {
    onSelect(job.id)
    onClose()
  }

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
            <h2 className="text-lg font-semibold text-slate-900">Browse Saved Jobs</h2>
            <p className="text-sm text-slate-500">Select a job description to compare with your resume</p>
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
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-500">
              Loading saved jobs…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <h3 className="text-lg font-semibold text-slate-700">No saved jobs yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Save job descriptions from LinkedIn or paste them manually to start comparing with your resume.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={handleJobSelect}
                  actionLabel="Select"
                />
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-400">
            Select a job to load it in the editor for comparison
          </div>
          <div className="flex items-center gap-3">
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


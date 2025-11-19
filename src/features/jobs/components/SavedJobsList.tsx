"use client"

import type { Job } from '../types'
import { JobCard } from './JobCard'

interface SavedJobsListProps {
  jobs: Job[]
  loading?: boolean
  error?: string | null
  onSelect?: (job: Job) => void
  onDelete?: (job: Job) => void
  selectedJobId?: number | null
}

export function SavedJobsList({
  jobs,
  loading = false,
  error = null,
  onSelect,
  onDelete,
  selectedJobId = null,
}: SavedJobsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-50 py-16">
        <div className="text-sm font-medium text-slate-500">Loading saved jobs…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-700">No saved jobs yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          Collect job descriptions from LinkedIn or paste them manually to start building a personalised library.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          selected={selectedJobId === job.id}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}









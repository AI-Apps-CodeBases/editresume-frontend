"use client"

import { memo } from 'react'
import type { Job } from '../types'

interface JobCardProps {
  job: Job
  onSelect?: (job: Job) => void
  onDelete?: (job: Job) => void
  selected?: boolean
  actionLabel?: string
}

function formatDate(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleDateString()
  } catch {
    return timestamp
  }
}

function JobCardComponent({
  job,
  onSelect,
  onDelete,
  selected = false,
  actionLabel = 'Use Job',
}: JobCardProps) {
  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border border-border-subtle bg-white p-6 shadow-sm transition hover:border-border-strong ${selected ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
          {job.company && <p className="text-sm text-slate-500">{job.company}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Saved {formatDate(job.created_at)}
        </span>
      </div>
      <p className="line-clamp-3 text-sm text-slate-600">{job.description}</p>
      {job.skills.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-xs text-indigo-600">
          {job.skills.slice(0, 8).map((skill) => (
            <li
              key={`${job.id}-${skill}`}
              className="rounded-full bg-indigo-50 px-2 py-1"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View Posting →
          </a>
        )}
        <div className="ml-auto flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600"
            >
              Remove
            </button>
          )}
          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(job)}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export const JobCard = memo(JobCardComponent)










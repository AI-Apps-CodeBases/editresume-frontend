"use client"

import type { GenerationStatusStep } from '../types'

interface GenerationProgressProps {
  steps: GenerationStatusStep[]
}

const stateIcon: Record<GenerationStatusStep['state'], string> = {
  pending: '⏳',
  active: '✨',
  complete: '✅',
}

export function GenerationProgress({ steps }: GenerationProgressProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">
        Building your optimized resume
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        We blend your strongest achievements with the job requirements and run a
        full ATS analysis.
      </p>

      <ol className="mt-6 space-y-4">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-4 rounded-2xl border p-4 ${
              step.state === 'complete'
                ? 'border-emerald-200 bg-emerald-50/40'
                : step.state === 'active'
                ? 'border-indigo-200 bg-indigo-50/40'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">
              {stateIcon[step.state]}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{step.label}</p>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}








"use client"

import { useATSAnalysis } from '../hooks/useATSAnalysis'
import type { ATSScore } from '../types'

interface ATSScoreCardProps {
  score: ATSScore | null
}

export function ATSScoreCard({ score }: ATSScoreCardProps) {
  const analysis = useATSAnalysis(score)

  if (!analysis.score) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        ATS insights will appear after generation.
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            ATS Score
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            {Math.round(analysis.score.overall_score)} / 100
          </h3>
          <p
            className={`mt-1 text-sm font-medium ${analysis.summary?.color ?? ''}`}
          >
            {analysis.summary?.label}
          </p>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold ${analysis.summary?.background ?? ''} ${analysis.summary?.color ?? ''}`}
        >
          {Math.round(analysis.score.overall_score)}
        </div>
      </div>

      <dl className="mt-6 space-y-3">
        {analysis.metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div>
              <dt className="text-sm font-medium text-slate-700">{metric.label}</dt>
              <dd className={`text-xs ${metric.color}`}>{metric.value.toFixed(0)}%</dd>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${metric.background} ${metric.color}`}
            >
              {metric.bucket.toUpperCase()}
            </div>
          </div>
        ))}
      </dl>

      {analysis.suggestions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-yellow-100 bg-yellow-50/70 p-4">
          <p className="text-sm font-semibold text-yellow-700">
            Suggested improvements
          </p>
          <ul className="mt-2 space-y-1 text-xs text-yellow-700">
            {analysis.suggestions.slice(0, 4).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}





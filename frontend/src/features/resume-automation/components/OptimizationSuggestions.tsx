"use client"

import { useOptimizationSuggestions } from '../hooks/useOptimizationSuggestions'
import type { AutoGenerateResponse } from '../types'

interface OptimizationSuggestionsProps {
  result: AutoGenerateResponse | null
}

export function OptimizationSuggestions({ result }: OptimizationSuggestionsProps) {
  const data = useOptimizationSuggestions(result)

  if (!result) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Run automation to see tailored optimization opportunities.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-emerald-700">
          Matched strengths
        </h3>
        {data.matchedSkills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-700">
            {data.matchedSkills.map((skill) => (
              <li
                key={`matched-${skill}`}
                className="rounded-full bg-white/80 px-3 py-1 font-medium shadow-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-emerald-700">
            We highlighted key experiences that match this job.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-700">
          Quick wins to add
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-indigo-700">
          {data.recommendations.slice(0, 4).map((item) => (
            <li key={`recommendation-${item}`} className="rounded-xl bg-white/90 px-3 py-2 shadow-sm">
              {item}
            </li>
          ))}
          {data.recommendations.length === 0 && (
            <li className="rounded-xl bg-white/90 px-3 py-2 shadow-sm">
              Tailor a few bullet points to showcase comparable wins from your experience.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-rose-700">
          Skills still missing
        </h3>
        {data.missingSkills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-rose-700">
            {data.missingSkills.map((skill) => (
              <li
                key={`missing-${skill}`}
                className="rounded-full bg-white/80 px-3 py-1 font-medium shadow-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-rose-600">
            Great coverage—the role’s key skills are already represented.
          </p>
        )}
      </section>
    </div>
  )
}










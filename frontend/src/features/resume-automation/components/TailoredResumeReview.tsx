"use client"

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import type {
  ATSScore,
  AutoGenerateResponse,
  GeneratedVersion,
} from '../types'
import { ATSScoreCard } from './ATSScoreCard'
import { OptimizationSuggestions } from './OptimizationSuggestions'
import { DevelopmentTooltip } from './DevelopmentTooltip'

interface TailoredResumeReviewProps {
  result: AutoGenerateResponse
  onOpenEditor: () => void
  onBack: () => void
}

export function TailoredResumeReview({
  result,
  onOpenEditor,
  onBack,
}: TailoredResumeReviewProps) {
  const router = useRouter()
  const resumeData = result.version.resume_data as {
    name?: string
    title?: string
    summary?: string
    sections?: Array<{
      title: string
      bullets?: Array<{ text: string }>
    }>
  }

  const experienceSections = useMemo(() => {
    return (resumeData.sections || []).filter((section) => {
      const titleLower = (section.title || '').toLowerCase()
      return ['experience', 'work', 'employment', 'professional'].some(
        (term) => titleLower.includes(term)
      )
    })
  }, [resumeData.sections])

  const otherSections = useMemo(() => {
    return (resumeData.sections || []).filter((section) => {
      const titleLower = (section.title || '').toLowerCase()
      return !['experience', 'work', 'employment', 'professional', 'skill'].some(
        (term) => titleLower.includes(term)
      )
    })
  }, [resumeData.sections])

  const skillsSection = useMemo(() => {
    return (resumeData.sections || []).find((section) => {
      const titleLower = (section.title || '').toLowerCase()
      return titleLower.includes('skill')
    })
  }, [resumeData.sections])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tailored Resume Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your optimized resume before saving or editing
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
        >
          ← Back
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {resumeData.name || 'Tailored Resume'}
            </h2>
            {resumeData.title && (
              <p className="text-sm text-slate-600 mb-6">{resumeData.title}</p>
            )}

            {resumeData.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Professional Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {resumeData.summary}
                </p>
              </div>
            )}

            {experienceSections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  Work Experience ({experienceSections.length} {experienceSections.length === 1 ? 'role' : 'roles'})
                </h3>
                <div className="space-y-4">
                  {experienceSections.map((section, idx) => (
                    <div key={idx} className="border-l-2 border-indigo-200 pl-4">
                      <h4 className="font-semibold text-slate-900 mb-2">
                        {section.title}
                      </h4>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-1 text-sm text-slate-700">
                          {section.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              <span>{bullet.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {skillsSection && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  {skillsSection.title}
                </h3>
                {skillsSection.bullets && skillsSection.bullets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skillsSection.bullets.map((bullet, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {bullet.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {otherSections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  Additional Sections
                </h3>
                <div className="space-y-4">
                  {otherSections.map((section, idx) => (
                    <div key={idx}>
                      <h4 className="font-semibold text-slate-900 mb-2">
                        {section.title}
                      </h4>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-1 text-sm text-slate-700">
                          {section.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              <span>{bullet.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ATSScoreCard score={result.ats_score} />
          <OptimizationSuggestions result={result} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="text-sm text-slate-500">
          Review your tailored resume. All sections have been preserved and enhanced with JD keywords.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
          >
            Cancel
          </button>
          <DevelopmentTooltip message="This feature is currently under development. The editor integration is being enhanced to support full tailored resume editing. Coming soon!">
            <button
              type="button"
              onClick={onOpenEditor}
              className="relative rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Edit in Builder
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" title="Under Development">
                ⚠
              </span>
            </button>
          </DevelopmentTooltip>
        </div>
      </div>
    </div>
  )
}


"use client"

import type {
  ATSScore,
  GeneratedResume,
  GenerationInsights,
} from '../types'

interface GeneratedResumePreviewProps {
  resume: GeneratedResume
  atsScore: ATSScore | null
  insights?: GenerationInsights | null
  onOpenEditor?: () => void
}

export function GeneratedResumePreview({
  resume,
  atsScore,
  insights,
  onOpenEditor,
}: GeneratedResumePreviewProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          Draft Ready
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          {resume.title || 'Optimized Resume'}
        </h2>
        {resume.name && (
          <p className="text-sm text-slate-500">Prepared for {resume.name}</p>
        )}
      </header>

      <div className="space-y-6 px-6 py-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">What’s included</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Targeted summary aligned to the job</li>
            <li>Curated achievement bullets from your top resumes</li>
            <li>Updated skills section with role-specific keywords</li>
          </ul>
        </div>

        {insights?.match && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-sm font-semibold text-indigo-700">
              Why this version works
            </p>
            <p className="mt-1 text-xs text-indigo-600">
              Matched {insights.match.matched_skills.length} skills, covering{' '}
              {insights.job?.title ?? 'target role'} requirements.
            </p>
            {insights.match.recommendations.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-indigo-700">
                {insights.match.recommendations.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {atsScore && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                ATS Score
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {Math.round(atsScore.overall_score)}
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Keyword match: {Math.round(atsScore.keyword_match)}% <br />
              Experience relevance: {Math.round(atsScore.experience_relevance)}%{' '}
              <br />
              Skills coverage: {Math.round(atsScore.skills_coverage)}%
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-xs text-slate-500">
          Resume saved as draft. Open in the editor to fine-tune sections,
          adjust template, and re-run optimizations.
        </div>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
        <div className="text-xs text-slate-400">
          Draft saved{' '}
          {resume.created_at
            ? new Date(resume.created_at).toLocaleTimeString()
            : 'just now'}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('Edit button clicked', { onOpenEditor: !!onOpenEditor, hasCallback: typeof onOpenEditor === 'function' })
            if (onOpenEditor && typeof onOpenEditor === 'function') {
              try {
                onOpenEditor()
              } catch (error) {
                console.error('Error calling onOpenEditor:', error)
                alert(`Failed to open editor: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            } else {
              console.error('onOpenEditor callback is not provided or is not a function', { onOpenEditor })
              alert('Editor navigation is not available. Please refresh the page and try again.')
            }
          }}
          disabled={!onOpenEditor}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit in Builder
        </button>
      </footer>
    </div>
  )
}


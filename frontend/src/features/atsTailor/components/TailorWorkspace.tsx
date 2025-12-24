'use client'

import { useMemo, useState } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import { useTailorResume } from '../hooks/useTailorResume'
import type { ResumeData, TailorChangeOp, TailorOptions, TailorResumeResponse } from '../types/tailorResume'
import { applyTailorChangeList } from '../utils/applyChangeList'

const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-400'
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

const getScoreRing = (score: number | null) => {
  if (score === null) return { strokeClass: 'text-gray-300', safeScore: 0 }
  const safeScore = Math.max(0, Math.min(100, score))
  let strokeClass = 'text-green-500'
  if (safeScore < 60) strokeClass = 'text-red-500'
  else if (safeScore < 80) strokeClass = 'text-yellow-500'
  return { strokeClass, safeScore }
}

const ATSScoreGauge = ({ score, label }: { score: number | null; label: string }) => {
  const { strokeClass, safeScore } = getScoreRing(score)
  const color = getScoreColor(score)
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex h-20 w-20 items-center justify-center">
        <svg viewBox="0 0 36 36" className="h-20 w-20 transform -rotate-90">
          <path
            className="text-gray-200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
          />
          {score !== null && (
            <path
              className={strokeClass}
              strokeLinecap="round"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${safeScore}, 100`}
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>
            {score !== null ? Math.round(score) : '--'}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            %
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs font-medium text-slate-600">{label}</span>
    </div>
  )
}

type ResumeTemplate =
  | 'clean'
  | 'two-column'
  | 'compact'
  | 'minimal'
  | 'modern'
  | 'tech'
  | 'modern-one'
  | 'classic-one'
  | 'minimal-one'
  | 'executive-one'
  | 'classic'
  | 'creative'
  | 'ats-friendly'
  | 'executive'

type Props = {
  baseResume: ResumeData
  baseTemplate: ResumeTemplate
  jobDescription: string
  jobDescriptionId?: number
  onOpenEditor: (payload: { resume: ResumeData; template: ResumeTemplate; jobDescription: string; jobDescriptionId?: number }) => void
  tailorOverride?: (input: { resumeData: ResumeData; jobDescription: string; options?: TailorOptions }) => Promise<TailorResumeResponse>
}

const formatOpTitle = (op: TailorChangeOp): string => {
  switch (op.op) {
    case 'update_title':
      return 'Update title'
    case 'update_summary':
      return 'Update summary'
    case 'update_bullet':
      return 'Rewrite bullet'
    case 'add_bullet_after':
      return 'Add bullet'
    case 'add_skill':
      return 'Add skill'
    default: {
      const neverOp: never = op
      return String(neverOp)
    }
  }
}

export default function TailorWorkspace({
  baseResume,
  baseTemplate,
  jobDescription,
  jobDescriptionId,
  onOpenEditor,
  tailorOverride,
}: Props) {
  const { state, run } = useTailorResume()
  const [overrideData, setOverrideData] = useState<TailorResumeResponse | null>(null)
  const [tone, setTone] = useState<TailorOptions['tone']>('professional')
  const [maxNewBullets, setMaxNewBullets] = useState<number>(6)
  const [selectedOpIds, setSelectedOpIds] = useState<Set<number>>(new Set())

  const tailorData = overrideData ?? (state.status === 'success' ? state.data : null)

  const effectiveOps = useMemo(() => {
    if (!tailorData) return []
    return tailorData.change_list.filter((_, idx) => selectedOpIds.has(idx))
  }, [tailorData, selectedOpIds])

  const mergedResume = useMemo(() => {
    if (!tailorData) return null
    return applyTailorChangeList(baseResume, effectiveOps).resume
  }, [tailorData, baseResume, effectiveOps])

  const optimizedResume = tailorData?.optimized_resume_data ?? null

  const runTailor = async () => {
    const options: TailorOptions = { tone, allowNewBullets: true, maxNewBullets }
    const data = tailorOverride
      ? await tailorOverride({ resumeData: baseResume, jobDescription, options })
      : await run({ resumeData: baseResume, jobDescription, options })

    if (tailorOverride) {
      setOverrideData(data)
    }

    setSelectedOpIds(new Set(data.change_list.map((_, idx) => idx)))
  }

  const toggleOp = (idx: number) => {
    setSelectedOpIds((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const beforeScore = tailorData?.ats_preview?.beforeScore ?? null
  const afterScore = tailorData?.ats_preview?.afterScore ?? null
  const scoreChange = (beforeScore !== null && afterScore !== null) ? (afterScore - beforeScore) : null

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-primary-50/20">
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Tailor Resume to Job</h1>
              <p className="text-xs text-slate-600">Generate an optimized copy and pick which changes to carry into the editor.</p>
            </div>
            {(beforeScore !== null || afterScore !== null) && (
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <ATSScoreGauge score={beforeScore} label="Before" />
                {scoreChange !== null && (
                  <div className="flex flex-col items-center px-2">
                    <div className={`text-lg font-bold ${scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreChange >= 0 ? '↑' : '↓'} {scoreChange >= 0 ? '+' : ''}{Math.round(scoreChange)}%
                    </div>
                    <span className="text-[10px] text-slate-500">Change</span>
                  </div>
                )}
                <ATSScoreGauge score={afterScore} label="After" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-slate-600">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as TailorOptions['tone'])}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
            >
              <option value="professional">Professional</option>
              <option value="concise">Concise</option>
              <option value="friendly">Friendly</option>
            </select>
            <label className="text-xs text-slate-600 ml-2">Max new bullets</label>
            <input
              type="number"
              min={0}
              max={20}
              value={maxNewBullets}
              onChange={(e) => setMaxNewBullets(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
            />
            <button
              onClick={runTailor}
              disabled={state.status === 'loading' || !jobDescription.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {state.status === 'loading' ? 'Generating…' : 'Generate optimized copy'}
            </button>
            <button
              onClick={() => {
                if (!mergedResume) return
                onOpenEditor({
                  resume: mergedResume,
                  template: baseTemplate,
                  jobDescription,
                  jobDescriptionId,
                })
              }}
              disabled={!mergedResume}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Open editor with selected changes
            </button>
          </div>
        </div>

        {state.status === 'error' && (
          <div className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {tailorData?.warnings?.length ? (
          <div className="px-4 py-2 rounded-lg border border-amber-200 bg-amber-50">
            <div className="text-sm font-semibold text-amber-800">Warnings</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-700 space-y-1">
              {tailorData.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex-1 grid grid-cols-1 gap-4 lg:grid-cols-3 p-4 pb-8">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="text-sm font-bold text-slate-900">Original Resume</div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{baseTemplate}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/30 custom-scrollbar">
              <div className="p-2">
                <PreviewPanel data={baseResume} replacements={{}} template={baseTemplate} constrained />
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="text-sm font-bold text-slate-900">Job Description</div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-blue-50/20 p-4 custom-scrollbar">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">{jobDescription}</pre>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
              <div className="text-sm font-bold text-slate-900">Optimized Resume</div>
            </div>

            <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden min-h-0">
              <div className="flex-shrink-0 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">Suggested Changes</div>
                  {tailorData ? (
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                        onClick={() => setSelectedOpIds(new Set(tailorData.change_list.map((_, i) => i)))}
                      >
                        Select all
                      </button>
                      <button 
                        className="text-xs font-medium text-slate-600 hover:text-slate-700 hover:underline px-2 py-1 rounded hover:bg-slate-100"
                        onClick={() => setSelectedOpIds(new Set())}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                {!tailorData ? (
                  <div className="text-xs text-slate-500 text-center py-4">Generate an optimized copy to see suggested changes.</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {tailorData.change_list.map((op, idx) => (
                      <label
                        key={`${op.op}-${idx}`}
                        className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2.5 cursor-pointer hover:bg-blue-50/70 hover:border-blue-300 transition-all"
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedOpIds.has(idx)} 
                          onChange={() => toggleOp(idx)} 
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900">{formatOpTitle(op)}</div>
                          <div className="text-xs text-slate-600 break-words mt-1 leading-relaxed">
                            {op.op === 'add_skill'
                              ? op.keyword
                              : op.op === 'add_bullet_after'
                                ? op.bullet.text
                                : op.op === 'update_bullet'
                                  ? op.nextText
                                  : op.op === 'update_title'
                                    ? op.next
                                    : op.op === 'update_summary'
                                      ? op.next
                                      : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto rounded-lg border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/30 shadow-inner custom-scrollbar">
                <div className="p-2">
                  {mergedResume ? (
                    <PreviewPanel data={mergedResume} replacements={{}} template={baseTemplate} constrained />
                  ) : optimizedResume ? (
                    <PreviewPanel data={optimizedResume} replacements={{}} template={baseTemplate} constrained />
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-sm font-medium">No optimized resume yet.</div>
                      <div className="text-xs mt-1">Click "Generate optimized copy" to get started</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



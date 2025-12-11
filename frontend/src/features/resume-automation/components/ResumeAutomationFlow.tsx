"use client"

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { SavedJobsList } from '@/features/jobs/components/SavedJobsList'
import { AutoGenerateButton } from './AutoGenerateButton'
import { JobSelectionModal } from './JobSelectionModal'
import { ResumeSelectionModal } from './ResumeSelectionModal'
import { GenerationProgress } from './GenerationProgress'
import { GeneratedResumePreview } from './GeneratedResumePreview'
import { ATSScoreCard } from './ATSScoreCard'
import { OptimizationSuggestions } from './OptimizationSuggestions'
import { useTailorAutomationState } from '../hooks/useTailorAutomationState'

interface ResumeAutomationFlowProps {
  openSignal?: number
  hideJobList?: boolean
  hideHeader?: boolean
}

export function ResumeAutomationFlow({
  openSignal,
  hideJobList = false,
  hideHeader = false,
}: ResumeAutomationFlowProps) {
  const router = useRouter()
  const {
    stage,
    jobModalOpen,
    resumeModalOpen,
    selectedJob,
    selectedJobTitle,
    selectedJobDescription,
    resumeOptions,
    resumeLoading,
    resumeError,
    generationResult,
    jobs,
    jobsLoading,
    jobsError,
    openJobModal,
    setJobModalOpen,
    setResumeModalOpen,
    loadResumes,
    refreshJobs,
    handleCreateJob,
    handleExtractKeywords,
    handleJobSelected,
    handleResumeConfirm,
    handleOpenEditor,
    handleParseResumeText,
    handleParseResumeFile,
    handleRequestResumeUpload,
    handleRequestJobParse,
    generation,
  } = useTailorAutomationState({ openSignal, router })

  const summaryCard = useMemo(() => {
    if (!generationResult) return null
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <GeneratedResumePreview
          resume={generationResult.resume}
          atsScore={generationResult.ats_score}
          insights={generationResult.insights}
          onOpenEditor={handleOpenEditor}
        />
        <div className="space-y-6">
          <ATSScoreCard score={generationResult.ats_score} />
          <OptimizationSuggestions result={generationResult} />
        </div>
      </div>
    )
  }, [generationResult, handleOpenEditor])

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Automation
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Tailor your resume to a JD
            </h2>
            <p className="text-sm text-slate-500">
              Compare JD keywords, patch gaps, and boost ATS before exporting or editing further.
            </p>
          </div>
          <AutoGenerateButton onClick={openJobModal} />
        </div>
      )}

      {stage === 'progress' && <GenerationProgress steps={generation.steps} />}

      {stage === 'completed' && summaryCard}

      {stage === 'idle' && generation.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {generation.error}
        </div>
      )}

      {stage === 'idle' && !generationResult && !hideJobList && (
        <div>
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
              Saved jobs
            </h3>
            <button
              type="button"
              onClick={refreshJobs}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Refresh
            </button>
          </header>
          <SavedJobsList
            jobs={jobs}
            loading={jobsLoading}
            error={jobsError}
            onSelect={(job) => handleJobSelected(job)}
          />
        </div>
      )}

      <JobSelectionModal
        jobs={jobs}
        isOpen={jobModalOpen}
        loading={jobsLoading}
        error={jobsError || null}
        onClose={() => setJobModalOpen(false)}
        onSelect={handleJobSelected}
        onRefresh={refreshJobs}
        onAddJob={handleRequestJobParse}
        allowManualEntry
        onCreateJob={handleCreateJob}
        onExtractKeywords={handleExtractKeywords}
      />

      <ResumeSelectionModal
        resumes={resumeOptions}
        isOpen={resumeModalOpen}
        loading={resumeLoading}
        error={resumeError}
        onClose={() => setResumeModalOpen(false)}
        onConfirm={handleResumeConfirm}
        onRefresh={loadResumes}
        onUploadResume={handleRequestResumeUpload}
        allowParsing
        onParseResumeText={handleParseResumeText}
        onParseResumeFile={handleParseResumeFile}
      />

      {selectedJob && stage !== 'completed' && (
        <div className="text-xs text-slate-400">
          Target job: {selectedJobTitle}
          {selectedJobDescription ? ' — keywords loaded for tailoring' : ''}
        </div>
      )}
    </div>
  )
}

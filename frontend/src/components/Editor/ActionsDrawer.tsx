'use client'
import React from 'react'
import AIWizard from '@/components/AI/AIWizard'
import CoverLetterGenerator from '@/components/AI/CoverLetterGenerator'
import ShareResumeModal from '@/components/Resume/ShareResumeModal'
import VersionControlPanel from '@/components/Resume/VersionControlPanel'
import ExportAnalyticsDashboard from '@/components/Resume/ExportAnalyticsDashboard'
import JobMatchAnalyticsDashboard from '@/components/AI/JobMatchAnalyticsDashboard'

type ActionId =
  | 'ai-wizard'
  | 'cover-letter'
  | 'version-control'
  | 'share'
  | 'export-analytics'
  | 'job-match-analytics'

interface ActionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeAction: ActionId
  onActionChange: (action: ActionId) => void
  resumeData: any
  currentResumeId: number | null
  aiWizardContext: any
  onAddContent: (content: any) => void
  onCoverLetterChange: (letter: string | null) => void
  onVersionLoad: (data: any) => void
  onVersionSave: (changeSummary: string) => void
  onCompareVersions: (version1Id: number, version2Id: number) => void
  onNewResume?: () => void
  onUploadResume?: () => void
  onSaveResume?: () => void
  onExport?: (format: 'pdf' | 'docx' | 'cover-letter') => void
  isExporting?: boolean
  hasCoverLetter?: boolean
  hasResumeName?: boolean
  isAuthenticated?: boolean
}

const actionItems: Array<{
  id: ActionId
  label: string
  description: string
}> = [
  { id: 'ai-wizard', label: 'AI Wizard', description: 'Generate or improve content' },
  { id: 'cover-letter', label: 'Cover Letter', description: 'Draft or edit cover letters' },
  { id: 'version-control', label: 'Version History', description: 'Save and compare versions' },
  { id: 'share', label: 'Share', description: 'Create shareable links' },
  { id: 'export-analytics', label: 'Export Analytics', description: 'Track export history' },
  { id: 'job-match-analytics', label: 'Match Analytics', description: 'View match insights' },
]

export default function ActionsDrawer({
  isOpen,
  onClose,
  activeAction,
  onActionChange,
  resumeData,
  currentResumeId,
  aiWizardContext,
  onAddContent,
  onCoverLetterChange,
  onVersionLoad,
  onVersionSave,
  onCompareVersions,
  onNewResume,
  onUploadResume,
  onSaveResume,
  onExport,
  isExporting = false,
  hasCoverLetter = false,
  hasResumeName = false,
  isAuthenticated = false,
}: ActionsDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[92vw] max-w-3xl bg-white shadow-[0_12px_48px_rgba(15,23,42,0.15)]">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-transparent">
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-text-primary">Actions</h2>
              <span className="text-xs text-text-muted">Tools and workflow shortcuts</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-primary-50/50 rounded-lg touch-target transition-all duration-200"
              aria-label="Close actions drawer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-b border-border-subtle px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {onNewResume && (
                <button
                  onClick={() => {
                    onNewResume()
                    onClose()
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                >
                  New Resume
                </button>
              )}
              {onUploadResume && (
                <button
                  onClick={() => {
                    onUploadResume()
                    onClose()
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                >
                  Upload Resume
                </button>
              )}
              {onSaveResume && isAuthenticated && (
                <button
                  onClick={onSaveResume}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 transition-all"
                >
                  Save
                </button>
              )}
              {onExport && (
                <>
                  <button
                    onClick={() => onExport('pdf')}
                    disabled={!hasResumeName || isExporting}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-all"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => onExport('docx')}
                    disabled={!hasResumeName || isExporting}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 disabled:opacity-50 transition-all"
                  >
                    Export DOCX
                  </button>
                  <button
                    onClick={() => onExport('cover-letter')}
                    disabled={!hasCoverLetter || isExporting}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle text-text-secondary hover:bg-primary-50/60 disabled:opacity-50 transition-all"
                  >
                    Export Cover Letter
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-border-subtle px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onActionChange(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeAction === item.id
                      ? 'bg-primary-600 text-white'
                      : 'border border-border-subtle text-text-secondary hover:bg-primary-50/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-text-muted mt-2">
              {actionItems.find((item) => item.id === activeAction)?.description}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeAction === 'ai-wizard' && (
              <div className="bg-white rounded-xl border border-border-subtle">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">AI Content Wizard</h3>
                  <p className="text-xs text-text-muted">Generate new bullets, projects, skills, or education.</p>
                </div>
                <div className="p-4">
                  <AIWizard
                    resumeData={resumeData}
                    onClose={() => {}}
                    context={aiWizardContext || {}}
                    onAddContent={onAddContent}
                  />
                </div>
              </div>
            )}

            {activeAction === 'cover-letter' && (
              <div className="bg-white rounded-xl border border-border-subtle">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">Cover Letter Generator</h3>
                  <p className="text-xs text-text-muted">Create tailored letters based on your resume.</p>
                </div>
                <div className="p-4">
                  <CoverLetterGenerator
                    resumeData={resumeData}
                    onClose={() => {}}
                    onCoverLetterChange={onCoverLetterChange}
                  />
                </div>
              </div>
            )}

            {activeAction === 'version-control' && (
              <div className="bg-white rounded-xl border border-border-subtle">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">Version History</h3>
                  <p className="text-xs text-text-muted">Save checkpoints and compare versions.</p>
                </div>
                <div className="p-4">
                  {currentResumeId ? (
                    <VersionControlPanel
                      resumeId={currentResumeId}
                      resumeData={resumeData}
                      onVersionLoad={onVersionLoad}
                      onSaveVersion={onVersionSave}
                      onCompareVersions={onCompareVersions}
                    />
                  ) : (
                    <div className="text-sm text-text-muted">Save your resume to enable version history.</div>
                  )}
                </div>
              </div>
            )}

            {activeAction === 'share' && (
              <ShareResumeModal
                isOpen={true}
                variant="panel"
                onClose={() => {}}
                resumeId={currentResumeId || 0}
                resumeName={resumeData?.name || 'Untitled Resume'}
                resumeData={{
                  personalInfo: {
                    name: resumeData?.name,
                    title: resumeData?.title,
                    email: resumeData?.email,
                    phone: resumeData?.phone,
                    location: resumeData?.location,
                  },
                  summary: resumeData?.summary,
                  sections: resumeData?.sections,
                }}
              />
            )}

            {activeAction === 'export-analytics' && (
              <div className="bg-white rounded-xl border border-border-subtle">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">Export Analytics</h3>
                  <p className="text-xs text-text-muted">Review export volume and history.</p>
                </div>
                <div className="p-4">
                  <ExportAnalyticsDashboard isOpen={true} variant="panel" onClose={() => {}} />
                </div>
              </div>
            )}

            {activeAction === 'job-match-analytics' && (
              <div className="bg-white rounded-xl border border-border-subtle">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">Match Analytics</h3>
                  <p className="text-xs text-text-muted">Track match outcomes over time.</p>
                </div>
                <div className="p-4">
                  <JobMatchAnalyticsDashboard isOpen={true} variant="panel" onClose={() => {}} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Tooltip from '@/components/Shared/Tooltip'
import { Sparkles, Save, Upload, Link as LinkIcon, FileText, Zap, Focus, Eye, EyeOff, LayoutDashboard } from 'lucide-react'

interface TopNavigationBarProps {
  onNewResume?: () => void
  onSaveResume?: () => void
  onUploadResume?: () => void
  onExport?: (format: 'pdf' | 'docx' | 'cover-letter') => void
  isExporting?: boolean
  hasResumeName?: boolean
  hasCoverLetter?: boolean
  userName?: string
  isAuthenticated?: boolean
  onLogout?: () => void
  onSignIn?: () => void
  onShareResume?: () => void
  onMenuClick?: () => void
  onRightPanelClick?: () => void
  focusMode?: boolean
  onFocusModeToggle?: () => void
  resumeData?: {
    sections?: Array<{ id: string; title: string }>
    summary?: string
  }
  previewMode?: 'side-by-side' | 'fullscreen'
  onPreviewModeToggle?: () => void
}

export default function TopNavigationBar({ 
  onNewResume,
  onSaveResume,
  onUploadResume,
  onExport,
  isExporting = false,
  hasResumeName = false,
  hasCoverLetter = false,
  userName,
  isAuthenticated,
  onLogout,
  onSignIn,
  onShareResume,
  onMenuClick,
  onRightPanelClick,
  focusMode = false,
  onFocusModeToggle,
  previewMode = 'side-by-side',
  onPreviewModeToggle,
}: TopNavigationBarProps) {
  const { user } = useAuth()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false)
  const mobileActionsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false)
      }
      if (mobileActionsMenuRef.current && !mobileActionsMenuRef.current.contains(event.target as Node)) {
        setShowMobileActionsMenu(false)
      }
    }

    if (showActionsMenu || showMobileActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActionsMenu, showMobileActionsMenu])

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Tooltip text="Open navigation menu" color="gray" position="bottom">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2.5 hover:bg-primary-50/50 rounded-lg touch-target transition-all duration-200"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </Tooltip>
          <Link href="/" className="flex items-center -ml-0">
            <Image 
              src="/logo.jpg" 
              alt="editresume.io" 
              width={480} 
              height={240}
              className="h-24 w-auto mix-blend-multiply"
              priority
            />
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3 pr-3 sm:pr-6">
          {/* Preview Mode Toggle - Desktop only */}
          {onPreviewModeToggle && (
            <Tooltip 
              text={previewMode === 'side-by-side' ? 'Fullscreen Preview' : 'Side-by-Side Preview'} 
              color="blue" 
              position="bottom"
            >
              <button
                onClick={onPreviewModeToggle}
                className={`hidden sm:flex p-2.5 rounded-lg transition-all duration-200 touch-target ${
                  previewMode === 'fullscreen'
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'text-text-muted hover:text-text-primary hover:bg-primary-50/50'
                }`}
                aria-label={previewMode === 'side-by-side' ? 'Fullscreen Preview' : 'Side-by-Side Preview'}
              >
                {previewMode === 'side-by-side' ? (
                  <LayoutDashboard className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
          )}


          {/* Focus Mode Toggle */}
          {onFocusModeToggle && (
            <Tooltip text={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'} color="blue" position="bottom">
              <button
                onClick={onFocusModeToggle}
                className={`p-2.5 rounded-lg transition-all duration-200 touch-target ${
                  focusMode
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'text-text-muted hover:text-text-primary hover:bg-primary-50/50'
                }`}
                aria-label={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              >
                <Focus className="w-5 h-5" />
              </button>
            </Tooltip>
          )}

          {/* Upload Resume Button - Visible on desktop */}
          {onUploadResume && (
            <Tooltip text="Upload an existing resume file (PDF, DOCX) to edit" color="gray" position="bottom">
              <button
                onClick={onUploadResume}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Resume</span>
              </button>
            </Tooltip>
          )}

          {/* Save Resume Button - Visible on desktop */}
          {onSaveResume && isAuthenticated && (
            <Tooltip text="Save your current resume to your account" color="gray" position="bottom">
              <button
                onClick={onSaveResume}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target"
              >
                <Save className="w-4 h-4" />
                <span>Save Resume</span>
              </button>
            </Tooltip>
          )}

          {/* Actions Dropdown - Hidden on mobile */}
          <div className="hidden sm:block relative" ref={actionsMenuRef}>
            <Tooltip text="Open actions menu (New Resume, Save, Upload, Export, etc.)" color="blue" position="bottom">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all touch-target flex items-center gap-2 relative overflow-hidden button-primary hover:shadow-glow"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Zap className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Actions</span>
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </Tooltip>
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-border-subtle py-2 z-[100] backdrop-blur-sm animate-fade-in">
                {/* New Resume */}
                {onNewResume && (
                  <Tooltip text="Create a new resume from scratch" color="gray" position="right">
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        onNewResume()
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                    >
                      <Sparkles className="w-4 h-4 text-primary-600" />
                      <span className="font-medium">New Resume</span>
                    </button>
                  </Tooltip>
                )}
                
                {/* Share Resume */}
                {onShareResume && isAuthenticated && hasResumeName && (
                  <Tooltip text="Share your resume with others via a shareable link" color="gray" position="right">
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        onShareResume()
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                    >
                      <LinkIcon className="w-4 h-4 text-primary-600" />
                      <span className="font-medium">Share Resume</span>
                    </button>
                  </Tooltip>
                )}
                
                {/* Export Options */}
                {onExport && (
                  <>
                    <div className="border-t border-border-subtle my-2"></div>
                    <div className="px-4 py-1.5">
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Export</div>
                    </div>
                    <Tooltip text="Export your resume as a PDF file" color="gray" position="right">
                      <button
                        onClick={() => {
                          setShowActionsMenu(false)
                          onExport('pdf')
                        }}
                        disabled={!hasResumeName || isExporting}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                      >
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">{isExporting ? 'Exporting Resume...' : 'Export Resume PDF'}</span>
                      </button>
                    </Tooltip>
                    <Tooltip text="Export your resume as a DOCX file" color="gray" position="right">
                      <button
                        onClick={() => {
                          setShowActionsMenu(false)
                          onExport('docx')
                        }}
                        disabled={!hasResumeName || isExporting}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                      >
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">{isExporting ? 'Exporting Resume...' : 'Export Resume DOCX'}</span>
                      </button>
                    </Tooltip>
                    <Tooltip text="Export your cover letter as a PDF file" color="gray" position="right">
                      <button
                        onClick={() => {
                          setShowActionsMenu(false)
                          onExport('cover-letter')
                        }}
                        disabled={!hasCoverLetter || isExporting}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                      >
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">{isExporting ? 'Exporting Cover Letter...' : 'Export Cover Letter PDF'}</span>
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions Button - Mobile only */}
          {(onUploadResume || onExport) && (
            <div className="sm:hidden relative" ref={mobileActionsMenuRef}>
              <Tooltip text="Upload or export resume" color="gray" position="bottom">
                <button
                  onClick={() => setShowMobileActionsMenu(!showMobileActionsMenu)}
                  className="p-2.5 text-text-muted hover:text-text-primary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target"
                  aria-label="Actions"
                >
                  <Upload className="w-6 h-6" />
                </button>
              </Tooltip>
              {showMobileActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-border-subtle py-2 z-[100] backdrop-blur-sm animate-fade-in">
                  {/* Upload Resume */}
                  {onUploadResume && (
                    <Tooltip text="Upload an existing resume file (PDF, DOCX) to edit" color="gray" position="left">
                      <button
                        onClick={() => {
                          setShowMobileActionsMenu(false)
                          onUploadResume()
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                      >
                        <Upload className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">Upload Resume</span>
                      </button>
                    </Tooltip>
                  )}
                  
                  {/* Export PDF */}
                  {onExport && (
                    <>
                      {onUploadResume && <div className="border-t border-border-subtle my-2"></div>}
                      <Tooltip text="Export your resume as a PDF file" color="gray" position="left">
                        <button
                          onClick={() => {
                            setShowMobileActionsMenu(false)
                            onExport('pdf')
                          }}
                          disabled={!hasResumeName || isExporting}
                          className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 rounded-lg mx-1"
                        >
                          <FileText className="w-4 h-4 text-primary-600" />
                          <span className="font-medium">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Tools Button - Mobile only */}
          {onRightPanelClick && (
            <Tooltip text="Open AI Tools panel (Live Preview, Match JD, Comments)" color="purple" position="bottom">
              <button
                onClick={onRightPanelClick}
                className="sm:hidden p-2.5 text-text-muted hover:text-text-primary hover:bg-primary-50/50 rounded-lg transition-all duration-200 touch-target"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}


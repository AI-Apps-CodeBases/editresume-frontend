'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Tooltip from '@/components/Shared/Tooltip'
import { Save, Upload, Zap, Focus } from 'lucide-react'

interface TopNavigationBarProps {
  onSaveResume?: () => void
  onUploadResume?: () => void
  isAuthenticated?: boolean
  onMenuClick?: () => void
  onRightPanelClick?: () => void
  onActionsClick?: () => void
  focusMode?: boolean
  onFocusModeToggle?: () => void
}

export default function TopNavigationBar({ 
  onSaveResume,
  onUploadResume,
  isAuthenticated,
  onMenuClick,
  onRightPanelClick,
  onActionsClick,
  focusMode = false,
  onFocusModeToggle,
}: TopNavigationBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
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

          {onActionsClick && (
            <div className="hidden sm:block">
              <Tooltip text="Open actions drawer" color="blue" position="bottom">
                <button
                  onClick={onActionsClick}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all touch-target flex items-center gap-2 relative overflow-hidden button-primary hover:shadow-glow"
                  style={{ background: 'var(--gradient-accent)' }}
                >
                  <Zap className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Actions</span>
                </button>
              </Tooltip>
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

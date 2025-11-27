'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

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
}: TopNavigationBarProps) {
  const { user } = useAuth()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14">
        {/* Left: Logo + Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg touch-target"
            aria-label="Menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center -ml-0">
            <Image 
              src="/logo.jpg" 
              alt="editresume.io" 
              width={480} 
              height={240}
              className="h-20 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3 pr-3 sm:pr-6">
          {/* Actions Dropdown - Hidden on mobile */}
          <div className="hidden sm:block relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all shadow-sm hover:shadow-md touch-target flex items-center gap-1"
            >
              ⚡ Actions
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* New Resume */}
                {onNewResume && (
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      onNewResume()
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">✨</span>
                    <span className="font-medium">New Resume</span>
                  </button>
                )}
                
                {/* Save Resume */}
                {onSaveResume && isAuthenticated && (
                  <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        onSaveResume()
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span className="text-base">💾</span>
                      <span className="font-medium">Save Resume</span>
                    </button>
                  </>
                )}
                
                {/* Upload Resume */}
                {onUploadResume && (
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      onUploadResume()
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">📤</span>
                    <span className="font-medium">Upload Resume</span>
                  </button>
                )}
                
                {/* Share Resume */}
                {onShareResume && isAuthenticated && hasResumeName && (
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      onShareResume()
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">🔗</span>
                    <span className="font-medium">Share Resume</span>
                  </button>
                )}
                
                {/* Export Options */}
                {onExport && (
                  <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <div className="px-3 py-1">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Export</div>
                    </div>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        onExport('pdf')
                      }}
                      disabled={!hasResumeName || isExporting}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <span className="text-base">📄</span>
                      <span className="font-medium">{isExporting ? 'Exporting Resume...' : 'Export Resume PDF'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        onExport('cover-letter')
                      }}
                      disabled={!hasCoverLetter || isExporting}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <span className="text-base">📄</span>
                      <span className="font-medium">{isExporting ? 'Exporting Cover Letter...' : 'Export Cover Letter PDF'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Tools Button - Mobile only */}
          {onRightPanelClick && (
            <button
              onClick={onRightPanelClick}
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors touch-target"
              title="AI Tools"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          )}


        </div>
      </div>
    </div>
  )
}


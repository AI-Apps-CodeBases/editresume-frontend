'use client'
import React, { useState } from 'react'
import Image from 'next/image'
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
}: TopNavigationBarProps) {
  const { user } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.jpg" 
            alt="editresume.io" 
            width={180} 
            height={60}
            className="h-14 w-auto"
            priority
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* New Resume */}
          {onNewResume && (
            <button
              onClick={onNewResume}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✨ New Resume
            </button>
          )}

          {/* Save Resume */}
          {onSaveResume && isAuthenticated && (
            <button
              onClick={onSaveResume}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              💾 Save
            </button>
          )}

          {/* Share Resume */}
          {onShareResume && isAuthenticated && hasResumeName && (
            <button
              onClick={onShareResume}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              🔗 Share
            </button>
          )}

          {/* Upload Resume */}
          {onUploadResume && (
            <button
              onClick={onUploadResume}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📤 Upload
            </button>
          )}

          {/* Export Menu */}
          {onExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting || !hasResumeName}
                className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? '⏳ Exporting...' : '📤 Export'}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowExportMenu(false)
                      onExport('pdf')
                    }}
                    disabled={!hasResumeName || isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📄 Export Resume PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false)
                      onExport('cover-letter')
                    }}
                    disabled={!hasCoverLetter || isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📄 Export Cover Letter PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            title="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{userName || user?.email || 'Guest'}</p>
                  <p className="text-xs text-gray-500">{user?.isPremium ? 'Pro Plan' : 'Free Plan'}</p>
                </div>
                {isAuthenticated ? (
                  <>
                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Profile Settings
                    </a>
                    <a href="/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Billing
                    </a>
                    {onLogout && (
                      <button
                        onClick={onLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign Out
                      </button>
                    )}
                  </>
                ) : (
                  onSignIn && (
                    <button
                      onClick={onSignIn}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign In
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


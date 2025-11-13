'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface TopNavigationBarProps {
  activeTab?: 'builder' | 'jobs' | 'resumes' | 'collaboration' | 'analytics'
  onTabChange?: (tab: 'builder' | 'jobs' | 'resumes' | 'collaboration' | 'analytics') => void
}

export default function TopNavigationBar({ activeTab = 'builder', onTabChange }: TopNavigationBarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const handleTabClick = (tab: 'builder' | 'jobs' | 'resumes' | 'collaboration' | 'analytics') => {
    if (tab === 'builder') {
      router.push('/editor-v2')
    } else {
      onTabChange?.(tab)
    }
  }

  const tabs = [
    { id: 'builder' as const, label: 'Builder', icon: '📝' },
    { id: 'jobs' as const, label: 'Jobs', icon: '💼' },
    { id: 'resumes' as const, label: 'Resumes', icon: '📄' },
    { id: 'collaboration' as const, label: 'Collaboration', icon: '🤝' },
    { id: 'analytics' as const, label: 'Analytics', icon: '📊' },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            editresume
          </div>
        </div>

        {/* Middle: Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
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

          {/* Help */}
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            title="Help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.email || 'Guest'}</p>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
                <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Profile Settings
                </a>
                <a href="/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Billing
                </a>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'
import { useState, useEffect } from 'react'
import { useSettings } from '@/contexts/SettingsContext'

interface Settings {
  aiImprovements: boolean
  autoSave: boolean
  emailNotifications: boolean
  marketingEmails: boolean
  darkMode: boolean
  showHints: boolean
  advancedFeatures: boolean
  atsScoreNotifications: boolean
  coverLetterAutoGenerate: boolean
  jobMatchAlerts: boolean
  defaultExportFormat: 'pdf' | 'docx'
}

interface Props {
  user?: {
    email: string
    name: string
    isPremium: boolean
  }
  onDeleteAccount?: () => void
  onLogout?: () => void
}

export default function SettingsPanel({ user, onDeleteAccount, onLogout }: Props) {
  const { settings, updateSetting, resetSettings, exportSettings } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleUpdateSetting = (key: keyof Settings, value: boolean | 'pdf' | 'docx') => {
    updateSetting(key, value as boolean)
    
    // Show save status
    setIsSaving(true)
    setSaveStatus('saving')
    
    setTimeout(() => {
      setIsSaving(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  const handleResetToDefaults = () => {
    resetSettings()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleExportSettings = () => {
    exportSettings()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          // Update settings through context
          Object.entries(imported).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
              updateSetting(key as keyof Settings, value)
            }
          })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (error) {
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      }
      reader.readAsText(file)
    }
  }

  const SettingToggle = ({ 
    key, 
    label, 
    description, 
    premium = false 
  }: { 
    key: keyof Settings
    label: string
    description: string
    premium?: boolean
  }) => (
    <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">{label}</h4>
          {premium && !user?.isPremium && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              Premium
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={typeof settings[key] === 'boolean' ? settings[key] as boolean : false}
          onChange={(e) => {
            if (typeof settings[key] === 'boolean') {
              handleUpdateSetting(key, e.target.checked)
            }
          }}
          disabled={premium && !user?.isPremium}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-600 text-sm font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600 text-sm font-medium">✗ Error</span>
          )}
        </div>
      </div>

      {/* AI Features */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold text-gray-900">🤖 AI Features</h3>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
            Premium
          </span>
        </div>
        <div className="space-y-3">
          <SettingToggle
            key="aiImprovements"
            label="AI Text Improvements"
            description="Enable AI-powered text enhancement suggestions"
            premium={true}
          />
          <SettingToggle
            key="advancedFeatures"
            label="Advanced AI Features"
            description="Access to advanced AI capabilities like content generation"
            premium={true}
          />
          <SettingToggle
            key="coverLetterAutoGenerate"
            label="Auto-generate Cover Letters"
            description="Automatically generate cover letter suggestions when matching jobs"
          />
        </div>
      </div>

      {/* ATS & Job Matching */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 ATS & Job Matching</h3>
        <div className="space-y-3">
          <SettingToggle
            key="atsScoreNotifications"
            label="ATS Score Notifications"
            description="Get notified when your ATS score improves or changes"
          />
          <SettingToggle
            key="jobMatchAlerts"
            label="Job Match Alerts"
            description="Receive alerts when new job matches are found for your resume"
          />
        </div>
      </div>

      {/* Editor Preferences */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">⚙️ Editor Preferences</h3>
        <div className="space-y-3">
          <SettingToggle
            key="autoSave"
            label="Auto-save"
            description="Automatically save your resume as you type"
          />
          <SettingToggle
            key="showHints"
            label="Show Hints & Tips"
            description="Display helpful hints and tips in the editor"
          />
          <SettingToggle
            key="darkMode"
            label="Dark Mode"
            description="Use dark theme for the editor interface"
          />
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Default Export Format
            </label>
            <select
              value={settings.defaultExportFormat}
              onChange={(e) => {
                const newValue = e.target.value as 'pdf' | 'docx'
                updateSetting('defaultExportFormat', newValue)
                setIsSaving(true)
                setSaveStatus('saving')
                setTimeout(() => {
                  setIsSaving(false)
                  setSaveStatus('saved')
                  setTimeout(() => setSaveStatus('idle'), 2000)
                }, 500)
              }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX (Word)</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">Choose your preferred export format</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔔 Notifications</h3>
        <div className="space-y-3">
          <SettingToggle
            key="emailNotifications"
            label="Email Notifications"
            description="Receive important updates and notifications via email"
          />
          <SettingToggle
            key="marketingEmails"
            label="Marketing Emails"
            description="Receive promotional emails and feature updates"
          />
        </div>
      </div>

      {/* Settings Management */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🛠️ Settings Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportSettings}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            📤 Export Settings
          </button>
          <label className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium cursor-pointer">
            📥 Import Settings
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </label>
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔐 Account Actions</h3>
        <div className="space-y-3">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
        <h3 className="text-lg font-bold text-red-900 mb-2">⚠️ Danger Zone</h3>
        <p className="text-red-700 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={onDeleteAccount}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
        >
          Delete Account
        </button>
      </div>

      {/* Feature Status */}
      <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4">ℹ️ Feature Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings.aiImprovements ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span>AI Improvements: {settings.aiImprovements ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings.atsScoreNotifications ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span>ATS Notifications: {settings.atsScoreNotifications ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings.jobMatchAlerts ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span>Job Match Alerts: {settings.jobMatchAlerts ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings.autoSave ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span>Auto-save: {settings.autoSave ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

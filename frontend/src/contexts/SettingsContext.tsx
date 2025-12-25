'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface SettingsContextType {
  settings: Settings
  updateSetting: (key: keyof Settings, value: boolean | 'pdf' | 'docx') => void
  resetSettings: () => void
  exportSettings: () => void
  importSettings: (settings: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  aiImprovements: true,
  autoSave: true,
  emailNotifications: true,
  marketingEmails: false,
  darkMode: false,
  showHints: true,
  advancedFeatures: false,
  atsScoreNotifications: true,
  coverLetterAutoGenerate: false,
  jobMatchAlerts: true,
  defaultExportFormat: 'pdf'
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    // Load settings from localStorage on mount
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }, [])

  const updateSetting = (key: keyof Settings, value: boolean | 'pdf' | 'docx') => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('userSettings', JSON.stringify(newSettings))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = 'editresume-settings.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const importSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings))
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      exportSettings,
      importSettings
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

'use client'

import { useState } from 'react'
import { TemplateConfig } from '../templates/types'
import { TemplateGallery } from './TemplateGallery'
import { CustomizationControls } from './CustomizationControls'

interface Props {
  currentTemplateId: string
  config: TemplateConfig
  onTemplateChange: (templateId: string) => void
  onConfigUpdate: (updates: Partial<TemplateConfig>) => void
  onResetConfig: () => void
  resumeData?: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    summary: string
    sections: Array<{
      id: string
      title: string
      bullets: Array<{ id: string; text: string }>
    }>
  }
}

export function TemplateCustomizer({
  currentTemplateId,
  config,
  onTemplateChange,
  onConfigUpdate,
  onResetConfig,
  resumeData,
}: Props) {
  const [activeTab, setActiveTab] = useState<'templates' | 'customize'>('templates')

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Template & Design</h2>
        <p className="text-sm text-gray-600">Choose templates and customize appearance</p>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-white border-b-2 border-purple-600 text-purple-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('customize')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'customize'
              ? 'bg-white border-b-2 border-purple-600 text-purple-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Customize
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'templates' && (
          <TemplateGallery 
            currentTemplateId={currentTemplateId} 
            onSelectTemplate={onTemplateChange}
            resumeData={resumeData}
          />
        )}
        {activeTab === 'customize' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Customize Design</h3>
              <button
                onClick={onResetConfig}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
              >
                Reset to Default
              </button>
            </div>
            <CustomizationControls 
              config={config} 
              onUpdate={onConfigUpdate}
              sections={resumeData?.sections}
              hasSummary={!!resumeData?.summary}
            />
          </div>
        )}
      </div>
    </div>
  )
}


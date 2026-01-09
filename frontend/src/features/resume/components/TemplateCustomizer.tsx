'use client'

import { useState } from 'react'
import { TemplateConfig } from '../templates/types'
import { TemplateGallery } from './TemplateGallery'
import { CustomizationControls } from './CustomizationControls'
import { RotateCcw } from 'lucide-react'

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
    <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm">
      <div className="flex border-b border-gray-200 bg-gradient-to-r from-primary-50/20 to-transparent">
        <button
          onClick={() => setActiveTab('templates')}
          className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            activeTab === 'templates'
              ? 'bg-white text-primary-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
          }`}
          aria-label="Templates tab"
          aria-selected={activeTab === 'templates'}
        >
          Templates
          {activeTab === 'templates' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full transition-all duration-200"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('customize')}
          className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            activeTab === 'customize'
              ? 'bg-white text-primary-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
          }`}
          aria-label="Customize tab"
          aria-selected={activeTab === 'customize'}
        >
          Customize
          {activeTab === 'customize' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full transition-all duration-200"></span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'templates' && (
          <TemplateGallery 
            currentTemplateId={currentTemplateId} 
            onSelectTemplate={onTemplateChange}
            resumeData={resumeData}
          />
        )}
        {activeTab === 'customize' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customize Design</h3>
                <p className="text-sm text-gray-500 mt-1">Adjust layout, typography, and spacing</p>
              </div>
              <button
                onClick={onResetConfig}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                title="Reset all customization settings to template defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
            <CustomizationControls 
              config={config} 
              onUpdate={onConfigUpdate}
              sections={resumeData?.sections}
              hasSummary={!!resumeData?.summary}
              onSectionDistributionChange={(leftIds, rightIds) => {
                onConfigUpdate({
                  layout: {
                    ...config.layout,
                    twoColumnLeft: leftIds,
                    twoColumnRight: rightIds,
                  }
                })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}


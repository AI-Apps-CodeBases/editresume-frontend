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
    <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm">
      <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50/30 to-purple-50/30 p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1.5">Template & Design</h2>
        <p className="text-xs sm:text-sm text-text-muted">Choose templates and customize appearance</p>
      </div>

      <div className="flex border-b border-border-subtle bg-gradient-to-r from-primary-50/20 to-transparent">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'templates'
              ? 'bg-white border-b-2 border-primary-500 text-primary-700 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-primary-50/50'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('customize')}
          className={`px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'customize'
              ? 'bg-white border-b-2 border-primary-500 text-primary-700 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-primary-50/50'
          }`}
        >
          Customize
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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
              <h3 className="text-lg font-semibold text-text-primary">Customize Design</h3>
              <button
                onClick={onResetConfig}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-subtle rounded-lg hover:bg-primary-50/50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Reset to Default
              </button>
            </div>
            <CustomizationControls 
              config={config} 
              onUpdate={onConfigUpdate}
              sections={resumeData?.sections}
              hasSummary={!!resumeData?.summary}
              onSectionDistributionChange={(leftIds, rightIds) => {
                // Save section distribution to config for persistence across templates
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


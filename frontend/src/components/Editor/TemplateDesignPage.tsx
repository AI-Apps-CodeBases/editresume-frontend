'use client'

import { useState, useEffect } from 'react'
import { TemplateCustomizer } from '@/features/resume/components'
import { templateRegistry } from '@/features/resume/templates'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import type { TemplateConfig } from '@/features/resume/templates/types'

interface Props {
  resumeData: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    summary: string
    sections: Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params?: Record<string, any>
      }>
    }>
    fieldsVisible?: Record<string, boolean>
    linkedin?: string
    website?: string
    github?: string
    portfolio?: string
    twitter?: string
  }
  currentTemplate: string
  templateConfig?: TemplateConfig
  onTemplateChange: (templateId: string) => void
  onTemplateConfigUpdate: (config: TemplateConfig) => void
  onClose: () => void
}

export default function TemplateDesignPage({
  resumeData,
  currentTemplate,
  templateConfig,
  onTemplateChange,
  onTemplateConfigUpdate,
  onClose,
}: Props) {
  const [localConfig, setLocalConfig] = useState<TemplateConfig | null>(templateConfig || null)

  useEffect(() => {
    if (templateConfig) {
      setLocalConfig(templateConfig)
    } else {
      const template = templateRegistry.find((t) => t.id === currentTemplate)
      if (template) {
        setLocalConfig(template.defaultConfig)
      }
    }
  }, [templateConfig, currentTemplate])

  const handleConfigUpdate = (updates: Partial<TemplateConfig>) => {
    // Deep merge the updates with existing config
    const newConfig: TemplateConfig = {
      layout: { ...localConfig!.layout, ...(updates.layout || {}) },
      typography: {
        ...localConfig!.typography,
        ...(updates.typography || {}),
        fontFamily: {
          ...localConfig!.typography.fontFamily,
          ...(updates.typography?.fontFamily || {}),
        },
        fontSize: {
          ...localConfig!.typography.fontSize,
          ...(updates.typography?.fontSize || {}),
        },
      },
      design: {
        ...localConfig!.design,
        ...(updates.design || {}),
        colors: {
          ...localConfig!.design.colors,
          ...(updates.design?.colors || {}),
        },
      },
      spacing: {
        ...localConfig!.spacing,
        ...(updates.spacing || {}),
      },
    }
    setLocalConfig(newConfig)
    onTemplateConfigUpdate(newConfig)
  }

  const handleResetConfig = () => {
    const template = templateRegistry.find((t) => t.id === currentTemplate)
    if (template) {
      setLocalConfig(template.defaultConfig)
      onTemplateConfigUpdate(template.defaultConfig)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    onTemplateChange(templateId)
    const template = templateRegistry.find((t) => t.id === templateId)
    if (template) {
      setLocalConfig(template.defaultConfig)
      onTemplateConfigUpdate(template.defaultConfig)
    }
  }

  const config = localConfig || templateRegistry.find((t) => t.id === currentTemplate)?.defaultConfig

  return (
    <div className="fixed inset-0 z-[110] bg-gradient-to-br from-primary-50/20 to-white flex flex-col">
      <div className="bg-white/95 backdrop-blur-md border-b border-border-subtle px-6 py-4 flex items-center justify-between shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-text-secondary bg-primary-50/50 border border-border-subtle rounded-lg hover:bg-primary-100 flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-lg">←</span>
            <span>Back to Editor</span>
          </button>
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-2xl font-bold text-gray-900">Templates & Design</h1>
            <p className="text-sm text-gray-600 mt-1">Choose a template and customize your resume design</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-glow button-primary"
          style={{ background: 'var(--gradient-accent)' }}
        >
          Done
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[40%] border-r border-border-subtle bg-white/95 backdrop-blur-sm overflow-y-auto relative">
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-border-subtle px-4 py-3 z-10 shadow-sm">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span className="text-lg">←</span>
              <span>Back to Editor</span>
            </button>
          </div>
          <TemplateCustomizer
            currentTemplateId={currentTemplate}
            config={config!}
            onTemplateChange={handleTemplateChange}
            onConfigUpdate={handleConfigUpdate}
            onResetConfig={handleResetConfig}
            resumeData={resumeData}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/20 to-white p-8 flex items-start justify-center">
          <div className="w-full max-w-4xl">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Live Preview</h2>
              <p className="text-xs text-text-muted">See your changes in real-time</p>
            </div>
            <div className="bg-white rounded-lg shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-2 surface-card">
              <PreviewPanel
                data={resumeData}
                replacements={{}}
                template={currentTemplate as any}
                templateConfig={config}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


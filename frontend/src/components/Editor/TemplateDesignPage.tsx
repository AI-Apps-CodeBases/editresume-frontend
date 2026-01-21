'use client'

import { useState, useEffect, useRef } from 'react'
import type { TemplateConfig } from '@/features/resume/templates/types'
import { FileText, ChevronDown, Loader2 } from 'lucide-react'
import Tooltip from '@/components/Shared/Tooltip'
import dynamic from 'next/dynamic'
import { TemplateCustomizer } from '@/features/resume/components/TemplateCustomizer'

const PreviewPanel = dynamic(() => import('@/components/Resume/PreviewPanel'), {
  ssr: false,
  loading: () => <div className="p-4">Loading preview...</div>
})

// Lazy load templateRegistry to avoid webpack circular dependency issues
let templateRegistryCache: any = null
const getTemplateRegistry = async () => {
  if (templateRegistryCache) {
    return templateRegistryCache
  }
  try {
    const module = await import('@/features/resume/templates/registry')
    templateRegistryCache = module.templateRegistry || []
    return templateRegistryCache
  } catch (error) {
    console.error('Failed to load template registry:', error)
    return []
  }
}

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
  onExport?: (format: 'pdf' | 'docx') => void
  isExporting?: boolean
  hasResumeName?: boolean
}

export default function TemplateDesignPage({
  resumeData,
  currentTemplate,
  templateConfig,
  onTemplateChange,
  onTemplateConfigUpdate,
  onClose,
  onExport,
  isExporting = false,
  hasResumeName = false,
}: Props) {
  const [localConfig, setLocalConfig] = useState<TemplateConfig | null>(templateConfig || null)
  const [mobileMode, setMobileMode] = useState<'templates' | 'preview'>('templates')
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadTemplateConfig = async () => {
    if (templateConfig) {
      setLocalConfig(prev => {
        // If we have local state with twoColumnLeft/Right, preserve it when templateConfig updates
        if (prev && (prev.layout.twoColumnLeft || prev.layout.twoColumnRight)) {
          return {
            ...templateConfig,
            layout: {
              ...templateConfig.layout,
              twoColumnLeft: prev.layout.twoColumnLeft ?? templateConfig.layout.twoColumnLeft,
              twoColumnRight: prev.layout.twoColumnRight ?? templateConfig.layout.twoColumnRight,
            }
          }
        }
        return templateConfig
      })
    } else {
        if (!templateRegistryCache) {
          templateRegistryCache = await getTemplateRegistry()
        }
        const template = templateRegistryCache.find((t: any) => t.id === currentTemplate)
      if (template) {
        setLocalConfig(template.defaultConfig)
      }
    }
    }
    loadTemplateConfig()
  }, [templateConfig, currentTemplate])

  const handleConfigUpdate = (updates: Partial<TemplateConfig>) => {
    // Deep merge the updates with existing config
    const layoutUpdates = updates.layout || {} as Partial<TemplateConfig['layout']>
    const newConfig: TemplateConfig = {
      layout: { 
        ...localConfig!.layout, 
        ...layoutUpdates,
        // Always use twoColumnLeft and twoColumnRight from updates if provided, otherwise keep existing
        twoColumnLeft: layoutUpdates.twoColumnLeft !== undefined 
          ? layoutUpdates.twoColumnLeft 
          : localConfig!.layout.twoColumnLeft,
        twoColumnRight: layoutUpdates.twoColumnRight !== undefined 
          ? layoutUpdates.twoColumnRight 
          : localConfig!.layout.twoColumnRight,
      },
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

  const handleResetConfig = async () => {
    const registry = await getTemplateRegistry()
    const template = registry.find((t: any) => t.id === currentTemplate)
    if (template) {
      setLocalConfig(template.defaultConfig)
      onTemplateConfigUpdate(template.defaultConfig)
    }
  }

  const handleTemplateChange = async (templateId: string) => {
    onTemplateChange(templateId)
    const registry = await getTemplateRegistry()
    const template = registry.find((t: any) => t.id === templateId)
    if (template) {
      setLocalConfig(template.defaultConfig)
      onTemplateConfigUpdate(template.defaultConfig)
    }
  }

  const [configState, setConfigState] = useState<TemplateConfig | null>(localConfig || null)
  
  useEffect(() => {
    const loadConfig = async () => {
      if (localConfig) {
        setConfigState(localConfig)
      } else {
        const registry = await getTemplateRegistry()
        const template = registry.find((t: any) => t.id === currentTemplate)
        if (template) {
          setConfigState(template.defaultConfig)
        }
      }
    }
    loadConfig()
  }, [localConfig, currentTemplate])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

  const handleExportClick = (format: 'pdf' | 'docx') => {
    if (onExport) {
      onExport(format)
    }
    setShowExportDropdown(false)
  }

  return (
    <div className="fixed inset-0 z-[110] bg-gradient-to-br from-primary-50/20 to-white flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border-subtle px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50/50 rounded-lg flex items-center gap-2 transition-all duration-200"
          >
            <span className="text-lg">←</span>
            <span>Back to Editor</span>
          </button>
          <div className="border-l border-gray-200 pl-4">
            <h1 className="text-lg font-semibold text-gray-900">Templates & Design</h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-glow flex items-center gap-2 button-primary"
          style={{ background: 'var(--gradient-accent)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Done</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:hidden px-4 pt-3">
          <div className="inline-flex items-center rounded-full border border-border-subtle bg-white/90 shadow-sm">
            <button
              onClick={() => setMobileMode('templates')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mobileMode === 'templates'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Templates & Customize
            </button>
            <button
              onClick={() => setMobileMode('preview')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mobileMode === 'preview'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        <div className={`w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-border-subtle bg-white/95 backdrop-blur-sm overflow-y-auto min-h-0 ${
          mobileMode === 'preview' ? 'hidden lg:block' : ''
        }`}>
          {configState ? (
          <TemplateCustomizer
            currentTemplateId={currentTemplate}
              config={configState}
            onTemplateChange={handleTemplateChange}
            onConfigUpdate={handleConfigUpdate}
            onResetConfig={handleResetConfig}
            resumeData={resumeData}
          />
          ) : (
            <div className="p-4 text-center text-text-secondary">
              <p>Loading template configuration...</p>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-primary-50/20 to-white p-3 sm:p-6 lg:p-8 flex items-start justify-center min-h-0 ${
          mobileMode === 'templates' ? 'hidden lg:flex' : ''
        }`}>
          <div className="w-full max-w-4xl">
            <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center flex-1">
                <h2 className="text-lg font-semibold text-text-primary mb-2">Live Preview</h2>
                <p className="text-xs text-text-muted">See your changes in real-time</p>
              </div>
              {onExport && (
                <div className="relative" ref={exportDropdownRef}>
                  <Tooltip text="Export resume" color="gray" position="bottom">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      disabled={isExporting || !hasResumeName}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md button-primary"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Export</span>
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </Tooltip>
                  {showExportDropdown && !isExporting && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-border-subtle py-2 z-50 backdrop-blur-sm animate-fade-in">
                      <button
                        onClick={() => handleExportClick('pdf')}
                        disabled={!hasResumeName}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 transition-all duration-200 flex items-center gap-2 rounded-lg mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">Export as PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportClick('docx')}
                        disabled={!hasResumeName}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-primary-50/50 transition-all duration-200 flex items-center gap-2 rounded-lg mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">Export as DOCX</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-2 surface-card overflow-hidden w-full">
              <div className="w-full overflow-x-hidden">
                <PreviewPanel
                  key={`preview-${currentTemplate}-${JSON.stringify(configState?.layout?.twoColumnLeft || [])}-${JSON.stringify(configState?.layout?.twoColumnRight || [])}`}
                  data={resumeData}
                  replacements={{}}
                  template={currentTemplate as any}
                  templateConfig={configState}
                  constrained={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


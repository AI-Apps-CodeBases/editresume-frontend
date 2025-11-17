import { useCallback } from 'react'
import { TemplateConfig } from '../templates/types'
import { templateRegistry, getTemplateById } from '../templates/registry'
import { ResumeData } from '../types'

export function useTemplateSwitch(
  currentTemplateId: string,
  currentConfig: TemplateConfig,
  resumeData: ResumeData,
  onTemplateChange: (templateId: string, config: TemplateConfig) => void
) {
  const switchTemplate = useCallback(
    (newTemplateId: string, preserveData = true) => {
      const newTemplate = getTemplateById(newTemplateId)
      if (!newTemplate) return

      let newConfig = { ...newTemplate.defaultConfig }

      if (preserveData) {
        newConfig.layout.sectionOrder = currentConfig.layout.sectionOrder.length > 0
          ? currentConfig.layout.sectionOrder
          : resumeData.sections.map(s => s.id)

        if (currentConfig.layout.columns === newConfig.layout.columns) {
          newConfig.layout.columns = currentConfig.layout.columns
        }

        if (currentConfig.layout.spacing === newConfig.layout.spacing) {
          newConfig.layout.spacing = currentConfig.layout.spacing
        }
      }

      onTemplateChange(newTemplateId, newConfig)
    },
    [currentTemplateId, currentConfig, resumeData, onTemplateChange]
  )

  return { switchTemplate }
}



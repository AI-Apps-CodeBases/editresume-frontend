import { useState, useCallback, useMemo } from 'react'
import { TemplateConfig } from '../templates/types'
import { templateRegistry } from '../templates/registry'

export function useTemplateCustomization(
  templateId: string,
  initialConfig?: Partial<TemplateConfig>
) {
  const template = templateRegistry.find(t => t.id === templateId)
  const baseConfig = template?.defaultConfig || templateRegistry[0].defaultConfig

  const [config, setConfig] = useState<TemplateConfig>(() => {
    if (initialConfig) {
      return mergeConfig(baseConfig, initialConfig)
    }
    return baseConfig
  })

  const updateConfig = useCallback((updates: Partial<TemplateConfig>) => {
    setConfig(prev => mergeConfig(prev, updates))
  }, [])

  const resetConfig = useCallback(() => {
    setConfig(baseConfig)
  }, [baseConfig])

  const updateLayout = useCallback((layout: Partial<TemplateConfig['layout']>) => {
    setConfig(prev => ({
      ...prev,
      layout: { ...prev.layout, ...layout },
    }))
  }, [])

  const updateTypography = useCallback((typography: Partial<TemplateConfig['typography']>) => {
    setConfig(prev => ({
      ...prev,
      typography: { ...prev.typography, ...typography },
    }))
  }, [])

  const updateDesign = useCallback((design: Partial<TemplateConfig['design']>) => {
    setConfig(prev => ({
      ...prev,
      design: { ...prev.design, ...design },
    }))
  }, [])

  const updateSpacing = useCallback((spacing: Partial<TemplateConfig['spacing']>) => {
    setConfig(prev => ({
      ...prev,
      spacing: { ...prev.spacing, ...spacing },
    }))
  }, [])

  return {
    config,
    updateConfig,
    resetConfig,
    updateLayout,
    updateTypography,
    updateDesign,
    updateSpacing,
  }
}

function mergeConfig(base: TemplateConfig, updates: Partial<TemplateConfig>): TemplateConfig {
  return {
    layout: { ...base.layout, ...updates.layout },
    typography: {
      ...base.typography,
      ...updates.typography,
      fontFamily: { ...base.typography.fontFamily, ...updates.typography?.fontFamily },
      fontSize: { ...base.typography.fontSize, ...updates.typography?.fontSize },
      fontWeight: { ...base.typography.fontWeight, ...updates.typography?.fontWeight },
    },
    design: {
      ...base.design,
      ...updates.design,
      colors: { ...base.design.colors, ...updates.design?.colors },
    },
    spacing: { ...base.spacing, ...updates.spacing },
  }
}






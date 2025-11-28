import { TemplateConfig, TemplateMetadata } from './types'
import { classicDefaultConfig } from './classic/config'
import { modernDefaultConfig } from './modern/config'
import { twoColumnDefaultConfig } from './two-column/config'
import { creativeDefaultConfig } from './creative/config'
import { atsFriendlyDefaultConfig } from './ats-friendly/config'
import { executiveDefaultConfig } from './executive/config'
import ClassicTemplate from './classic/Template'
import ModernTemplate from './modern/Template'
import TwoColumnTemplate from './two-column/Template'
import CreativeTemplate from './creative/Template'
import AtsFriendlyTemplate from './ats-friendly/Template'
import ExecutiveTemplate from './executive/Template'

export interface TemplateRegistryEntry {
  id: string
  name: string
  description: string
  category: TemplateMetadata['category']
  atsScore: number
  preview: string
  defaultConfig: TemplateConfig
  Component: React.ComponentType<any>
}

export const templateRegistry: TemplateRegistryEntry[] = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional single-column layout with clean dividers',
    category: 'traditional',
    atsScore: 95,
    preview: '/templates/previews/classic.png',
    defaultConfig: classicDefaultConfig,
    Component: ClassicTemplate,
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Clean, contemporary design with centered header',
    category: 'modern',
    atsScore: 90,
    preview: '/templates/previews/modern.png',
    defaultConfig: modernDefaultConfig,
    Component: ModernTemplate,
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Efficient two-column layout for dense information',
    category: 'traditional',
    atsScore: 85,
    preview: '/templates/previews/two-column.png',
    defaultConfig: twoColumnDefaultConfig,
    Component: TwoColumnTemplate,
  },
  {
    id: 'creative',
    name: 'Creative Bold',
    description: 'Eye-catching design with gradient header and bold typography',
    category: 'creative',
    atsScore: 70,
    preview: '/templates/previews/creative.png',
    defaultConfig: creativeDefaultConfig,
    Component: CreativeTemplate,
  },
  {
    id: 'ats-friendly',
    name: 'ATS Friendly',
    description: 'Optimized for Applicant Tracking Systems with semantic HTML',
    category: 'ats-friendly',
    atsScore: 98,
    preview: '/templates/previews/ats-friendly.png',
    defaultConfig: atsFriendlyDefaultConfig,
    Component: AtsFriendlyTemplate,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Elegant executive-style layout with sophisticated typography',
    category: 'traditional',
    atsScore: 92,
    preview: '/templates/previews/executive.png',
    defaultConfig: executiveDefaultConfig,
    Component: ExecutiveTemplate,
  },
]

export function getTemplateById(id: string): TemplateRegistryEntry | undefined {
  return templateRegistry.find(t => t.id === id)
}

export function getTemplatesByCategory(category: TemplateMetadata['category']): TemplateRegistryEntry[] {
  return templateRegistry.filter(t => t.category === category)
}


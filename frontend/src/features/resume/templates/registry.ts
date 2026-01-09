import { TemplateConfig, TemplateMetadata } from './types'
import { classicDefaultConfig } from './classic/config'
import { modernDefaultConfig } from './modern/config'
import { twoColumnDefaultConfig } from './two-column/config'
import { creativeDefaultConfig } from './creative/config'
import { atsFriendlyDefaultConfig } from './ats-friendly/config'
import { executiveDefaultConfig } from './executive/config'
import { vibrantDefaultConfig } from './vibrant/config'
import { gradientDefaultConfig } from './gradient/config'
import { corporatePremiumDefaultConfig } from './corporate-premium/config'
import { timelineDefaultConfig } from './timeline/config'
import { infographicDefaultConfig } from './infographic/config'
import { minimalDefaultConfig } from './minimal/config'
import { professionalDefaultConfig } from './professional/config'
import ClassicTemplate from './classic/Template'
import ModernTemplate from './modern/Template'
import TwoColumnTemplate from './two-column/Template'
import CreativeTemplate from './creative/Template'
import AtsFriendlyTemplate from './ats-friendly/Template'
import ExecutiveTemplate from './executive/Template'
import VibrantTemplate from './vibrant/Template'
import GradientTemplate from './gradient/Template'
import CorporatePremiumTemplate from './corporate-premium/Template'
import TimelineTemplate from './timeline/Template'
import InfographicTemplate from './infographic/Template'
import MinimalTemplate from './minimal/Template'
import ProfessionalTemplate from './professional/Template'

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
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold color-block design with vibrant sections and high contrast',
    category: 'creative',
    atsScore: 75,
    preview: '/templates/previews/vibrant.png',
    defaultConfig: vibrantDefaultConfig,
    Component: VibrantTemplate,
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Modern gradient design with smooth color transitions and contemporary styling',
    category: 'modern',
    atsScore: 80,
    preview: '/templates/previews/gradient.png',
    defaultConfig: gradientDefaultConfig,
    Component: GradientTemplate,
  },
  {
    id: 'corporate-premium',
    name: 'Corporate Premium',
    description: 'Sophisticated sidebar layout with executive styling and premium feel',
    category: 'traditional',
    atsScore: 88,
    preview: '/templates/previews/corporate-premium.png',
    defaultConfig: corporatePremiumDefaultConfig,
    Component: CorporatePremiumTemplate,
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Visual timeline-based layout with chronological elements and date emphasis',
    category: 'modern',
    atsScore: 82,
    preview: '/templates/previews/timeline.png',
    defaultConfig: timelineDefaultConfig,
    Component: TimelineTemplate,
  },
  {
    id: 'infographic',
    name: 'Infographic',
    description: 'Icon-based design with visual hierarchy and modern graphics',
    category: 'creative',
    atsScore: 78,
    preview: '/templates/previews/infographic.png',
    defaultConfig: infographicDefaultConfig,
    Component: InfographicTemplate,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean design with maximum whitespace and minimal visual elements',
    category: 'modern',
    atsScore: 93,
    preview: '/templates/previews/minimal.png',
    defaultConfig: minimalDefaultConfig,
    Component: MinimalTemplate,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Balanced professional layout with clear hierarchy and centered header',
    category: 'traditional',
    atsScore: 94,
    preview: '/templates/previews/professional.png',
    defaultConfig: professionalDefaultConfig,
    Component: ProfessionalTemplate,
  },
]

export function getTemplateById(id: string): TemplateRegistryEntry | undefined {
  return templateRegistry.find(t => t.id === id)
}

export function getTemplatesByCategory(category: TemplateMetadata['category']): TemplateRegistryEntry[] {
  return templateRegistry.filter(t => t.category === category)
}


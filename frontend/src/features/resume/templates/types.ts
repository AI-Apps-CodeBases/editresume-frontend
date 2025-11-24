import { z } from 'zod'

export const TemplateConfigSchema = z.object({
  layout: z.object({
    columns: z.enum(['single', 'two-column', 'asymmetric']),
    sectionOrder: z.array(z.string()),
    spacing: z.enum(['compact', 'balanced', 'spacious']),
    columnWidth: z.number().min(20).max(80).optional(), // Percentage for left column (20-80%)
  }),
  typography: z.object({
    fontFamily: z.object({
      heading: z.string(),
      body: z.string(),
    }),
    fontSize: z.object({
      h1: z.number(),
      h2: z.number(),
      body: z.number(),
    }),
    lineHeight: z.number(),
    letterSpacing: z.number().optional(),
    fontWeight: z.object({
      heading: z.number().optional(),
      body: z.number().optional(),
    }).optional(),
  }),
  design: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      text: z.string(),
    }),
    bulletStyle: z.enum(['circle', 'square', 'dash', 'none']),
    dividers: z.boolean(),
    headerStyle: z.enum(['centered', 'left-aligned', 'banner']).optional(),
  }),
  spacing: z.object({
    sectionGap: z.number(),
    itemGap: z.number(),
    pageMargin: z.number(),
  }),
})

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>

export interface TemplateProps {
  data: {
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
      params?: Record<string, any>
    }>
    fieldsVisible?: Record<string, boolean>
    linkedin?: string
    website?: string
    github?: string
    portfolio?: string
    twitter?: string
  }
  config: TemplateConfig
  replacements: Record<string, string>
}

export interface TemplateMetadata {
  id: string
  name: string
  description: string
  category: 'traditional' | 'modern' | 'creative' | 'ats-friendly'
  atsScore: number
  preview: string
}


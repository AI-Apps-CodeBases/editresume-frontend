import { TemplateConfig } from '../types'

export const modernDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'balanced',
  },
  typography: {
    fontFamily: {
      heading: 'Inter',
      body: 'Inter',
    },
    fontSize: {
      h1: 28,
      h2: 16,
      body: 11,
    },
    lineHeight: 1.5,
    letterSpacing: 0.5,
    fontWeight: {
      heading: 600,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#3b82f6',
      text: '#0f172a',
    },
    bulletStyle: 'dash',
    dividers: false,
    headerStyle: 'centered',
  },
  spacing: {
    sectionGap: 24,
    itemGap: 6,
    pageMargin: 28,
  },
}







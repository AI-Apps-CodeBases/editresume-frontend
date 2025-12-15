import { TemplateConfig } from '../types'

export const timelineDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'balanced',
  },
  typography: {
    fontFamily: {
      heading: 'Roboto',
      body: 'Roboto',
    },
    fontSize: {
      h1: 30,
      h2: 16,
      body: 10,
    },
    lineHeight: 1.7,
    letterSpacing: 0.2,
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
      text: '#1e293b',
    },
    bulletStyle: 'none',
    dividers: false,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 24,
    itemGap: 12,
    pageMargin: 32,
  },
}


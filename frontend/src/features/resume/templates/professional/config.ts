import { TemplateConfig } from '../types'

export const professionalDefaultConfig: TemplateConfig = {
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
      h1: 26,
      h2: 16,
      body: 11,
    },
    lineHeight: 1.5,
    letterSpacing: 0.2,
    fontWeight: {
      heading: 600,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#1e40af',
      secondary: '#475569',
      accent: '#3b82f6',
      text: '#0f172a',
    },
    bulletStyle: 'circle',
    dividers: true,
    headerStyle: 'centered',
  },
  spacing: {
    sectionGap: 22,
    itemGap: 7,
    pageMargin: 26,
  },
}


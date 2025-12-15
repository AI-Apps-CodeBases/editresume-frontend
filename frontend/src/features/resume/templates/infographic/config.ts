import { TemplateConfig } from '../types'

export const infographicDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'balanced',
  },
  typography: {
    fontFamily: {
      heading: 'Montserrat',
      body: 'Roboto',
    },
    fontSize: {
      h1: 32,
      h2: 18,
      body: 11,
    },
    lineHeight: 1.6,
    letterSpacing: 0.3,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#10b981',
      text: '#1f2937',
    },
    bulletStyle: 'circle',
    dividers: false,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 24,
    itemGap: 10,
    pageMargin: 28,
  },
}


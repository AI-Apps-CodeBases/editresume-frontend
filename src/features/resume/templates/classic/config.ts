import { TemplateConfig } from '../types'

export const classicDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'balanced',
  },
  typography: {
    fontFamily: {
      heading: 'Merriweather',
      body: 'Lora',
    },
    fontSize: {
      h1: 24,
      h2: 18,
      body: 11,
    },
    lineHeight: 1.6,
    letterSpacing: 0,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#1f2937',
      secondary: '#4b5563',
      accent: '#6b7280',
      text: '#111827',
    },
    bulletStyle: 'circle',
    dividers: true,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 20,
    itemGap: 8,
    pageMargin: 24,
  },
}



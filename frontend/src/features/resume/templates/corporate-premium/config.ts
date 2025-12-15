import { TemplateConfig } from '../types'

export const corporatePremiumDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'asymmetric',
    sectionOrder: [],
    spacing: 'balanced',
    columnWidth: 30,
  },
  typography: {
    fontFamily: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro',
    },
    fontSize: {
      h1: 28,
      h2: 16,
      body: 10,
    },
    lineHeight: 1.6,
    letterSpacing: 0.2,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#1e3a8a',
      secondary: '#64748b',
      accent: '#d97706',
      text: '#1f2937',
    },
    bulletStyle: 'dash',
    dividers: true,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 20,
    itemGap: 8,
    pageMargin: 24,
  },
}


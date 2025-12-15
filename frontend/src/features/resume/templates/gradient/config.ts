import { TemplateConfig } from '../types'

export const gradientDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'spacious',
  },
  typography: {
    fontFamily: {
      heading: 'Poppins',
      body: 'Inter',
    },
    fontSize: {
      h1: 34,
      h2: 18,
      body: 11,
    },
    lineHeight: 1.7,
    letterSpacing: 0.3,
    fontWeight: {
      heading: 600,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      text: '#1e293b',
    },
    bulletStyle: 'circle',
    dividers: false,
    headerStyle: 'banner',
  },
  spacing: {
    sectionGap: 30,
    itemGap: 10,
    pageMargin: 32,
  },
}


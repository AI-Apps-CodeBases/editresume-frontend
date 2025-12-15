import { TemplateConfig } from '../types'

export const minimalDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'compact',
  },
  typography: {
    fontFamily: {
      heading: 'Inter',
      body: 'Inter',
    },
    fontSize: {
      h1: 22,
      h2: 14,
      body: 10,
    },
    lineHeight: 1.4,
    letterSpacing: 0.3,
    fontWeight: {
      heading: 500,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#999999',
      text: '#1a1a1a',
    },
    bulletStyle: 'dash',
    dividers: false,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 16,
    itemGap: 4,
    pageMargin: 20,
  },
}


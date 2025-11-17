import { TemplateConfig } from '../types'

export const twoColumnDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'two-column',
    sectionOrder: [],
    spacing: 'balanced',
    columnWidth: 40, // 40% left, 60% right
  },
  typography: {
    fontFamily: {
      heading: 'Roboto',
      body: 'Open Sans',
    },
    fontSize: {
      h1: 22,
      h2: 14,
      body: 10,
    },
    lineHeight: 1.5,
    letterSpacing: 0,
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
      text: '#1e293b',
    },
    bulletStyle: 'circle',
    dividers: true,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 16,
    itemGap: 6,
    pageMargin: 20,
  },
}


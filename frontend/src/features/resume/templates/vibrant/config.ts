import { TemplateConfig } from '../types'

export const vibrantDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'spacious',
  },
  typography: {
    fontFamily: {
      heading: 'Montserrat',
      body: 'Open Sans',
    },
    fontSize: {
      h1: 36,
      h2: 20,
      body: 11,
    },
    lineHeight: 1.6,
    letterSpacing: 0.5,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      text: '#1f2937',
    },
    bulletStyle: 'square',
    dividers: false,
    headerStyle: 'banner',
  },
  spacing: {
    sectionGap: 28,
    itemGap: 10,
    pageMargin: 32,
  },
}


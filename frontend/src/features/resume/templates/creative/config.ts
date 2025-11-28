import { TemplateConfig } from '../types'

export const creativeDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'spacious',
  },
  typography: {
    fontFamily: {
      heading: 'Montserrat',
      body: 'Lato',
    },
    fontSize: {
      h1: 32,
      h2: 18,
      body: 11,
    },
    lineHeight: 1.6,
    letterSpacing: 1,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#8b5cf6',
      secondary: '#64748b',
      accent: '#a78bfa',
      text: '#0f172a',
    },
    bulletStyle: 'square',
    dividers: false,
    headerStyle: 'banner',
  },
  spacing: {
    sectionGap: 28,
    itemGap: 8,
    pageMargin: 32,
  },
}







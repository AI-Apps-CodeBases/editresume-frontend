import { TemplateConfig } from '../types'

export const atsFriendlyDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'compact',
  },
  typography: {
    fontFamily: {
      heading: 'Arial',
      body: 'Arial',
    },
    fontSize: {
      h1: 20,
      h2: 14,
      body: 11,
    },
    lineHeight: 1.4,
    letterSpacing: 0,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      text: '#000000',
    },
    bulletStyle: 'circle',
    dividers: true,
    headerStyle: 'left-aligned',
  },
  spacing: {
    sectionGap: 14,
    itemGap: 4,
    pageMargin: 20,
  },
}






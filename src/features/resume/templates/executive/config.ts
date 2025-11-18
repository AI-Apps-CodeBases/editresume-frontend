import { TemplateConfig } from '../types'

export const executiveDefaultConfig: TemplateConfig = {
  layout: {
    columns: 'single',
    sectionOrder: [],
    spacing: 'balanced',
  },
  typography: {
    fontFamily: {
      heading: 'Playfair Display',
      body: 'Lora',
    },
    fontSize: {
      h1: 26,
      h2: 16,
      body: 11,
    },
    lineHeight: 1.7,
    letterSpacing: 0.3,
    fontWeight: {
      heading: 700,
      body: 400,
    },
  },
  design: {
    colors: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      accent: '#8b7355',
      text: '#2d2d2d',
    },
    bulletStyle: 'dash',
    dividers: true,
    headerStyle: 'centered',
  },
  spacing: {
    sectionGap: 22,
    itemGap: 7,
    pageMargin: 30,
  },
}





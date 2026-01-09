export function getFontFamily(fontName: string): string {
  const fontMap: Record<string, string> = {
    'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Roboto': "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Lato': "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Montserrat': "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Merriweather': "'Merriweather', Georgia, 'Times New Roman', serif",
    'Lora': "'Lora', Georgia, 'Times New Roman', serif",
    'Arial': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  }
  
  return fontMap[fontName] || `'${fontName}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
}


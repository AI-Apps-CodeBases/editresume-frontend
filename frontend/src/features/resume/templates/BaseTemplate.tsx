import React from 'react'
import { TemplateProps, TemplateConfig } from './types'

export interface BaseTemplateProps extends TemplateProps {
  children?: React.ReactNode
}

export function applyReplacements(text: string, replacements: Record<string, string>): string {
  let result = text
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
  })
  return result
}

export function getSpacingPreset(preset: 'compact' | 'balanced' | 'spacious'): {
  sectionGap: number
  itemGap: number
  pageMargin: number
} {
  switch (preset) {
    case 'compact':
      return { sectionGap: 12, itemGap: 4, pageMargin: 16 }
    case 'balanced':
      return { sectionGap: 20, itemGap: 8, pageMargin: 24 }
    case 'spacious':
      return { sectionGap: 32, itemGap: 12, pageMargin: 32 }
  }
}

export function renderBulletPoints(
  bullets: Array<{ id: string; text: string; params?: Record<string, any> }>,
  config: TemplateConfig,
  replacements: Record<string, string>,
  bulletStyle?: 'circle' | 'square' | 'dash' | 'none'
): React.ReactNode {
  const style = bulletStyle || config.design.bulletStyle
  const validBullets = bullets.filter(b => b.text && b.text.trim())

  if (validBullets.length === 0) return null

  const bulletSymbols = {
    circle: '•',
    square: '■',
    dash: '—',
    none: '',
  }

  const bulletSymbol = bulletSymbols[style]

  // Group bullets by company headers (work experience format)
  const grouped: Array<{ type: 'header' | 'bullet'; bullet: typeof validBullets[0] }> = []
  
  validBullets.forEach((bullet) => {
    const text = bullet.text.trim()
    // Check if it's a company header: starts with ** and contains ** again
    const isHeader = text.startsWith('**') && text.includes('**', 2) && text.split('**').length >= 3
    
    if (isHeader) {
      grouped.push({ type: 'header', bullet })
    } else {
      grouped.push({ type: 'bullet', bullet })
    }
  })

  return (
    <div className="space-y-2">
      {grouped.map((item, idx) => {
        if (item.type === 'header') {
          // Company header - render as bold text without bullet point
          let cleanText = item.bullet.text.trim()
          // Remove ** markers
          cleanText = cleanText.replace(/\*\*/g, '')
          const processedText = applyReplacements(cleanText, replacements)

          return (
            <div
              key={item.bullet.id}
              className="mb-1"
              style={{
                fontFamily: config.typography.fontFamily.heading,
                fontSize: `${config.typography.fontSize.body + 1}px`,
                fontWeight: 600,
                color: config.design.colors.primary,
                marginTop: idx > 0 ? '8px' : '0',
              }}
            >
              {processedText}
            </div>
          )
        } else {
          // Regular bullet point
          let cleanText = item.bullet.text
          // Remove leading bullet markers
          if (cleanText.startsWith('• ')) cleanText = cleanText.substring(2)
          else if (cleanText.startsWith('•')) cleanText = cleanText.substring(1)
          else if (cleanText.startsWith('- ')) cleanText = cleanText.substring(2)
          else if (cleanText.startsWith('* ')) cleanText = cleanText.substring(2)

          // Convert **text** to <strong>text</strong> first
          let processedText = applyReplacements(cleanText, replacements)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          
          // Remove ALL bullet characters from anywhere in the text (not just at start)
          // This ensures no bullet characters appear in the content when we're using CSS bullets
          const bulletChars = ['•', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽', '■']
          bulletChars.forEach(char => {
            processedText = processedText.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
          })
          
          // Remove any remaining standalone * characters (not part of HTML tags)
          // This handles cases where * appears in the text after conversion
          processedText = processedText.replace(/\*(?![*<>/])/g, '')

          return (
            <div key={item.bullet.id} className="flex items-start gap-2" style={{ paddingLeft: style === 'none' ? 0 : '1.5rem' }}>
              {style !== 'none' && (
                <span className="flex-shrink-0 mt-1" style={{ color: config.design.colors.primary }}>
                  {bulletSymbol}
                </span>
              )}
              <span
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: processedText }}
                style={{
                  fontFamily: config.typography.fontFamily.body,
                  fontSize: `${config.typography.fontSize.body}px`,
                  lineHeight: config.typography.lineHeight,
                  color: config.design.colors.text,
                }}
              />
            </div>
          )
        }
      })}
    </div>
  )
}

export function BaseTemplate({ data, config, replacements, children }: BaseTemplateProps) {
  const spacing = getSpacingPreset(config.layout.spacing)
  const mergedSpacing = {
    ...spacing,
    ...config.spacing,
  }

  return (
    <div
      className="preview-resume-container bg-white"
      style={{
        fontFamily: config.typography.fontFamily.body,
        color: config.design.colors.text,
        padding: `${Math.max(mergedSpacing.pageMargin * 0.5, 8)}px`,
        maxWidth: '8.5in',
        margin: '0 auto',
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
      }}
    >
      {children}
      <style jsx>{`
        @media print {
          .preview-resume-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}


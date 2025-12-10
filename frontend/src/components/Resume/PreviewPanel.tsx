'use client'
import React, { useState, useEffect, useRef } from 'react'

interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Array<{
    id: string
    title: string
    bullets: Array<{
      id: string
      text: string
      params?: Record<string, any>
    }>
    params?: Record<string, any>
  }>
  fieldsVisible?: Record<string, boolean>
}

interface Props {
  data: ResumeData & {
    design?: {
      fonts?: {
        heading?: string
        body?: string
        size?: {
          heading?: number
          body?: number
        }
      }
      colors?: {
        primary?: string
        secondary?: string
        accent?: string
        text?: string
      }
      spacing?: {
        section?: number
        bullet?: number
      }
      layout?: {
        columns?: 1 | 2
        columnWidth?: number
      }
    }
  }
  replacements: Record<string, string>
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech' | 'modern-one' | 'classic-one' | 'minimal-one' | 'executive-one' | 'classic' | 'creative' | 'ats-friendly' | 'executive'
  templateConfig?: any
  constrained?: boolean // When true, adapts layout for constrained spaces like panels
}

export default function PreviewPanel({ 
  data, 
  replacements, 
  template = 'clean' as const,
  templateConfig,
  constrained = false
}: Props) {
  // Add A4 page break styles and dimensions
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .preview-resume-container {
        position: relative;
        page-break-inside: avoid;
      }
      
      /* A4 Page dimensions: 210mm x 297mm (8.27in x 11.69in) */
      .a4-page-view {
        width: 8.27in;
        min-height: 11.69in;
        background: white;
        margin: 0 auto 20px auto;
        padding: 0.1cm;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        position: relative;
        page-break-after: always;
        box-sizing: border-box;
      }
      
      .a4-page-view .preview-resume-container {
        width: 100%;
        padding: 0;
        margin: 0;
        max-width: 100%;
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
        box-sizing: border-box;
      }
      
      /* Ensure bullet points fit within page width */
      .a4-page-view li {
        max-width: 100%;
        width: 100%;
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
        box-sizing: border-box;
      }
      
      .a4-page-view ul {
        max-width: 100%;
        width: 100%;
        padding-left: 0;
        margin-left: 0;
        box-sizing: border-box;
      }
      
      /* Ensure flex containers don't overflow */
      .a4-page-view .flex {
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
      }
      
      /* Ensure text doesn't overflow */
      .a4-page-view * {
        max-width: 100%;
        box-sizing: border-box;
      }
      
      /* Ensure bullet text spans wrap properly */
      .a4-page-view li span {
        min-width: 0;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }
      
      /* Page break indicator line at A4 page height (11.69in) - only show on pages that aren't the last */
      .a4-page-view:not(:last-child)::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: repeating-linear-gradient(
          to right,
          #ef4444 0px,
          #ef4444 15px,
          transparent 15px,
          transparent 30px
        );
        z-index: 10;
        pointer-events: none;
      }
      
      /* Page break label - only show on pages that aren't the last */
      .a4-page-view:not(:last-child)::before {
        content: "Page Break";
        position: absolute;
        bottom: 0.2cm;
        right: 0.3cm;
        font-size: 9px;
        color: #ef4444;
        background: white;
        padding: 2px 8px;
        border-radius: 3px;
        border: 1px solid #ef4444;
        z-index: 11;
        font-weight: 600;
        pointer-events: none;
      }
      
      /* Container for all pages */
      .a4-pages-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        background: #f3f4f6;
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
      }
      
      /* Responsive container for constrained spaces */
      .a4-pages-container.constrained {
        min-height: auto;
        padding: 10px;
        max-width: 100%;
        overflow-x: hidden;
      }
      
      /* Responsive page view for constrained spaces */
      .a4-pages-container.constrained .a4-page-view {
        width: 100%;
        max-width: min(8.27in, calc(100vw - 40px));
        min-height: auto;
        transform: scale(1);
        transform-origin: top center;
      }
      
      /* Scale down content in very narrow containers */
      @media (max-width: 640px) {
        .a4-pages-container.constrained .a4-page-view {
          transform: scale(0.8);
          margin-bottom: 10px;
        }
      }
      
      /* Page break indicators within content - show at every 11.69in */
      .page-break-marker {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: repeating-linear-gradient(
          to right,
          #3b82f6 0px,
          #3b82f6 10px,
          transparent 10px,
          transparent 20px
        );
        z-index: 5;
        pointer-events: none;
      }
      
      .page-break-label {
        position: absolute;
        right: 0.3cm;
        font-size: 9px;
        color: #3b82f6;
        background: white;
        padding: 2px 8px;
        border-radius: 3px;
        border: 1px solid #3b82f6;
        z-index: 6;
        font-weight: 600;
        pointer-events: none;
      }
      
      .page-number {
        position: absolute;
        top: 0.2cm;
        right: 0.3cm;
        font-size: 10px;
        color: #6b7280;
        background: white;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid #d1d5db;
        z-index: 11;
        font-weight: 500;
      }
      
      .page-layout-indicator {
        height: 1px;
        background: #e5e7eb;
        border: none;
        margin: 20px 0;
        position: relative;
      }
      
      .page-layout-indicator::after {
        content: "Page 1";
        position: absolute;
        right: 0;
        top: -8px;
        background: #f3f4f6;
        color: #6b7280;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid #d1d5db;
      }
      
      @media print {
        .preview-resume-container {
          box-shadow: none !important;
          border: none !important;
        }
        
        .a4-page-view {
          box-shadow: none !important;
          margin: 0 !important;
        }
        
        .a4-page-view::after {
          display: none;
        }
        
        .page-number {
          display: none;
        }
        
        .page-break-indicator {
          page-break-before: always;
          height: 0;
          border: none;
          background: none;
        }
        
        .page-break-indicator::before {
          display: none;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Live-only PreviewPanel; page-level controls handle mode

  // Helper function for border styling
  const getBorderClass = () => {
    return template === 'clean' || template === 'tech' ? 'border-black' : 'border-gray-300'
  }

  const applyReplacements = (text: string) => {
    let result = text
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const design = data.design || {}
  const fonts = design.fonts || {}
  const colors = design.colors || {}
  const spacing = design.spacing || {}
  const layout = design.layout || {}
  
  // Use templateConfig if available, otherwise fall back to old template logic
  const isTwoColumn = templateConfig?.layout?.columns === 'two-column' || 
                      templateConfig?.layout?.columns === 'asymmetric' ||
                      layout.columns === 2 || 
                      template === 'two-column'
  
  const columnWidth = templateConfig?.layout?.columnWidth || layout.columnWidth || 50
  
  // Helper function to get ordered sections respecting sectionOrder from templateConfig
  const getOrderedSections = (sections: typeof data.sections, excludeTitles: string[] = []) => {
    const filtered = sections.filter((s) => {
      return s.params?.visible !== false && !excludeTitles.includes(s.title)
    })
    
    // Apply section order if available
    if (templateConfig?.layout?.sectionOrder && templateConfig.layout.sectionOrder.length > 0) {
      const sectionOrder = templateConfig.layout.sectionOrder as string[]
      // Filter out summary ID from section order (it's handled separately)
      const sectionOrderWithoutSummary = sectionOrder.filter((id: string) => id !== '__summary__')
      const orderedSections = sectionOrderWithoutSummary
        .map((id: string) => filtered.find(s => s.id === id))
        .filter(Boolean) as typeof filtered
      const unorderedSections = filtered.filter(s => !sectionOrderWithoutSummary.includes(s.id))
      return [...orderedSections, ...unorderedSections]
    }
    
    return filtered
  }
  
  // Helper to get summary position in section order
  const getSummaryPosition = () => {
    if (!data.summary || (data as any).fieldsVisible?.summary === false) return null
    if (!templateConfig?.layout?.sectionOrder || templateConfig.layout.sectionOrder.length === 0) return 'before' // Default: before sections
    
    const summaryIndex = templateConfig.layout.sectionOrder.indexOf('__summary__')
    if (summaryIndex === -1) return 'before' // Not in order, default to before
    
    // Check if summary should be before or after sections
    const firstSectionIndex = (templateConfig.layout.sectionOrder as string[]).findIndex((id: string) => 
      id !== '__summary__' && (data.sections || []).some(s => s.id === id)
    )
    
    if (firstSectionIndex === -1) return 'before' // No sections, summary first
    return summaryIndex < firstSectionIndex ? 'before' : 'after'
  }
  
  const headerAlign = templateConfig?.design?.headerStyle === 'centered' || 
                      template === 'clean' || 
                      template === 'two-column' || 
                      template === 'compact' || 
                      template === 'classic' 
                      ? 'center' 
                      : 'left'
  const headerBorder = template === 'clean' || template === 'classic' ? 'border-b-2 border-black' : template === 'minimal' ? 'border-b border-gray-300' : 'border-b'
  const sectionUppercase = template === 'clean' || template === 'compact' || template === 'classic'
  const fontFamily = template === 'clean' || template === 'classic' ? 'font-serif' : 'font-sans'
  
  const headingFont = templateConfig?.typography?.fontFamily?.heading || 
                      fonts.heading || 
                      (template === 'clean' || template === 'classic' ? 'serif' : 'sans-serif')
  const bodyFont = templateConfig?.typography?.fontFamily?.body || 
                    fonts.body || 
                    (template === 'clean' || template === 'classic' ? 'serif' : 'sans-serif')
  const headingSize = templateConfig?.typography?.fontSize?.h1 || fonts.size?.heading || 18
  const bodySize = templateConfig?.typography?.fontSize?.body || fonts.size?.body || 12
  const primaryColor = templateConfig?.design?.colors?.primary || colors.primary || '#000000'
  const secondaryColor = templateConfig?.design?.colors?.secondary || colors.secondary || '#000000'
  const accentColor = templateConfig?.design?.colors?.accent || colors.accent || '#000000'
  const textColor = templateConfig?.design?.colors?.text || colors.text || '#000000'
  const sectionSpacing = templateConfig?.spacing?.sectionGap || spacing.section || 16
  const bulletSpacing = templateConfig?.spacing?.itemGap || spacing.bullet || 8
  
  // Get bullet style from templateConfig
  const bulletStyle = templateConfig?.design?.bulletStyle || 'circle'
  const bulletSymbols: Record<string, string> = {
    circle: '•',
    square: '■',
    dash: '—',
    none: ''
  }
  const bulletSymbol = bulletSymbols[bulletStyle] || '•'

  const renderBullets = (bullets: any[], sectionTitle: string) => {
    // Safety check: ensure bullets is an array
    if (!bullets || !Array.isArray(bullets)) {
      return <div className="text-gray-500 text-sm">No content available</div>
    }

    const isWorkExperience = sectionTitle.toLowerCase().includes('experience') || 
                             sectionTitle.toLowerCase().includes('work') || 
                             sectionTitle.toLowerCase().includes('employment')
    const isSkillSection = sectionTitle.toLowerCase().includes('skill') || 
                            sectionTitle.toLowerCase().includes('technical') || 
                            sectionTitle.toLowerCase().includes('technology') || 
                            sectionTitle.toLowerCase().includes('competencies') || 
                            sectionTitle.toLowerCase().includes('expertise') || 
                            sectionTitle.toLowerCase().includes('proficiencies')
    
    // Filter out empty bullets and hidden bullets (visible: false)
    // For work experience, also hide bullets if their parent company header is hidden
    let validBullets: any[] = []
    
    if (isWorkExperience) {
      // For work experience, process headers and their associated bullets
      let currentHeaderVisible = true
      for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i]
        const isHeader = bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)
        
        if (isHeader) {
          // Check if this header is visible
          currentHeaderVisible = bullet.params?.visible !== false && bullet.text?.trim()
          if (currentHeaderVisible) {
            validBullets.push(bullet)
          }
        } else {
          // This is a bullet point - only include if current header is visible and bullet itself is visible
          if (currentHeaderVisible && bullet.params?.visible !== false && bullet.text?.trim()) {
            validBullets.push(bullet)
          }
        }
      }
    } else {
      // For non-work experience sections, just filter by visibility
      validBullets = bullets.filter(b => 
        b.text && b.text.trim() && b.params?.visible !== false && !b.text?.startsWith('**')
      )
    }
    
    if (validBullets.length === 0) {
      return <div className="text-gray-500 text-sm">No content available</div>
    }
    
    // Skills section - render as chips
    if (isSkillSection) {
      return (
        <div className="flex flex-wrap gap-2">
          {validBullets.map((bullet) => {
            const skillName = bullet.text.replace(/^•\s*/, '').trim()
            if (!skillName) return null
            
            return (
              <span
                key={bullet.id}
                className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {applyReplacements(skillName)}
              </span>
            )
          })}
        </div>
      )
    }
    
    // Group bullets by company headers for proper rendering
    const renderBullets = () => {
      const elements: JSX.Element[] = []
      let currentList: JSX.Element[] = []
      
      validBullets.forEach((bullet, index) => {
        const isHeader = bullet.text.startsWith('**') && bullet.text.includes('**', 2)
        
        if (isHeader) {
          // Close previous list if exists
          if (currentList.length > 0) {
            elements.push(
              <ul key={`list-${index}`} className="space-y-1">
                {currentList}
              </ul>
            )
            currentList = []
          }
          
          // Add company header - new format: Company Name / Location / Title / Date Range
          const headerText = bullet.text.replace(/\*\*/g, '').trim()
          const parts = headerText.split(' / ')
          // Support both old format (3 parts) and new format (4 parts)
          const companyName = parts[0]?.trim() || ''
          const location = parts.length >= 4 ? parts[1]?.trim() : ''
          const title = parts.length >= 4 ? parts[2]?.trim() : (parts[1]?.trim() || '')
          const dateRange = parts.length >= 4 ? parts[3]?.trim() : (parts[2]?.trim() || '')
          
          elements.push(
            <div 
              key={bullet.id} 
              className="mb-2 mt-3 first:mt-0"
              style={{ 
                fontFamily: headingFont,
                marginBottom: `${Math.max(bulletSpacing * 1.2, 6)}px`,
                marginTop: index === 0 ? 0 : `${Math.max(bulletSpacing * 1.2, 8)}px`,
              }}
            >
              {/* Line 1: Company Name / Location */}
              <div 
                className="font-bold"
                style={{ 
                  fontSize: `${headingSize * 1.15}px`,
                  color: primaryColor,
                  fontWeight: 'bold'
                }}
              >
                {applyReplacements(companyName)}
                {location && (
                  <>
                    {' / '}
                    <span style={{ fontWeight: 'normal', fontSize: `${headingSize}px` }}>
                      {applyReplacements(location)}
                    </span>
                  </>
                )}
              </div>
              {/* Line 2: Title (left) and Date Range (right) */}
              <div 
                className="flex items-center justify-between mt-1"
                style={{ 
                  fontSize: `${headingSize}px`,
                  color: primaryColor,
                }}
              >
                <span className="font-medium">{applyReplacements(title)}</span>
                <span className="text-gray-600" style={{ fontSize: `${headingSize * 0.9}px` }}>
                  {applyReplacements(dateRange)}
                </span>
              </div>
            </div>
          )
        } else {
          // Add bullet to current list
          let cleanText = bullet.text
          // Remove leading bullet markers
          if (cleanText.startsWith('• ')) {
            cleanText = cleanText.substring(2)
          } else if (cleanText.startsWith('•')) {
            cleanText = cleanText.substring(1)
          } else if (cleanText.startsWith('- ')) {
            cleanText = cleanText.substring(2)
          } else if (cleanText.startsWith('* ')) {
            cleanText = cleanText.substring(2)
          }
          
          // Convert **text** to <strong>text</strong> first
          cleanText = applyReplacements(cleanText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          
          // Remove ALL bullet characters from anywhere in the text (not just at start)
          // This ensures no bullet characters appear in the content when we're using CSS bullets
          const bulletChars = ['•', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽', '■']
          bulletChars.forEach(char => {
            cleanText = cleanText.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
          })
          
          // Remove any remaining standalone * characters (not part of HTML tags)
          // This handles cases where * appears in the text after conversion
          cleanText = cleanText.replace(/\*(?![*<>/])/g, '')
          
          currentList.push(
            <li 
              key={bullet.id} 
              className="text-sm leading-snug flex"
              style={{ 
                fontFamily: bodyFont,
                fontSize: `${bodySize}px`,
                color: textColor,
                marginBottom: `${Math.max(bulletSpacing * 0.6, 4)}px`,
                maxWidth: '100%',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {bulletStyle !== 'none' && (
                <span 
                  className="mr-1.5 flex-shrink-0"
                  style={{ color: primaryColor }}
                >
                  {bulletSymbol}
                </span>
              )}
              <span 
                className="flex-1 min-w-0" 
                style={{ 
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: cleanText
                }} 
              />
            </li>
          )
        }
      })
      
      // Close final list if exists
      if (currentList.length > 0) {
        elements.push(
          <ul key="list-final" className="space-y-1" style={{ maxWidth: '100%', width: '100%' }}>
            {currentList}
          </ul>
        )
      }
      
      return elements.length > 0 ? elements : (
        <ul className="space-y-1" style={{ maxWidth: '100%', width: '100%' }}>
          {validBullets.map((bullet) => {
            let cleanText = bullet.text
            // Remove leading bullet markers
            if (cleanText.startsWith('• ')) {
              cleanText = cleanText.substring(2)
            } else if (cleanText.startsWith('•')) {
              cleanText = cleanText.substring(1)
            } else if (cleanText.startsWith('- ')) {
              cleanText = cleanText.substring(2)
            } else if (cleanText.startsWith('* ')) {
              cleanText = cleanText.substring(2)
            }
            
            // Convert **text** to <strong>text</strong> first
            cleanText = applyReplacements(cleanText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            
            // Remove ALL bullet characters from anywhere in the text (not just at start)
            // This ensures no bullet characters appear in the content when we're using CSS bullets
            const bulletChars = ['•', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽', '■']
            bulletChars.forEach(char => {
              cleanText = cleanText.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
            })
            
            // Remove any remaining standalone * characters (not part of HTML tags)
            // This handles cases where * appears in the text after conversion
            cleanText = cleanText.replace(/\*(?![*<>/])/g, '')
            
            return (
              <li 
                key={bullet.id} 
                className="text-sm leading-snug flex"
                style={{ 
                  fontFamily: bodyFont,
                  fontSize: `${bodySize}px`,
                  color: textColor,
                  marginBottom: `${Math.max(bulletSpacing * 0.6, 4)}px`,
                  maxWidth: '100%',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {bulletStyle !== 'none' && (
                  <span 
                    className="mr-1.5 flex-shrink-0"
                    style={{ color: primaryColor }}
                  >
                    {bulletSymbol}
                  </span>
                )}
                <span 
                  className="flex-1 min-w-0" 
                  style={{ 
                    maxWidth: '100%',
                    overflowWrap: 'break-word',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    boxSizing: 'border-box'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: cleanText
                  }} 
                />
              </li>
            )
          })}
        </ul>
      )
    }
    
    return (
      <div className="space-y-1">
        {renderBullets()}
      </div>
    )
  }

  // State for two-column layout configuration
  const [leftSectionIds, setLeftSectionIds] = useState<string[]>([])
  const [rightSectionIds, setRightSectionIds] = useState<string[]>([])
  const [leftWidth, setLeftWidth] = useState(50)
  const SUMMARY_ID = '__summary__'

  // Update layout configuration when localStorage changes
  useEffect(() => {
    if (isTwoColumn && typeof window !== 'undefined') {
      const updateLayout = () => {
        const savedLeft = localStorage.getItem('twoColumnLeft')
        const savedRight = localStorage.getItem('twoColumnRight')
        const savedWidth = localStorage.getItem('twoColumnLeftWidth')
        
        let leftIds: string[] = savedLeft ? JSON.parse(savedLeft) : []
        let rightIds: string[] = savedRight ? JSON.parse(savedRight) : []
        
        // If no configuration exists, use default distribution
        if (leftIds.length === 0 && rightIds.length === 0) {
          const allSections = (data.sections || [])
            .filter(s => {
              const excludedTitles = ['Contact Information', 'Contact', 'Title Section', 'Title']
              return s.params?.visible !== false && !excludedTitles.includes(s.title)
            })
          
          // Default distribution: Skills, Certificates, Education on left; everything else on right
          const leftColumnKeywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
          
          // Add summary to left by default if it exists
          if (data.summary && !leftIds.includes(SUMMARY_ID) && !rightIds.includes(SUMMARY_ID)) {
            leftIds.push(SUMMARY_ID)
          }
          
          leftIds = [
            ...leftIds.filter(id => id === SUMMARY_ID),
            ...allSections
              .filter(s => {
                const titleLower = s.title.toLowerCase()
                return leftColumnKeywords.some(keyword => titleLower.includes(keyword))
              })
              .map(s => s.id)
          ]
          
          rightIds = allSections
            .filter(s => {
              const titleLower = s.title.toLowerCase()
              return !leftColumnKeywords.some(keyword => titleLower.includes(keyword))
            })
            .map(s => s.id)
          
          // Save default distribution to localStorage so it persists
          if (leftIds.length > 0 || rightIds.length > 0) {
            localStorage.setItem('twoColumnLeft', JSON.stringify(leftIds))
            localStorage.setItem('twoColumnRight', JSON.stringify(rightIds))
          }
        } else {
          // Ensure summary is included if it exists and not already assigned
          if (data.summary && !leftIds.includes(SUMMARY_ID) && !rightIds.includes(SUMMARY_ID)) {
            leftIds.push(SUMMARY_ID)
            localStorage.setItem('twoColumnLeft', JSON.stringify(leftIds))
          }
        }
        
        setLeftSectionIds(leftIds)
        setRightSectionIds(rightIds)
        // Use templateConfig columnWidth if available, otherwise localStorage, otherwise default
        const finalWidth = templateConfig?.layout?.columnWidth || (savedWidth ? Number(savedWidth) : 50)
        setLeftWidth(finalWidth)
      }
      
      // Initial load
      updateLayout()
      
      // Listen for storage changes (from other tabs/components)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'twoColumnLeft' || e.key === 'twoColumnRight' || e.key === 'twoColumnLeftWidth') {
          updateLayout()
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      // Poll for changes (since same-tab localStorage changes don't trigger storage events)
      const interval = setInterval(updateLayout, 500)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    } else {
      // Reset when not two-column
      setLeftSectionIds([])
      setRightSectionIds([])
    }
  }, [isTwoColumn, data.sections, template])

  const contentRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  
  // Calculate number of pages needed
  useEffect(() => {
    const calculatePages = () => {
      if (contentRef.current) {
        // Wait for content to render
        setTimeout(() => {
          if (contentRef.current) {
            const contentHeight = contentRef.current.scrollHeight
            // A4 page height: 11.69in = ~1123px (at 96 DPI, but we need to account for padding)
            // With 0.3cm padding top and bottom, usable height is ~11.69in - 0.6cm = ~11.39in
            const pageHeightIn = 11.39 // Usable height per page in inches
            const pageHeightPx = pageHeightIn * 96 // Convert to pixels
            const pages = Math.ceil(contentHeight / pageHeightPx)
            setPageCount(Math.max(1, pages))
          }
        }, 100)
      }
    }
    
    calculatePages()
    const timer = setInterval(calculatePages, 500)
    
    return () => clearInterval(timer)
  }, [data, templateConfig, sectionSpacing, bulletSpacing])
  
  // Render the actual content
  const renderContent = () => (
    <div 
      ref={contentRef}
      className="preview-resume-container"
      style={{
        fontFamily: bodyFont,
        color: textColor,
        '--primary-color': primaryColor,
        '--secondary-color': secondaryColor,
        '--accent-color': accentColor,
        '--text-color': textColor,
        '--section-spacing': `${sectionSpacing}px`,
        '--bullet-spacing': `${bulletSpacing}px`
      } as React.CSSProperties & Record<string, string>}
    >
        <div className={`space-y-6 ${fontFamily}`} style={{ gap: `${sectionSpacing}px` }}>
        {data.name && (data as any).fieldsVisible?.name !== false && (
          <div className={`${headerAlign === 'center' ? 'text-center' : 'text-left'} ${headerBorder} pb-4`}>
            {/* Name */}
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ 
                fontFamily: headingFont,
                fontSize: `${headingSize * 1.67}px`,
                color: primaryColor
              }}
            >
              {applyReplacements(data.name)}
            </h1>
            
            {/* Title Section - Bold, smaller than name */}
            <div className="mb-3">
              {data.title && (data as any).fieldsVisible?.title !== false && (
                <h2 
                  className="font-bold"
                  style={{ 
                    fontFamily: headingFont,
                    fontSize: `${headingSize * 1.2}px`,
                    color: primaryColor
                  }}
                >
                  {applyReplacements(data.title)}
                </h2>
              )}
              {/* Custom title fields */}
              {Object.keys(data as any)
                .filter(key => key.startsWith('customTitle') && typeof (data as any)[key] === 'string' && (data as any)[key])
                .filter(key => (data as any).fieldsVisible?.[key] !== false)
                .map(key => (
                  <h2 
                    key={key}
                    className="font-bold"
                    style={{ 
                      fontFamily: headingFont,
                      fontSize: `${headingSize * 1.2}px`,
                      color: primaryColor
                    }}
                  >
                    {applyReplacements((data as any)[key])}
                  </h2>
                ))}
            </div>
            
            {/* Contact Information - Separate line */}
            <div 
              className={`flex items-center ${headerAlign === 'center' ? 'justify-center' : 'justify-start'} gap-3 text-sm flex-wrap`}
              style={{ 
                fontFamily: bodyFont,
                fontSize: `${bodySize}px`,
                color: secondaryColor
              }}
            >
              {data.email && (data as any).fieldsVisible?.email !== false && <span>{applyReplacements(data.email)}</span>}
              {data.phone && (data as any).fieldsVisible?.phone !== false && <span>• {applyReplacements(data.phone)}</span>}
              {data.location && (data as any).fieldsVisible?.location !== false && <span>• {applyReplacements(data.location)}</span>}
              {(data as any).linkedin && (data as any).fieldsVisible?.linkedin !== false && <span>• {applyReplacements((data as any).linkedin)}</span>}
              {(data as any).website && (data as any).fieldsVisible?.website !== false && <span>• {applyReplacements((data as any).website)}</span>}
              {(data as any).github && (data as any).fieldsVisible?.github !== false && <span>• {applyReplacements((data as any).github)}</span>}
              {(data as any).portfolio && (data as any).fieldsVisible?.portfolio !== false && <span>• {applyReplacements((data as any).portfolio)}</span>}
              {(data as any).twitter && (data as any).fieldsVisible?.twitter !== false && <span>• {applyReplacements((data as any).twitter)}</span>}
              {/* Display custom contact fields (but not custom title fields) */}
              {Object.keys(data as any).filter(key => 
                !['name', 'title', 'email', 'phone', 'location', 'summary', 'sections', 'fieldsVisible', 'linkedin', 'website', 'github', 'portfolio', 'twitter', 'design'].includes(key) &&
                !key.startsWith('customTitle') &&
                typeof (data as any)[key] === 'string' &&
                (data as any)[key] &&
                (data as any).fieldsVisible?.[key] !== false
              ).map(key => (
                <span key={key}>• {applyReplacements((data as any)[key])}</span>
              ))}
            </div>
          </div>
        )}


        {isTwoColumn ? (
          <div className="grid gap-4" style={{ 
            gridTemplateColumns: `${columnWidth}% ${100 - columnWidth}%`,
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100%'
          }}>
            <div className="space-y-6" style={{
              overflowWrap: 'break-word',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* Professional Summary - Show in left column if assigned */}
              {data.summary && (data as any).fieldsVisible?.summary !== false && leftSectionIds.includes(SUMMARY_ID) && (
                <div style={{ marginBottom: `${sectionSpacing}px` }}>
                  <h2 
                    className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${getBorderClass()} pb-1 mb-3`}
                    style={{ 
                      fontFamily: headingFont,
                      fontSize: `${headingSize}px`,
                      color: primaryColor,
                      borderColor: primaryColor,
                      marginBottom: `${sectionSpacing}px`
                    }}
                  >
                    Professional Summary
                  </h2>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ 
                      fontFamily: bodyFont,
                      fontSize: `${bodySize}px`,
                      color: textColor
                    }}
                  >
                    {applyReplacements(data.summary)}
                  </p>
                </div>
              )}

              {getOrderedSections(data.sections || [], ['Contact Information', 'Contact', 'Title Section', 'Title'])
                .filter(s => leftSectionIds.includes(s.id))
                .map((section) => (
                <div key={section.id} style={{ marginBottom: `${sectionSpacing}px` }}>
                  <h2 
                    className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${getBorderClass()} pb-1 mb-3`}
                    style={{ 
                      fontFamily: headingFont,
                      fontSize: `${headingSize}px`,
                      color: primaryColor,
                      borderColor: primaryColor,
                      marginBottom: `${sectionSpacing}px`
                    }}
                  >
                    {applyReplacements(section.title)}
                  </h2>
                  {renderBullets(section.bullets || [], section.title)}
                </div>
              ))}
            </div>
            
            <div className="space-y-6" style={{
              overflowWrap: 'break-word',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* Professional Summary - Show in right column if assigned */}
              {data.summary && (data as any).fieldsVisible?.summary !== false && rightSectionIds.includes(SUMMARY_ID) && (
                <div style={{ marginBottom: `${sectionSpacing}px` }}>
                  <h2 
                    className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${getBorderClass()} pb-1 mb-3`}
                    style={{ 
                      fontFamily: headingFont,
                      fontSize: `${headingSize}px`,
                      color: primaryColor,
                      borderColor: primaryColor,
                      marginBottom: `${sectionSpacing}px`
                    }}
                  >
                    Professional Summary
                  </h2>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ 
                      fontFamily: bodyFont,
                      fontSize: `${bodySize}px`,
                      color: textColor
                    }}
                  >
                    {applyReplacements(data.summary)}
                  </p>
                </div>
              )}

              {getOrderedSections(data.sections || [], ['Contact Information', 'Contact', 'Title Section', 'Title'])
                .filter(s => rightSectionIds.includes(s.id))
                .map((section) => (
                <div key={section.id} style={{ marginBottom: `${sectionSpacing}px` }}>
                  <h2 
                    className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${getBorderClass()} pb-1 mb-3`}
                    style={{ 
                      fontFamily: headingFont,
                      fontSize: `${headingSize}px`,
                      color: primaryColor,
                      borderColor: primaryColor,
                      marginBottom: `${sectionSpacing}px`
                    }}
                  >
                    {applyReplacements(section.title)}
                  </h2>
                  {renderBullets(section.bullets || [], section.title)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {(() => {
              const summaryPosition = getSummaryPosition()
              const orderedSections = getOrderedSections(data.sections || [], ['Professional Summary', 'Summary', 'Contact Information', 'Contact', 'Title Section', 'Title'])
              const shouldShowSummaryBefore = summaryPosition === 'before' || summaryPosition === null
              
              return (
                <>
                  {shouldShowSummaryBefore && data.summary && (data as any).fieldsVisible?.summary !== false && (
                    <div style={{ marginBottom: `${sectionSpacing}px` }}>
                      <h2 
                        className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}
                        style={{ 
                          fontFamily: headingFont,
                          fontSize: `${headingSize}px`,
                          color: primaryColor,
                          borderColor: primaryColor,
                          marginBottom: `${sectionSpacing}px`
                        }}
                      >
                        Professional Summary
                      </h2>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ 
                          fontFamily: bodyFont,
                          fontSize: `${bodySize}px`,
                          color: textColor
                        }}
                      >
                        {applyReplacements(data.summary)}
                      </p>
                    </div>
                  )}
                  
                  {orderedSections.map((section) => (
                    <div key={section.id} style={{ marginBottom: `${sectionSpacing}px` }}>
                      <h2 
                        className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}
                        style={{ 
                          fontFamily: headingFont,
                          fontSize: `${headingSize}px`,
                          color: primaryColor,
                          borderColor: primaryColor,
                          marginBottom: `${sectionSpacing}px`
                        }}
                      >
                        {applyReplacements(section.title)}
                      </h2>
                      {renderBullets(section.bullets, section.title)}
                    </div>
                  ))}
                  
                  {summaryPosition === 'after' && data.summary && (data as any).fieldsVisible?.summary !== false && (
                    <div style={{ marginBottom: `${sectionSpacing}px` }}>
                      <h2 
                        className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}
                        style={{ 
                          fontFamily: headingFont,
                          fontSize: `${headingSize}px`,
                          color: primaryColor,
                          borderColor: primaryColor,
                          marginBottom: `${sectionSpacing}px`
                        }}
                      >
                        Professional Summary
                      </h2>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ 
                          fontFamily: bodyFont,
                          fontSize: `${bodySize}px`,
                          color: textColor
                        }}
                      >
                        {applyReplacements(data.summary)}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}

        {/* Page Layout Indicator - After Sections for Single Column */}
        {!isTwoColumn && (data.sections || []).length > 0 && <hr className="page-layout-indicator" />}

        {!data.name && !data.title && (data.sections || []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Start editing to see your resume preview</p>
          </div>
        )}
      </div>
    </div>
  )
  
  return (
    <div className={`a4-pages-container${constrained ? ' constrained' : ''}`}>
      <div className="a4-page-view" style={{ position: 'relative', minHeight: 'auto' }}>
        <div className="page-number">Page 1</div>
        {renderContent()}
        {/* Add page break markers dynamically */}
        {Array.from({ length: pageCount - 1 }, (_, index) => {
          const pageBreakPosition = (index + 1) * 11.69 // Position in inches
          return (
            <React.Fragment key={`break-${index}`}>
              <div 
                className="page-break-marker"
                style={{ 
                  top: `${pageBreakPosition}in`,
                  position: 'absolute'
                }}
              />
              <div 
                className="page-break-label"
                style={{ 
                  top: `calc(${pageBreakPosition}in - 18px)`,
                  position: 'absolute'
                }}
              >
                Page {index + 2} Start
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}


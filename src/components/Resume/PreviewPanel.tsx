'use client'
import { useState, useEffect } from 'react'

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
}

export default function PreviewPanel({ 
  data, 
  replacements, 
  template = 'clean' as const,
  templateConfig
}: Props) {
  // Add page break styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .preview-resume-container {
        position: relative;
        page-break-inside: avoid;
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
      const sectionOrder = templateConfig.layout.sectionOrder
      // Filter out summary ID from section order (it's handled separately)
      const sectionOrderWithoutSummary = sectionOrder.filter(id => id !== '__summary__')
      const orderedSections = sectionOrderWithoutSummary
        .map(id => filtered.find(s => s.id === id))
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
    const firstSectionIndex = templateConfig.layout.sectionOrder.findIndex(id => 
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
                className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300"
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
              <ul key={`list-${index}`} className="space-y-2">
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
              className="mb-3 mt-5 first:mt-0"
              style={{ 
                fontFamily: headingFont,
                marginBottom: `${bulletSpacing * 2}px`,
                marginTop: index === 0 ? 0 : `${bulletSpacing * 2}px`,
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
          if (cleanText.startsWith('• ')) {
            cleanText = cleanText.substring(2)
          } else if (cleanText.startsWith('•')) {
            cleanText = cleanText.substring(1)
          } else if (cleanText.startsWith('- ')) {
            cleanText = cleanText.substring(2)
          } else if (cleanText.startsWith('* ')) {
            cleanText = cleanText.substring(2)
          }
          
          currentList.push(
            <li 
              key={bullet.id} 
              className="text-sm leading-relaxed flex"
              style={{ 
                fontFamily: bodyFont,
                fontSize: `${bodySize}px`,
                color: textColor,
                marginBottom: `${bulletSpacing}px`
              }}
            >
              <span 
                className="mr-2"
                style={{ color: primaryColor }}
              >
                •
              </span>
              <span 
                className="flex-1" 
                dangerouslySetInnerHTML={{ 
                  __html: applyReplacements(cleanText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }} 
              />
            </li>
          )
        }
      })
      
      // Close final list if exists
      if (currentList.length > 0) {
        elements.push(
          <ul key="list-final" className="space-y-2">
            {currentList}
          </ul>
        )
      }
      
      return elements.length > 0 ? elements : (
        <ul className="space-y-2">
          {validBullets.map((bullet) => {
            let cleanText = bullet.text
            if (cleanText.startsWith('• ')) {
              cleanText = cleanText.substring(2)
            } else if (cleanText.startsWith('•')) {
              cleanText = cleanText.substring(1)
            } else if (cleanText.startsWith('- ')) {
              cleanText = cleanText.substring(2)
            } else if (cleanText.startsWith('* ')) {
              cleanText = cleanText.substring(2)
            }
            return (
              <li 
                key={bullet.id} 
                className="text-sm leading-relaxed flex"
                style={{ 
                  fontFamily: bodyFont,
                  fontSize: `${bodySize}px`,
                  color: textColor,
                  marginBottom: `${bulletSpacing}px`
                }}
              >
                <span 
                  className="mr-2"
                  style={{ color: primaryColor }}
                >
                  •
                </span>
                <span 
                  className="flex-1" 
                  dangerouslySetInnerHTML={{ 
                    __html: applyReplacements(cleanText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} 
                />
              </li>
            )
          })}
        </ul>
      )
    }
    
    return (
      <div className="space-y-2">
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

  return (
    <div 
      className="bg-white rounded-2xl border border-gray-200 shadow-soft-lg p-8 preview-resume-container hover-lift"
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
          <div className="grid gap-8" style={{ gridTemplateColumns: `${columnWidth}% ${100 - columnWidth}%` }}>
            <div className="space-y-6">
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
            
            <div className="space-y-6">
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
}


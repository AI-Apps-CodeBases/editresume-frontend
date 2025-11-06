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
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech' | 'modern-one' | 'classic-one' | 'minimal-one' | 'executive-one'
}

export default function PreviewPanel({ data, replacements, template = 'clean' as const }: Props) {
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
  
  const headerAlign = template === 'clean' || template === 'two-column' || template === 'compact' ? 'center' : 'left'
  const headerBorder = template === 'clean' ? 'border-b-2 border-black' : template === 'minimal' ? 'border-b border-gray-300' : 'border-b'
  const sectionUppercase = template === 'clean' || template === 'compact'
  const fontFamily = template === 'clean' ? 'font-serif' : 'font-sans'
  const isTwoColumn = layout.columns === 2 || template === 'two-column'
  
  const headingFont = fonts.heading || (template === 'clean' ? 'serif' : 'sans-serif')
  const bodyFont = fonts.body || (template === 'clean' ? 'serif' : 'sans-serif')
  const headingSize = fonts.size?.heading || 18
  const bodySize = fonts.size?.body || 12
  const primaryColor = colors.primary || '#2563eb'
  const secondaryColor = colors.secondary || '#6b7280'
  const accentColor = colors.accent || '#8b5cf6'
  const textColor = colors.text || '#111827'
  const sectionSpacing = spacing.section || 16
  const bulletSpacing = spacing.bullet || 8

  const renderBullets = (bullets: any[], sectionTitle: string) => {
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
                className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #93c5fd'
                }}
              >
                {applyReplacements(skillName)}
              </span>
            )
          })}
        </div>
      )
    }
    
    return (
      <ul className="space-y-2">
        {validBullets.map((bullet, index) => {
          const isHeader = bullet.text.startsWith('**') && bullet.text.endsWith('**')
          const isBulletPoint = bullet.text.startsWith('•')
          
          if (isHeader) {
            return (
              <li 
                key={bullet.id} 
                className="font-bold text-base mb-2 mt-4 first:mt-0"
                style={{ 
                  fontFamily: headingFont,
                  fontSize: `${headingSize}px`,
                  color: primaryColor,
                  marginBottom: `${bulletSpacing * 2}px`,
                  marginTop: `${bulletSpacing * 2}px`
                }}
              >
                <span dangerouslySetInnerHTML={{ 
                  __html: applyReplacements(bullet.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }} />
              </li>
            )
          } else {
            // Remove existing bullet point if present to avoid double bullets
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
          }
        })}
      </ul>
    )
  }

  // State for two-column layout configuration
  const [leftSectionIds, setLeftSectionIds] = useState<string[]>([])
  const [rightSectionIds, setRightSectionIds] = useState<string[]>([])
  const [leftWidth, setLeftWidth] = useState(50)

  // Update layout configuration when localStorage changes
  useEffect(() => {
    if (isTwoColumn && typeof window !== 'undefined') {
      const updateLayout = () => {
        const savedLeft = localStorage.getItem('twoColumnLeft')
        const savedRight = localStorage.getItem('twoColumnRight')
        const savedWidth = localStorage.getItem('twoColumnLeftWidth')
        
        setLeftSectionIds(savedLeft ? JSON.parse(savedLeft) : [])
        setRightSectionIds(savedRight ? JSON.parse(savedRight) : [])
        setLeftWidth(savedWidth ? Number(savedWidth) : 50)
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
    }
  }, [isTwoColumn])

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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-gray-500">Live Preview</h3>
          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
            {template}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Auto-save enabled</span>
        </div>
      </div>

        <div className={`space-y-6 ${fontFamily}`} style={{ gap: `${sectionSpacing}px` }}>
        {data.name && (data as any).fieldsVisible?.name !== false && (
          <div className={`${headerAlign === 'center' ? 'text-center' : 'text-left'} ${headerBorder} pb-4`}>
            <h1 
              className="text-3xl font-bold"
              style={{ 
                fontFamily: headingFont,
                fontSize: `${headingSize * 1.67}px`,
                color: primaryColor
              }}
            >
              {applyReplacements(data.name)}
            </h1>
            {data.title && (data as any).fieldsVisible?.title !== false && (
              <p 
                className="text-lg mt-1"
                style={{ 
                  fontFamily: bodyFont,
                  fontSize: `${bodySize * 1.5}px`,
                  color: secondaryColor
                }}
              >
                {applyReplacements(data.title)}
              </p>
            )}
            <div 
              className={`flex items-center ${headerAlign === 'center' ? 'justify-center' : 'justify-start'} gap-3 mt-2 text-sm flex-wrap`}
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
              {/* Display any other custom contact fields */}
              {Object.keys(data as any).filter(key => 
                !['name', 'title', 'email', 'phone', 'location', 'summary', 'sections', 'fieldsVisible', 'linkedin', 'website', 'github', 'portfolio', 'twitter', 'design'].includes(key) &&
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
          <div className="grid gap-8" style={{ gridTemplateColumns: `${leftWidth}% ${100 - leftWidth}%` }}>
            <div className="space-y-6">
              {data.summary && (data as any).fieldsVisible?.summary !== false && (
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

              {/* Page Layout Indicator - After Summary */}
              {data.summary && <hr className="page-layout-indicator" />}

              {data.sections.filter((s) => 
                leftSectionIds.includes(s.id) && s.params?.visible !== false
              ).map((section) => (
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
                  {renderBullets(section.bullets, section.title)}
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              {data.sections.filter((s) => 
                rightSectionIds.includes(s.id) && s.params?.visible !== false
              ).map((section) => (
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
                  {renderBullets(section.bullets, section.title)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {data.summary && (data as any).fieldsVisible?.summary !== false && (
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

            {data.sections.filter((s) => s.params?.visible !== false).map((section) => (
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
          </>
        )}

        {/* Page Layout Indicator - After Sections for Single Column */}
        {!isTwoColumn && data.sections.length > 0 && <hr className="page-layout-indicator" />}

        {!data.name && !data.title && data.sections.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Start editing to see your resume preview</p>
          </div>
        )}
      </div>
    </div>
  )
}


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
      params: Record<string, string>
    }>
  }>
}

interface Props {
  data: ResumeData
  replacements: Record<string, string>
  template?: string
}

export default function PreviewPanel({ data, replacements, template = 'clean' }: Props) {
  const applyReplacements = (text: string) => {
    let result = text
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const renderBullets = (bullets: any[], sectionTitle: string) => {
    const isWorkExperience = sectionTitle.toLowerCase().includes('experience') || 
                             sectionTitle.toLowerCase().includes('work') || 
                             sectionTitle.toLowerCase().includes('employment')
    
    if (!isWorkExperience) {
      return (
        <ul className="space-y-2">
          {bullets.filter(b => b.text.trim()).map((bullet) => (
            <li key={bullet.id} className="text-sm leading-relaxed flex">
              <span className="mr-2">•</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ 
                __html: applyReplacements(bullet.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }} />
            </li>
          ))}
        </ul>
      )
    }
    
    // Work Experience - group by company
    const groups: JSX.Element[] = []
    let currentCompany: JSX.Element | null = null
    let currentTasks: JSX.Element[] = []
    
    bullets.forEach((bullet, index) => {
      const text = bullet.text.trim()
      
      if (!text) {
        // Empty separator - push current group
        if (currentCompany && currentTasks.length > 0) {
          groups.push(
            <div key={`group-${index}`} className="mb-4">
              {currentCompany}
              <ul className="space-y-1 mt-2">
                {currentTasks}
              </ul>
            </div>
          )
        }
        currentCompany = null
        currentTasks = []
      } else if (text.startsWith('**') && text.includes('**', 2)) {
        // Company header
        if (currentCompany && currentTasks.length > 0) {
          groups.push(
            <div key={`group-${index}`} className="mb-4">
              {currentCompany}
              <ul className="space-y-1 mt-2">
                {currentTasks}
              </ul>
            </div>
          )
        }
        currentCompany = (
          <div className="font-bold text-base text-gray-900" dangerouslySetInnerHTML={{
            __html: applyReplacements(text).replace(/\*\*(.*?)\*\*/g, '$1')
          }} />
        )
        currentTasks = []
      } else {
        // Regular bullet
        const cleanText = text.startsWith('• ') ? text.substring(2) : text
        currentTasks.push(
          <li key={bullet.id} className="text-sm leading-relaxed flex">
            <span className="mr-2">•</span>
            <span className="flex-1" dangerouslySetInnerHTML={{ 
              __html: applyReplacements(cleanText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
            }} />
          </li>
        )
      }
    })
    
    // Don't forget the last group
    if (currentCompany && currentTasks.length > 0) {
      groups.push(
        <div key={`group-last`} className="mb-4">
          {currentCompany}
          <ul className="space-y-1 mt-2">
            {currentTasks}
          </ul>
        </div>
      )
    }
    
    return <div className="space-y-4">{groups}</div>
  }

  const headerAlign = template === 'clean' || template === 'two-column' || template === 'compact' ? 'center' : 'left'
  const headerBorder = template === 'clean' ? 'border-b-2 border-black' : template === 'minimal' ? 'border-b border-gray-300' : 'border-b'
  const sectionUppercase = template === 'clean' || template === 'compact'
  const fontFamily = template === 'clean' ? 'font-serif' : 'font-sans'
  const isTwoColumn = template === 'two-column'
  
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
    <div className="bg-white rounded-2xl border shadow-lg p-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">Live Preview ({template})</h3>
      </div>

      <div className={`space-y-6 ${fontFamily}`}>
        {data.name && (
          <div className={`${headerAlign === 'center' ? 'text-center' : 'text-left'} ${headerBorder} pb-4`}>
            <h1 className="text-3xl font-bold">{applyReplacements(data.name)}</h1>
            {data.title && <p className="text-lg text-gray-700 mt-1">{applyReplacements(data.title)}</p>}
            <div className={`flex items-center ${headerAlign === 'center' ? 'justify-center' : 'justify-start'} gap-3 mt-2 text-sm text-gray-600`}>
              {data.email && <span>{applyReplacements(data.email)}</span>}
              {data.phone && <span>• {applyReplacements(data.phone)}</span>}
              {data.location && <span>• {applyReplacements(data.location)}</span>}
            </div>
          </div>
        )}

        {isTwoColumn ? (
          <div className="grid gap-8" style={{ gridTemplateColumns: `${leftWidth}% ${100 - leftWidth}%` }}>
            <div className="space-y-6">
              {data.summary && (
                <div>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    Professional Summary
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {applyReplacements(data.summary)}
                  </p>
                </div>
              )}

              {data.sections.filter((s) => leftSectionIds.includes(s.id)).map((section) => (
                <div key={section.id}>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    {applyReplacements(section.title)}
                  </h2>
                  {renderBullets(section.bullets, section.title)}
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              {data.sections.filter((s) => rightSectionIds.includes(s.id)).map((section) => (
                <div key={section.id}>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    {applyReplacements(section.title)}
                  </h2>
                  {renderBullets(section.bullets, section.title)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {data.summary && (
              <div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {applyReplacements(data.summary)}
                </p>
              </div>
            )}

            {data.sections.map((section) => (
              <div key={section.id}>
                <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                  {applyReplacements(section.title)}
                </h2>
                {renderBullets(section.bullets, section.title)}
              </div>
            ))}
          </>
        )}

        {!data.name && !data.title && data.sections.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Start editing to see your resume preview</p>
          </div>
        )}
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { TemplateConfig } from '../templates/types'

interface Section {
  id: string
  title: string
  bullets?: Array<{ id: string; text: string }>
}

interface Props {
  config: TemplateConfig
  onUpdate: (updates: Partial<TemplateConfig>) => void
  sections?: Section[]
  hasSummary?: boolean
  onSectionDistributionChange?: (leftIds: string[], rightIds: string[]) => void
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Arial', label: 'Arial' },
]

export function CustomizationControls({ config, onUpdate, sections, hasSummary, onSectionDistributionChange }: Props) {
  return (
    <div className="space-y-6">
      <LayoutControls 
        config={config} 
        onUpdate={onUpdate} 
        sections={sections}
        hasSummary={hasSummary}
        onSectionDistributionChange={onSectionDistributionChange}
      />
      <TypographyControls config={config} onUpdate={onUpdate} />
      <DesignControls config={config} onUpdate={onUpdate} />
      <SpacingControls config={config} onUpdate={onUpdate} />
    </div>
  )
}

function LayoutControls({ config, onUpdate, sections, hasSummary, onSectionDistributionChange }: Props & { sections?: Section[], hasSummary?: boolean, onSectionDistributionChange?: (leftIds: string[], rightIds: string[]) => void }) {
  const columnWidth = config.layout.columnWidth || 40
  const [leftSectionIds, setLeftSectionIds] = useState<string[]>([])
  const [rightSectionIds, setRightSectionIds] = useState<string[]>([])
  const SUMMARY_ID = '__summary__'

  useEffect(() => {
    if (typeof window !== 'undefined' && sections) {
      const savedLeft = localStorage.getItem('twoColumnLeft')
      const savedRight = localStorage.getItem('twoColumnRight')
      
      let leftIds: string[] = savedLeft ? JSON.parse(savedLeft) : []
      let rightIds: string[] = savedRight ? JSON.parse(savedRight) : []
      
      // If no configuration exists, use default distribution
      if (leftIds.length === 0 && rightIds.length === 0) {
        const allSections = sections.filter(s => {
          const excludedTitles = ['Contact Information', 'Contact', 'Title Section', 'Title']
          return !excludedTitles.includes(s.title)
        })
        
        const leftColumnKeywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
        
        // Add summary to left by default if it exists
        if (hasSummary && !leftIds.includes(SUMMARY_ID) && !rightIds.includes(SUMMARY_ID)) {
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
      } else {
        // Ensure summary is included if it exists
        if (hasSummary && !leftIds.includes(SUMMARY_ID) && !rightIds.includes(SUMMARY_ID)) {
          leftIds.push(SUMMARY_ID)
        }
      }
      
      setLeftSectionIds(leftIds)
      setRightSectionIds(rightIds)
    }
  }, [sections, hasSummary])

  const handleMoveSection = (sectionId: string, targetColumn: 'left' | 'right') => {
    const newLeftIds = targetColumn === 'left' 
      ? [...leftSectionIds.filter(id => id !== sectionId), sectionId]
      : leftSectionIds.filter(id => id !== sectionId)
    
    const newRightIds = targetColumn === 'right'
      ? [...rightSectionIds.filter(id => id !== sectionId), sectionId]
      : rightSectionIds.filter(id => id !== sectionId)
    
    setLeftSectionIds(newLeftIds)
    setRightSectionIds(newRightIds)
    
    localStorage.setItem('twoColumnLeft', JSON.stringify(newLeftIds))
    localStorage.setItem('twoColumnRight', JSON.stringify(newRightIds))
    
    if (onSectionDistributionChange) {
      onSectionDistributionChange(newLeftIds, newRightIds)
    }
  }
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Layout</h4>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Columns</label>
        <div className="grid grid-cols-3 gap-2">
          {(['single', 'two-column', 'asymmetric'] as const).map((col) => (
            <button
              key={col}
              onClick={() => {
                const updates: any = { layout: { ...config.layout, columns: col } }
                if (col === 'two-column' && !config.layout.columnWidth) {
                  updates.layout.columnWidth = 40
                }
                onUpdate(updates)
              }}
              className={`px-3 py-2 text-xs rounded border ${
                config.layout.columns === col
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200'
              }`}
            >
              {col === 'single' ? '1 Column' : col === 'two-column' ? '2 Columns' : 'Asymmetric'}
            </button>
          ))}
        </div>
      </div>
      {config.layout.columns === 'two-column' && (
        <>
          <div>
            <label className="text-xs text-gray-600 mb-2 block">
              Column Width: {columnWidth}% / {100 - columnWidth}%
            </label>
            <input
              type="range"
              min="20"
              max="80"
              value={columnWidth}
              onChange={(e) =>
                onUpdate({
                  layout: { ...config.layout, columnWidth: parseInt(e.target.value) },
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>20%</span>
              <span>50%</span>
              <span>80%</span>
            </div>
          </div>
          {(sections && sections.length > 0) || hasSummary ? (
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Section Distribution</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {/* Professional Summary */}
                {hasSummary && (
                  <div
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                  >
                    <span className="text-xs text-gray-700 flex-1">Professional Summary</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveSection(SUMMARY_ID, 'left')}
                        className={`px-2 py-1 text-xs rounded border ${
                          leftSectionIds.includes(SUMMARY_ID)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Move to left column"
                      >
                        ← Left
                      </button>
                      <button
                        onClick={() => handleMoveSection(SUMMARY_ID, 'right')}
                        className={`px-2 py-1 text-xs rounded border ${
                          rightSectionIds.includes(SUMMARY_ID)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Move to right column"
                      >
                        Right →
                      </button>
                    </div>
                  </div>
                )}
                {/* Regular Sections */}
                {sections
                  ?.filter(s => {
                    const excludedTitles = ['Contact Information', 'Contact', 'Title Section', 'Title']
                    return !excludedTitles.includes(s.title)
                  })
                  .map((section) => {
                    const isLeft = leftSectionIds.includes(section.id)
                    const isRight = rightSectionIds.includes(section.id)
                    
                    return (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                      >
                        <span className="text-xs text-gray-700 flex-1">{section.title}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveSection(section.id, 'left')}
                            className={`px-2 py-1 text-xs rounded border ${
                              isLeft
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                            title="Move to left column"
                          >
                            ← Left
                          </button>
                          <button
                            onClick={() => handleMoveSection(section.id, 'right')}
                            className={`px-2 py-1 text-xs rounded border ${
                              isRight
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                            title="Move to right column"
                          >
                            Right →
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <div>Left: {leftSectionIds.length} sections</div>
                <div>Right: {rightSectionIds.length} sections</div>
              </div>
            </div>
          ) : null}
        </>
      )}
      
      {/* Section Ordering - Available for all templates */}
      {(sections && sections.length > 0) || hasSummary ? (
        <div>
          <label className="text-xs text-gray-600 mb-2 block">Section Order</label>
          <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {(() => {
              // Get current section order from config, or use default order
              const sectionOrder = config.layout.sectionOrder || []
              const allSectionIds: string[] = []
              
              // Add summary if exists
              if (hasSummary) {
                allSectionIds.push(SUMMARY_ID)
              }
              
              // Add regular sections
              const regularSections = sections?.filter(s => {
                const excludedTitles = ['Contact Information', 'Contact', 'Title Section', 'Title']
                return !excludedTitles.includes(s.title)
              }) || []
              
              regularSections.forEach(s => {
                if (!allSectionIds.includes(s.id)) {
                  allSectionIds.push(s.id)
                }
              })
              
              // Use sectionOrder if available and valid, otherwise use natural order
              // If sectionOrder exists but doesn't include all current sections, merge them
              let orderedIds: string[]
              if (sectionOrder.length > 0) {
                // Start with ordered sections that still exist
                const validOrdered = sectionOrder.filter(id => allSectionIds.includes(id))
                // Add any new sections that weren't in the order
                const newSections = allSectionIds.filter(id => !sectionOrder.includes(id))
                orderedIds = [...validOrdered, ...newSections]
              } else {
                orderedIds = allSectionIds
              }
              
              return orderedIds.map((sectionId, index) => {
                const isSummary = sectionId === SUMMARY_ID
                const section = isSummary ? null : regularSections.find(s => s.id === sectionId)
                const sectionTitle = isSummary ? 'Professional Summary' : section?.title || 'Unknown'
                
                return (
                  <div
                    key={sectionId}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                      <span className="text-xs text-gray-700 flex-1">{sectionTitle}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (index > 0) {
                            const newOrder = [...orderedIds]
                            const [moved] = newOrder.splice(index, 1)
                            newOrder.splice(index - 1, 0, moved)
                            onUpdate({ layout: { ...config.layout, sectionOrder: newOrder } })
                          }
                        }}
                        disabled={index === 0}
                        className={`px-2 py-1 text-xs rounded border ${
                          index === 0
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          if (index < orderedIds.length - 1) {
                            const newOrder = [...orderedIds]
                            const [moved] = newOrder.splice(index, 1)
                            newOrder.splice(index + 1, 0, moved)
                            onUpdate({ layout: { ...config.layout, sectionOrder: newOrder } })
                          }
                        }}
                        disabled={index === orderedIds.length - 1}
                        className={`px-2 py-1 text-xs rounded border ${
                          index === orderedIds.length - 1
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          <p className="mt-2 text-xs text-gray-500">Use ↑ ↓ to reorder sections</p>
        </div>
      ) : null}
      
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Spacing Preset</label>
        <div className="grid grid-cols-3 gap-2">
          {(['compact', 'balanced', 'spacious'] as const).map((spacing) => (
            <button
              key={spacing}
              onClick={() => onUpdate({ layout: { ...config.layout, spacing } })}
              className={`px-3 py-2 text-xs rounded border capitalize ${
                config.layout.spacing === spacing
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200'
              }`}
            >
              {spacing}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TypographyControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Typography</h4>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Heading Font</label>
        <select
          value={config.typography.fontFamily.heading}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontFamily: { ...config.typography.fontFamily, heading: e.target.value },
              },
            })
          }
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Body Font</label>
        <select
          value={config.typography.fontFamily.body}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontFamily: { ...config.typography.fontFamily, body: e.target.value },
              },
            })
          }
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Heading Size: {config.typography.fontSize.h1}px
        </label>
        <input
          type="range"
          min="16"
          max="36"
          value={config.typography.fontSize.h1}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontSize: { ...config.typography.fontSize, h1: parseInt(e.target.value) },
              },
            })
          }
          className="w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Body Size: {config.typography.fontSize.body}px
        </label>
        <input
          type="range"
          min="9"
          max="14"
          value={config.typography.fontSize.body}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontSize: { ...config.typography.fontSize, body: parseInt(e.target.value) },
              },
            })
          }
          className="w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Line Height: {config.typography.lineHeight.toFixed(1)}
        </label>
        <input
          type="range"
          min="1.2"
          max="2.0"
          step="0.1"
          value={config.typography.lineHeight}
          onChange={(e) =>
            onUpdate({
              typography: { ...config.typography, lineHeight: parseFloat(e.target.value) },
            })
          }
          className="w-full"
        />
      </div>
    </div>
  )
}

function DesignControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Design</h4>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Primary Color</label>
        <input
          type="color"
          value={config.design.colors.primary}
          onChange={(e) =>
            onUpdate({
              design: {
                ...config.design,
                colors: { ...config.design.colors, primary: e.target.value },
              },
            })
          }
          className="w-full h-10 rounded-lg cursor-pointer"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Accent Color</label>
        <input
          type="color"
          value={config.design.colors.accent}
          onChange={(e) =>
            onUpdate({
              design: {
                ...config.design,
                colors: { ...config.design.colors, accent: e.target.value },
              },
            })
          }
          className="w-full h-10 rounded-lg cursor-pointer"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Text Color</label>
        <input
          type="color"
          value={config.design.colors.text}
          onChange={(e) =>
            onUpdate({
              design: {
                ...config.design,
                colors: { ...config.design.colors, text: e.target.value },
              },
            })
          }
          className="w-full h-10 rounded-lg cursor-pointer"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">Bullet Style</label>
        <div className="grid grid-cols-4 gap-2">
          {(['circle', 'square', 'dash', 'none'] as const).map((style) => (
            <button
              key={style}
              onClick={() => onUpdate({ design: { ...config.design, bulletStyle: style } })}
              className={`px-3 py-2 text-xs rounded border capitalize ${
                config.design.bulletStyle === style
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="dividers"
          checked={config.design.dividers}
          onChange={(e) => onUpdate({ design: { ...config.design, dividers: e.target.checked } })}
          className="rounded"
        />
        <label htmlFor="dividers" className="text-xs text-gray-600">
          Show Section Dividers
        </label>
      </div>
    </div>
  )
}

function SpacingControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Spacing</h4>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Section Gap: {config.spacing.sectionGap}px
        </label>
        <input
          type="range"
          min="8"
          max="40"
          value={config.spacing.sectionGap}
          onChange={(e) =>
            onUpdate({
              spacing: { ...config.spacing, sectionGap: parseInt(e.target.value) },
            })
          }
          className="w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Item Gap: {config.spacing.itemGap}px
        </label>
        <input
          type="range"
          min="2"
          max="16"
          value={config.spacing.itemGap}
          onChange={(e) =>
            onUpdate({
              spacing: { ...config.spacing, itemGap: parseInt(e.target.value) },
            })
          }
          className="w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-2 block">
          Page Margin: {config.spacing.pageMargin}px
        </label>
        <input
          type="range"
          min="12"
          max="48"
          value={config.spacing.pageMargin}
          onChange={(e) =>
            onUpdate({
              spacing: { ...config.spacing, pageMargin: parseInt(e.target.value) },
            })
          }
          className="w-full"
        />
      </div>
    </div>
  )
}


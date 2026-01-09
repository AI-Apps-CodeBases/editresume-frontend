'use client'

import { useState, useEffect, useRef } from 'react'
import { TemplateConfig } from '../templates/types'
import { GripVertical, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, RotateCcw, Minus, Maximize2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
    <div className="space-y-8">
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

function SortableSectionItem({ sectionId, sectionTitle, index, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  sectionId: string
  sectionTitle: string
  index: number
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2.5 px-3 bg-white rounded-lg border-2 transition-all duration-200 group ${
        isDragging
          ? 'border-primary-400 shadow-lg z-50 scale-[1.02]'
          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-move'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-500 w-6 flex-shrink-0">{index + 1}.</span>
        <span className="text-sm text-gray-700 truncate">{sectionTitle}</span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={!canMoveUp}
          className={`p-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
            !canMoveUp
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
          }`}
          title="Move up"
          aria-label="Move section up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          disabled={!canMoveDown}
          className={`p-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
            !canMoveDown
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
          }`}
          title="Move down"
          aria-label="Move section down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function SectionOrderControls({ config, onUpdate, sections, hasSummary }: Props & { sections?: Section[], hasSummary?: boolean }) {
  const SUMMARY_ID = '__summary__'
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<{ id: string; title: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sectionOrder = config.layout.sectionOrder || []
  const allSectionIds: string[] = []
  
  if (hasSummary) {
    allSectionIds.push(SUMMARY_ID)
  }
  
  const regularSections = sections?.filter(s => {
    const excludedTitles = ['Contact Information', 'Contact', 'Title Section', 'Title']
    return !excludedTitles.includes(s.title)
  }) || []
  
  regularSections.forEach(s => {
    if (!allSectionIds.includes(s.id)) {
      allSectionIds.push(s.id)
    }
  })
  
  let orderedIds: string[]
  if (sectionOrder.length > 0) {
    const validOrdered = sectionOrder.filter(id => allSectionIds.includes(id))
    const newSections = allSectionIds.filter(id => !sectionOrder.includes(id))
    orderedIds = [...validOrdered, ...newSections]
  } else {
    orderedIds = allSectionIds
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    const sectionId = active.id as string
    const isSummary = sectionId === SUMMARY_ID
    const section = isSummary ? null : regularSections.find(s => s.id === sectionId)
    const sectionTitle = isSummary ? 'Professional Summary' : section?.title || 'Unknown'
    setDraggedItem({ id: sectionId, title: sectionTitle })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedItem(null)

    if (over && active.id !== over.id) {
      const oldIndex = orderedIds.findIndex(id => id === active.id)
      const newIndex = orderedIds.findIndex(id => id === over.id)
      const newOrder = arrayMove(orderedIds, oldIndex, newIndex)
      
      onUpdate({
        layout: {
          ...config.layout,
          sectionOrder: newOrder,
          twoColumnLeft: Array.isArray(config.layout.twoColumnLeft) ? [...config.layout.twoColumnLeft] : [],
          twoColumnRight: Array.isArray(config.layout.twoColumnRight) ? [...config.layout.twoColumnRight] : [],
        }
      })
    }
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...orderedIds]
      const [moved] = newOrder.splice(index, 1)
      newOrder.splice(index - 1, 0, moved)
      onUpdate({
        layout: {
          ...config.layout,
          sectionOrder: newOrder,
          twoColumnLeft: Array.isArray(config.layout.twoColumnLeft) ? [...config.layout.twoColumnLeft] : [],
          twoColumnRight: Array.isArray(config.layout.twoColumnRight) ? [...config.layout.twoColumnRight] : [],
        }
      })
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < orderedIds.length - 1) {
      const newOrder = [...orderedIds]
      const [moved] = newOrder.splice(index, 1)
      newOrder.splice(index + 1, 0, moved)
      onUpdate({
        layout: {
          ...config.layout,
          sectionOrder: newOrder,
          twoColumnLeft: Array.isArray(config.layout.twoColumnLeft) ? [...config.layout.twoColumnLeft] : [],
          twoColumnRight: Array.isArray(config.layout.twoColumnRight) ? [...config.layout.twoColumnRight] : [],
        }
      })
    }
  }

  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-3 block">Section Order</label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {orderedIds.map((sectionId, index) => {
              const isSummary = sectionId === SUMMARY_ID
              const section = isSummary ? null : regularSections.find(s => s.id === sectionId)
              const sectionTitle = isSummary ? 'Professional Summary' : section?.title || 'Unknown'
              
              return (
                <SortableSectionItem
                  key={sectionId}
                  sectionId={sectionId}
                  sectionTitle={sectionTitle}
                  index={index}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < orderedIds.length - 1}
                />
              )
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {draggedItem ? (
            <div className="flex items-center gap-3 py-2.5 px-3 bg-white rounded-lg border-2 border-primary-400 shadow-xl opacity-95 scale-105">
              <GripVertical className="w-5 h-5 text-gray-400" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-gray-700 font-medium">{draggedItem.title}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <p className="mt-3 text-xs text-gray-500">Drag handles or use ↑ ↓ buttons to reorder sections</p>
    </div>
  )
}

function LayoutControls({ config, onUpdate, sections, hasSummary, onSectionDistributionChange }: Props & { sections?: Section[], hasSummary?: boolean, onSectionDistributionChange?: (leftIds: string[], rightIds: string[]) => void }) {
  const columnWidth = config.layout.columnWidth || 40
  const [leftSectionIds, setLeftSectionIds] = useState<string[]>([])
  const [rightSectionIds, setRightSectionIds] = useState<string[]>([])
  const hasInitializedRef = useRef(false)
  const SUMMARY_ID = '__summary__'

  useEffect(() => {
    if (typeof window !== 'undefined' && sections) {
      // First try to get from config (persisted across templates)
      let leftIds: string[] = config.layout.twoColumnLeft || []
      let rightIds: string[] = config.layout.twoColumnRight || []
      
      // Fallback to localStorage if config doesn't have it
      if (leftIds.length === 0 && rightIds.length === 0) {
        const savedLeft = localStorage.getItem('twoColumnLeft')
        const savedRight = localStorage.getItem('twoColumnRight')
        leftIds = savedLeft ? JSON.parse(savedLeft) : []
        rightIds = savedRight ? JSON.parse(savedRight) : []
      }
      
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
      
      // Only update if the IDs have actually changed to avoid overwriting local updates
      const currentLeftStr = JSON.stringify([...leftSectionIds].sort())
      const currentRightStr = JSON.stringify([...rightSectionIds].sort())
      const newLeftStr = JSON.stringify([...leftIds].sort())
      const newRightStr = JSON.stringify([...rightIds].sort())
      
      if (currentLeftStr !== newLeftStr || currentRightStr !== newRightStr) {
        setLeftSectionIds(leftIds)
        setRightSectionIds(rightIds)
      }
    }
  }, [sections, hasSummary, config.layout.twoColumnLeft, config.layout.twoColumnRight])

  const handleMoveSection = (sectionId: string, targetColumn: 'left' | 'right') => {
    const newLeftIds = targetColumn === 'left' 
      ? [...leftSectionIds.filter(id => id !== sectionId), sectionId]
      : leftSectionIds.filter(id => id !== sectionId)
    
    const newRightIds = targetColumn === 'right'
      ? [...rightSectionIds.filter(id => id !== sectionId), sectionId]
      : rightSectionIds.filter(id => id !== sectionId)
    
    // Update local state first for immediate UI feedback
    setLeftSectionIds(newLeftIds)
    setRightSectionIds(newRightIds)
    
    // Save to localStorage for backward compatibility
    localStorage.setItem('twoColumnLeft', JSON.stringify(newLeftIds))
    localStorage.setItem('twoColumnRight', JSON.stringify(newRightIds))
    
    // Update config (persists across templates) - ensure sectionOrder is preserved
    // Always create new array references to ensure React detects changes
    onUpdate({
      layout: {
        ...config.layout,
        sectionOrder: Array.isArray(config.layout.sectionOrder) ? [...config.layout.sectionOrder] : [],
        twoColumnLeft: [...newLeftIds],
        twoColumnRight: [...newRightIds],
      }
    })
    
    // Also call the callback if provided
    if (onSectionDistributionChange) {
      onSectionDistributionChange(newLeftIds, newRightIds)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h4 className="text-base font-semibold text-gray-900">Layout</h4>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">Layout</label>
        <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200" role="radiogroup" aria-label="Layout selection">
          {(['single', 'two-column'] as const).map((col, index) => (
            <button
              key={col}
              onClick={() => {
                const updates: any = { layout: { ...config.layout, columns: col } }
                if (col === 'two-column' && !config.layout.columnWidth) {
                  updates.layout.columnWidth = 40
                }
                onUpdate(updates)
              }}
              role="radio"
              aria-checked={config.layout.columns === col}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                config.layout.columns === col
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${index === 0 ? '' : 'ml-1'}`}
            >
              {col === 'single' ? '1 Column' : '2 Columns'}
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((columnWidth - 20) / (80 - 20)) * 100}%, #e5e7eb ${((columnWidth - 20) / (80 - 20)) * 100}%, #e5e7eb 100%)`
          }}
          aria-label="Column width percentage"
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
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleMoveSection(SUMMARY_ID, 'left')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                          leftSectionIds.includes(SUMMARY_ID)
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                        title="Move to left column"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Left
                      </button>
                      <button
                        onClick={() => handleMoveSection(SUMMARY_ID, 'right')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                          rightSectionIds.includes(SUMMARY_ID)
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                        title="Move to right column"
                      >
                        Right
                        <ArrowRight className="w-3 h-3" />
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
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleMoveSection(section.id, 'left')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                              isLeft
                                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                            title="Move to left column"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            Left
                          </button>
                          <button
                            onClick={() => handleMoveSection(section.id, 'right')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                              isRight
                                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                            title="Move to right column"
                          >
                            Right
                            <ArrowRight className="w-3 h-3" />
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
        <SectionOrderControls
          config={config}
          onUpdate={onUpdate}
          sections={sections}
          hasSummary={hasSummary}
        />
      ) : null}
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-3 block">Spacing Preset</label>
        <div className="grid grid-cols-3 gap-3">
          {(['compact', 'balanced', 'spacious'] as const).map((spacing) => {
            const presetValues = {
              compact: { sectionGap: 12, itemGap: 4, pageMargin: 16 },
              balanced: { sectionGap: 20, itemGap: 8, pageMargin: 24 },
              spacious: { sectionGap: 32, itemGap: 12, pageMargin: 32 },
            }
            const isActive = config.layout.spacing === spacing
            return (
              <button
                key={spacing}
                onClick={() => onUpdate({ 
                  layout: { ...config.layout, spacing },
                  spacing: presetValues[spacing]
                })}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 capitalize focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm scale-[1.02]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                }`}
                title={`${spacing.charAt(0).toUpperCase() + spacing.slice(1)} spacing: ${presetValues[spacing].sectionGap}px section gap, ${presetValues[spacing].itemGap}px item gap`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-primary-600 rounded-full"></div>
                )}
                <div className="flex flex-col gap-1.5 items-center w-full">
                  {spacing === 'compact' && (
                    <>
                      <Minus className="w-4 h-4" />
                      <div className="w-full space-y-1">
                        <div className="h-0.5 bg-current opacity-40"></div>
                        <div className="h-0.5 bg-current opacity-40"></div>
                        <div className="h-0.5 bg-current opacity-40"></div>
                      </div>
                    </>
                  )}
                  {spacing === 'balanced' && (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <div className="w-full space-y-1.5">
                        <div className="h-0.5 bg-current opacity-40"></div>
                        <div className="h-0.5 bg-current opacity-40"></div>
                      </div>
                    </>
                  )}
                  {spacing === 'spacious' && (
                    <>
                      <Maximize2 className="w-4 h-4 rotate-45" />
                      <div className="w-full space-y-2.5">
                        <div className="h-0.5 bg-current opacity-40"></div>
                        <div className="h-0.5 bg-current opacity-40"></div>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-xs font-medium">{spacing}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TypographyControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h4 className="text-base font-semibold text-gray-900">Typography</h4>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">Heading Font</label>
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
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm"
          style={{ fontFamily: config.typography.fontFamily.heading }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500" style={{ fontFamily: config.typography.fontFamily.heading }}>
          Preview: <span className="font-semibold text-gray-700">Sample Heading Text</span>
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">Body Font</label>
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
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm"
          style={{ fontFamily: config.typography.fontFamily.body }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500" style={{ fontFamily: config.typography.fontFamily.body }}>
          Preview: <span className="text-gray-700">Sample body text at regular weight</span>
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Name/Title Size</label>
          <span className="text-sm font-semibold text-primary-600">{config.typography.fontSize.h1}pt</span>
        </div>
        <input
          type="range"
          min="14"
          max="32"
          value={config.typography.fontSize.h1}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontSize: { ...config.typography.fontSize, h1: parseInt(e.target.value) },
              },
            })
          }
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.typography.fontSize.h1 - 14) / (32 - 14)) * 100}%, #e5e7eb ${((config.typography.fontSize.h1 - 14) / (32 - 14)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>14pt</span>
          <span>23pt</span>
          <span>32pt</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Section Title Size</label>
          <span className="text-sm font-semibold text-primary-600">{config.typography.fontSize.h2}pt</span>
        </div>
        <input
          type="range"
          min="10"
          max="20"
          value={config.typography.fontSize.h2}
          onChange={(e) =>
            onUpdate({
              typography: {
                ...config.typography,
                fontSize: { ...config.typography.fontSize, h2: parseInt(e.target.value) },
              },
            })
          }
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.typography.fontSize.h2 - 10) / (20 - 10)) * 100}%, #e5e7eb ${((config.typography.fontSize.h2 - 10) / (20 - 10)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10pt</span>
          <span>15pt</span>
          <span>20pt</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Content/Body Size</label>
          <span className="text-sm font-semibold text-primary-600">{config.typography.fontSize.body}pt</span>
        </div>
        <input
          type="range"
          min="8"
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.typography.fontSize.body - 8) / (14 - 8)) * 100}%, #e5e7eb ${((config.typography.fontSize.body - 8) / (14 - 8)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>8pt</span>
          <span>11pt</span>
          <span>14pt</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Controls text size for content and bullets</p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Line Height</label>
          <span className="text-sm font-semibold text-primary-600">{config.typography.lineHeight.toFixed(1)}</span>
        </div>
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.typography.lineHeight - 1.2) / (2.0 - 1.2)) * 100}%, #e5e7eb ${((config.typography.lineHeight - 1.2) / (2.0 - 1.2)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1.2</span>
          <span>1.6</span>
          <span>2.0</span>
        </div>
      </div>
    </div>
  )
}

function DesignControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h4 className="text-base font-semibold text-gray-900">Design</h4>
      </div>
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
        <label className="text-xs font-medium text-gray-700 mb-2 block">Bullet Style</label>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Bullet style selection">
          {(['circle', 'square', 'dash', 'none'] as const).map((style) => (
            <button
              key={style}
              onClick={() => onUpdate({ design: { ...config.design, bulletStyle: style } })}
              role="radio"
              aria-checked={config.design.bulletStyle === style}
              className={`px-3 py-2 text-xs rounded-lg border capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                config.design.bulletStyle === style
                  ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="dividers"
          checked={config.design.dividers}
          onChange={(e) => onUpdate({ design: { ...config.design, dividers: e.target.checked } })}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer transition-all duration-200"
          aria-label="Show section dividers"
        />
        <label htmlFor="dividers" className="text-xs font-medium text-gray-700 cursor-pointer">
          Show Section Dividers
        </label>
      </div>
    </div>
  )
}

function SpacingControls({ config, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h4 className="text-base font-semibold text-gray-900">Spacing</h4>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Section Gap</label>
          <span className="text-sm font-semibold text-primary-600">{config.spacing.sectionGap}px</span>
        </div>
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.spacing.sectionGap - 8) / (40 - 8)) * 100}%, #e5e7eb ${((config.spacing.sectionGap - 8) / (40 - 8)) * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Item Gap</label>
          <span className="text-sm font-semibold text-primary-600">{config.spacing.itemGap}px</span>
        </div>
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.spacing.itemGap - 2) / (16 - 2)) * 100}%, #e5e7eb ${((config.spacing.itemGap - 2) / (16 - 2)) * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Page Margin</label>
          <span className="text-sm font-semibold text-primary-600">{config.spacing.pageMargin}px</span>
        </div>
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((config.spacing.pageMargin - 12) / (48 - 12)) * 100}%, #e5e7eb ${((config.spacing.pageMargin - 12) / (48 - 12)) * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>
    </div>
  )
}


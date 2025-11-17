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
      params: Record<string, any>
    }>
    params?: Record<string, any>
  }>
  template?: string
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
  fieldsVisible?: Record<string, boolean>
}

interface Props {
  data: ResumeData
  onUpdate: (data: ResumeData) => void
  template: string
  onTemplateChange: (template: string) => void
}

const SUGGESTED_SECTIONS = [
  { id: 'awards', title: 'Awards & Honors', icon: '🏆' },
  { id: 'certifications', title: 'Certifications', icon: '📜' },
  { id: 'languages', title: 'Languages', icon: '🌐' },
  { id: 'publications', title: 'Publications', icon: '📚' },
  { id: 'volunteer', title: 'Volunteer Work', icon: '🤝' },
  { id: 'interests', title: 'Interests', icon: '🎯' },
  { id: 'references', title: 'References', icon: '👥' },
  { id: 'projects', title: 'Projects', icon: '💻' },
  { id: 'patents', title: 'Patents', icon: '⚡' },
  { id: 'conferences', title: 'Conferences', icon: '🎤' }
]

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter (Modern)', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto (Clean)', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans (Readable)', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato (Professional)', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat (Bold)', category: 'Sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather (Classic)', category: 'Serif' },
  { value: 'Lora', label: 'Lora (Traditional)', category: 'Serif' },
  { value: 'Fira Code', label: 'Fira Code (Monospace)', category: 'Monospace' },
  { value: 'Source Code Pro', label: 'Source Code Pro (Tech)', category: 'Monospace' }
]

const ONE_COLUMN_TEMPLATES = [
  { id: 'modern-one', name: 'Modern One Column', description: 'Clean single column layout' },
  { id: 'classic-one', name: 'Classic One Column', description: 'Traditional single column' },
  { id: 'minimal-one', name: 'Minimal One Column', description: 'Simple and elegant' },
  { id: 'executive-one', name: 'Executive One Column', description: 'Professional executive style' }
]

export default function DesignPanel({ data, onUpdate, template, onTemplateChange }: Props) {
  const [activeTab, setActiveTab] = useState<'template' | 'sections' | 'typography' | 'layout' | 'colors'>('template')
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  
  const design = data.design || {}
  const fonts = design.fonts || {}
  const colors = design.colors || {}
  const spacing = design.spacing || {}
  const layout = design.layout || {}

  const handleDesignUpdate = (updates: Partial<ResumeData['design']>) => {
    const updatedData = {
      ...data,
      design: {
        ...design,
        ...updates
      }
    }
    onUpdate(updatedData)
  }

  const handleSectionReorder = (fromIndex: number, toIndex: number) => {
    const newSections = [...data.sections]
    const [moved] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, moved)
    onUpdate({ ...data, sections: newSections })
  }

  const handleSectionRemove = (sectionId: string) => {
    if (confirm('Are you sure you want to remove this section?')) {
      const newSections = data.sections.filter(s => s.id !== sectionId)
      onUpdate({ ...data, sections: newSections })
    }
  }

  const handleAddSection = (section: typeof SUGGESTED_SECTIONS[0]) => {
    // Check if section with same title already exists (case-insensitive)
    const titleLower = section.title.toLowerCase().trim()
    const existingSection = data.sections.find(s => 
      s.title.toLowerCase().trim() === titleLower
    )
    
    if (existingSection) {
      alert(`A section titled "${section.title}" already exists. Please use a different name or remove the existing section first.`)
      return
    }
    
    const newSection = {
      id: `section-${Date.now()}`,
      title: section.title,
      bullets: [{ id: `bullet-${Date.now()}`, text: '', params: {} }],
      params: {}
    }
    onUpdate({ ...data, sections: [...data.sections, newSection] })
  }

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedSection) return
    
    const fromIndex = data.sections.findIndex(s => s.id === draggedSection)
    if (fromIndex !== -1 && fromIndex !== targetIndex) {
      handleSectionReorder(fromIndex, targetIndex)
    }
    setDraggedSection(null)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🎨 Design & Layout</h2>
        <p className="text-sm text-gray-600">Customize your resume's appearance and structure</p>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50">
        {[
          { id: 'template', label: '📐 Templates', icon: '📐' },
          { id: 'sections', label: '📋 Sections', icon: '📋' },
          { id: 'typography', label: '🔤 Typography', icon: '🔤' },
          { id: 'layout', label: '📏 Layout', icon: '📏' },
          { id: 'colors', label: '🎨 Colors', icon: '🎨' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white border-b-2 border-purple-600 text-purple-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'template' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Template</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-medium text-blue-900">{template}</div>
                <div className="text-xs text-blue-700 mt-1">Active template</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Standard Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                {['clean', 'tech', 'modern', 'minimal', 'compact', 'two-column'].map(t => (
                  <button
                    key={t}
                    onClick={() => onTemplateChange(t)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      template === t
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium text-sm capitalize">{t}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">One Column Templates</h3>
              <div className="grid grid-cols-1 gap-2">
                {ONE_COLUMN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onTemplateChange(t.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      template === t.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Sections</h3>
              <div className="space-y-2">
                {data.sections.map((section, index) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-gray-400">☰</div>
                    <div className="flex-1 font-medium text-sm">{section.title}</div>
                    <button
                      onClick={() => handleSectionRemove(section.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 Drag sections to reorder</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Suggested Sections</h3>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_SECTIONS
                  .filter(s => !data.sections.some(existing => existing.title.toLowerCase().includes(s.title.toLowerCase().split(' ')[0])))
                  .map(section => (
                    <button
                      key={section.id}
                      onClick={() => handleAddSection(section)}
                      className="p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{section.icon}</span>
                        <span className="font-medium text-sm">{section.title}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Heading Font</h3>
              <select
                value={fonts.heading || 'Inter'}
                onChange={(e) => handleDesignUpdate({ fonts: { ...fonts, heading: e.target.value } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
              <div className="mt-2">
                <label className="text-xs text-gray-600">Size: {fonts.size?.heading || 18}px</label>
                <input
                  type="range"
                  min="14"
                  max="32"
                  value={fonts.size?.heading || 18}
                  onChange={(e) => handleDesignUpdate({
                    fonts: {
                      ...fonts,
                      size: { ...fonts.size, heading: parseInt(e.target.value) }
                    }
                  })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Body Font</h3>
              <select
                value={fonts.body || 'Inter'}
                onChange={(e) => handleDesignUpdate({ fonts: { ...fonts, body: e.target.value } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
              <div className="mt-2">
                <label className="text-xs text-gray-600">Size: {fonts.size?.body || 12}px</label>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={fonts.size?.body || 12}
                  onChange={(e) => handleDesignUpdate({
                    fonts: {
                      ...fonts,
                      size: { ...fonts.size, body: parseInt(e.target.value) }
                    }
                  })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Font Preview</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div style={{ fontFamily: fonts.heading || 'Inter', fontSize: `${fonts.size?.heading || 18}px` }}>
                  Heading Text Example
                </div>
                <div style={{ fontFamily: fonts.body || 'Inter', fontSize: `${fonts.size?.body || 12}px` }} className="mt-2">
                  Body text example. This is how your resume content will look with the selected fonts.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Column Layout</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDesignUpdate({ layout: { ...layout, columns: 1 } })}
                  className={`p-3 rounded-lg border-2 ${
                    (layout.columns || 1) === 1
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-medium text-sm">1 Column</div>
                  <div className="text-xs text-gray-500 mt-1">Single column layout</div>
                </button>
                <button
                  onClick={() => handleDesignUpdate({ layout: { ...layout, columns: 2 } })}
                  className={`p-3 rounded-lg border-2 ${
                    layout.columns === 2
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-medium text-sm">2 Columns</div>
                  <div className="text-xs text-gray-500 mt-1">Two column layout</div>
                </button>
              </div>
            </div>

            {layout.columns === 2 && (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Left Column Width: {layout.columnWidth || 50}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="70"
                  value={layout.columnWidth || 50}
                  onChange={(e) => handleDesignUpdate({
                    layout: { ...layout, columnWidth: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Spacing</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">Section Spacing: {spacing.section || 16}px</label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={spacing.section || 16}
                    onChange={(e) => handleDesignUpdate({
                      spacing: { ...spacing, section: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Bullet Spacing: {spacing.bullet || 8}px</label>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    value={spacing.bullet || 8}
                    onChange={(e) => handleDesignUpdate({
                      spacing: { ...spacing, bullet: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Primary Color</h3>
              <input
                type="color"
                value={colors.primary || '#2563eb'}
                onChange={(e) => handleDesignUpdate({
                  colors: { ...colors, primary: e.target.value }
                })}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Secondary Color</h3>
              <input
                type="color"
                value={colors.secondary || '#6b7280'}
                onChange={(e) => handleDesignUpdate({
                  colors: { ...colors, secondary: e.target.value }
                })}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Accent Color</h3>
              <input
                type="color"
                value={colors.accent || '#8b5cf6'}
                onChange={(e) => handleDesignUpdate({
                  colors: { ...colors, accent: e.target.value }
                })}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Text Color</h3>
              <input
                type="color"
                value={colors.text || '#111827'}
                onChange={(e) => handleDesignUpdate({
                  colors: { ...colors, text: e.target.value }
                })}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Professional Blue', primary: '#2563eb', secondary: '#6b7280', accent: '#3b82f6' },
                  { name: 'Elegant Purple', primary: '#8b5cf6', secondary: '#6b7280', accent: '#a78bfa' },
                  { name: 'Modern Green', primary: '#10b981', secondary: '#6b7280', accent: '#34d399' },
                  { name: 'Classic Black', primary: '#111827', secondary: '#4b5563', accent: '#6b7280' }
                ].map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handleDesignUpdate({
                      colors: {
                        primary: preset.primary,
                        secondary: preset.secondary,
                        accent: preset.accent,
                        text: colors.text || '#111827'
                      }
                    })}
                    className="p-2 rounded-lg border border-gray-200 hover:border-purple-300 text-left"
                  >
                    <div className="text-xs font-medium">{preset.name}</div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }}></div>
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


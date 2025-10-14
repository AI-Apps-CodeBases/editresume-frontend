'use client'
import { useState, useRef, useEffect } from 'react'

interface Bullet {
  id: string
  text: string
  params: Record<string, string>
}

interface Section {
  id: string
  title: string
  bullets: Bullet[]
}

interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Section[]
}

interface Props {
  data: ResumeData
  onChange: (data: ResumeData) => void
  template?: string
  onAIImprove?: (text: string, context?: string) => Promise<string>
}

export default function VisualResumeEditor({ data, onChange, template = 'tech', onAIImprove }: Props) {
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [draggedBullet, setDraggedBullet] = useState<{ sectionId: string, bulletId: string } | null>(null)
  const [selectedText, setSelectedText] = useState<{ text: string, range: Range | null, element: HTMLElement | null }>({ text: '', range: null, element: null })
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [aiMenuPosition, setAIMenuPosition] = useState({ x: 0, y: 0 })
  const [isAILoading, setIsAILoading] = useState(false)
  const [currentEditingContext, setCurrentEditingContext] = useState<{ type: 'bullet' | 'field', sectionId?: string, bulletId?: string, field?: keyof ResumeData } | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        let element = selection.anchorNode?.parentElement
        while (element && !element.hasAttribute('data-editable-type')) {
          element = element.parentElement
        }
        
        setSelectedText({ text: selection.toString(), range, element })
        setAIMenuPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
        setShowAIMenu(true)
      } else {
        setShowAIMenu(false)
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  const updateField = (field: keyof ResumeData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    const sections = data.sections.map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    )
    onChange({ ...data, sections })
  }

  const updateBullet = (sectionId: string, bulletId: string, text: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.map(b =>
              b.id === bulletId ? { ...b, text } : b
            )
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const addBullet = (sectionId: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const removeBullet = (sectionId: string, bulletId: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.filter(b => b.id !== bulletId)
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: 'New Section',
      bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
    }
    onChange({ ...data, sections: [...data.sections, newSection] })
  }

  const removeSection = (sectionId: string) => {
    onChange({ ...data, sections: data.sections.filter(s => s.id !== sectionId) })
  }

  const handleSectionDragStart = (sectionId: string) => {
    setDraggedSection(sectionId)
  }

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    if (!draggedSection || draggedSection === targetSectionId) return

    const sections = [...data.sections]
    const draggedIdx = sections.findIndex(s => s.id === draggedSection)
    const targetIdx = sections.findIndex(s => s.id === targetSectionId)

    const [removed] = sections.splice(draggedIdx, 1)
    sections.splice(targetIdx, 0, removed)

    onChange({ ...data, sections })
  }

  const handleSectionDragEnd = () => {
    setDraggedSection(null)
  }

  const handleBulletDragStart = (sectionId: string, bulletId: string) => {
    setDraggedBullet({ sectionId, bulletId })
  }

  const handleBulletDragOver = (e: React.DragEvent, targetSectionId: string, targetBulletId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedBullet) return
    
    const sections = [...data.sections]
    const sourceSectionIdx = sections.findIndex(s => s.id === draggedBullet.sectionId)
    const targetSectionIdx = sections.findIndex(s => s.id === targetSectionId)
    
    if (sourceSectionIdx === -1 || targetSectionIdx === -1) return
    
    const sourceBullets = [...sections[sourceSectionIdx].bullets]
    const draggedBulletIdx = sourceBullets.findIndex(b => b.id === draggedBullet.bulletId)
    
    if (draggedBulletIdx === -1) return
    
    const [removed] = sourceBullets.splice(draggedBulletIdx, 1)
    
    if (draggedBullet.sectionId === targetSectionId) {
      const targetBulletIdx = sourceBullets.findIndex(b => b.id === targetBulletId)
      sourceBullets.splice(targetBulletIdx, 0, removed)
      sections[sourceSectionIdx].bullets = sourceBullets
    } else {
      sections[sourceSectionIdx].bullets = sourceBullets
      const targetBullets = [...sections[targetSectionIdx].bullets]
      const targetBulletIdx = targetBullets.findIndex(b => b.id === targetBulletId)
      targetBullets.splice(targetBulletIdx, 0, removed)
      sections[targetSectionIdx].bullets = targetBullets
    }
    
    onChange({ ...data, sections })
  }

  const handleBulletDragEnd = () => {
    setDraggedBullet(null)
  }

  const handleAIImprove = async () => {
    console.log('handleAIImprove called')
    console.log('Selected text:', selectedText)
    console.log('Has onAIImprove:', !!onAIImprove)
    
    if (!onAIImprove) {
      console.error('No onAIImprove function provided')
      alert('AI improve not configured')
      return
    }
    
    if (!selectedText.text) {
      console.error('No text selected')
      alert('Please select some text first')
      return
    }
    
    if (!selectedText.element) {
      console.error('No element found')
      alert('Could not find the element to improve')
      return
    }
    
    setIsAILoading(true)
    setShowAIMenu(false)
    
    try {
      const element = selectedText.element
      const editType = element.getAttribute('data-editable-type')
      const sectionId = element.getAttribute('data-section-id')
      const bulletId = element.getAttribute('data-bullet-id')
      const field = element.getAttribute('data-field')
      
      console.log('Element info:', { editType, sectionId, bulletId, field })
      
      const improved = await onAIImprove(selectedText.text)
      console.log('Got improved text:', improved)
      
      if (!improved || improved === selectedText.text) {
        console.warn('No improvement returned')
        return
      }
      
      if (editType === 'bullet' && sectionId && bulletId) {
        console.log('Updating bullet:', sectionId, bulletId)
        const sections = data.sections.map(s =>
          s.id === sectionId
            ? {
                ...s,
                bullets: s.bullets.map(b =>
                  b.id === bulletId ? { ...b, text: improved } : b
                )
              }
            : s
        )
        onChange({ ...data, sections })
        console.log('Bullet updated successfully')
      } else if (editType === 'field' && field) {
        console.log('Updating field:', field)
        onChange({ ...data, [field]: improved })
        console.log('Field updated successfully')
      } else if (editType === 'section-title' && sectionId) {
        console.log('Updating section title:', sectionId)
        const sections = data.sections.map(s =>
          s.id === sectionId ? { ...s, title: improved } : s
        )
        onChange({ ...data, sections })
        console.log('Section title updated successfully')
      } else {
        console.error('Could not identify element type', { editType, sectionId, bulletId, field })
        alert('Could not identify what to improve. Please try again.')
      }
    } catch (error) {
      console.error('AI improvement failed:', error)
      alert('AI improvement failed: ' + (error as Error).message)
    } finally {
      setIsAILoading(false)
    }
  }

  return (
    <div className="relative" ref={editorRef}>
      {/* AI Floating Toolbar */}
      {showAIMenu && !isAILoading && (
        <div
          className="fixed z-[9999] bg-white shadow-2xl rounded-xl border-2 border-purple-300 px-3 py-2 flex items-center gap-2 animate-fadeIn"
          style={{
            left: `${aiMenuPosition.x}px`,
            top: `${aiMenuPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('AI Improve button clicked!')
              handleAIImprove()
            }}
            disabled={!onAIImprove}
            className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1"
          >
            🤖 AI Improve
          </button>
          <button
            onClick={() => setShowAIMenu(false)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* AI Loading Indicator */}
      {isAILoading && (
        <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-sm font-semibold text-gray-700">AI is improving your text...</span>
          </div>
        </div>
      )}

      {/* Resume Template */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden" style={{ width: '850px', margin: '0 auto', minHeight: '1100px' }}>
        <div className="p-12">
          {/* Header Section */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
            <div
              contentEditable
              suppressContentEditableWarning
              data-editable-type="field"
              data-field="name"
              onBlur={(e) => updateField('name', e.currentTarget.textContent || '')}
              className="text-4xl font-bold text-gray-900 mb-2 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
              placeholder="Your Name"
            >
              {data.name || 'Click to edit name'}
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              data-editable-type="field"
              data-field="title"
              onBlur={(e) => updateField('title', e.currentTarget.textContent || '')}
              className="text-xl text-gray-600 mb-3 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
            >
              {data.title || 'Click to edit title'}
            </div>
            <div className="flex justify-center gap-4 text-sm text-gray-600 flex-wrap">
              <div
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="email"
                onBlur={(e) => updateField('email', e.currentTarget.textContent || '')}
                className="outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
              >
                {data.email || '📧 email'}
              </div>
              <span className="text-gray-400">•</span>
              <div
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="phone"
                onBlur={(e) => updateField('phone', e.currentTarget.textContent || '')}
                className="outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
              >
                {data.phone || '📱 phone'}
              </div>
              <span className="text-gray-400">•</span>
              <div
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="location"
                onBlur={(e) => updateField('location', e.currentTarget.textContent || '')}
                className="outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
              >
                {data.location || '📍 location'}
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {data.summary && (
            <div className="mb-6">
              <div
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="summary"
                onBlur={(e) => updateField('summary', e.currentTarget.textContent || '')}
                className="text-sm text-gray-700 leading-relaxed outline-none hover:bg-blue-50 focus:bg-blue-50 px-3 py-2 rounded transition-colors cursor-text"
              >
                {data.summary}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-6">
            {data.sections.map((section) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleSectionDragStart(section.id)}
                onDragOver={(e) => handleSectionDragOver(e, section.id)}
                onDragEnd={handleSectionDragEnd}
                className={`group relative rounded-lg transition-all ${
                  draggedSection === section.id ? 'opacity-50' : ''
                } hover:ring-2 hover:ring-blue-300 p-3`}
              >
                {/* Section Controls */}
                <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                  <button
                    className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center text-xs hover:bg-blue-600"
                    title="Drag to reorder"
                  >
                    ⠿
                  </button>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center text-xs hover:bg-red-600"
                    title="Delete section"
                  >
                    ✕
                  </button>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    data-editable-type="section-title"
                    data-section-id={section.id}
                    onBlur={(e) => updateSection(section.id, { title: e.currentTarget.textContent || '' })}
                    className="text-xl font-bold text-gray-900 uppercase tracking-wide outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text flex-1"
                  >
                    {section.title}
                  </div>
                </div>

                <div className="border-b-2 border-gray-300 mb-3"></div>

                {/* Bullets */}
                <div className="space-y-2 ml-6">
                  {section.bullets.map((bullet, idx) => (
                    <div
                      key={bullet.id}
                      draggable
                      onDragStart={() => handleBulletDragStart(section.id, bullet.id)}
                      onDragOver={(e) => handleBulletDragOver(e, section.id, bullet.id)}
                      onDragEnd={handleBulletDragEnd}
                      className={`group/bullet flex items-start gap-2 transition-all ${
                        draggedBullet?.bulletId === bullet.id ? 'opacity-50' : ''
                      } hover:bg-blue-50 rounded px-2 py-1`}
                    >
                      <span className="text-gray-600 mt-1">•</span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        data-editable-type="bullet"
                        data-section-id={section.id}
                        data-bullet-id={bullet.id}
                        onBlur={(e) => updateBullet(section.id, bullet.id, e.currentTarget.textContent || '')}
                        className="flex-1 text-sm text-gray-700 leading-relaxed outline-none cursor-text"
                      >
                        {bullet.text || 'Click to edit bullet point'}
                      </div>
                      <button
                        onClick={() => removeBullet(section.id, bullet.id)}
                        className="opacity-0 group-hover/bullet:opacity-100 text-red-500 hover:text-red-700 text-xs font-bold transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addBullet(section.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-4 flex items-center gap-1"
                  >
                    <span>+</span> Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Section Button */}
          <button
            onClick={addSection}
            className="mt-6 w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-500 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Add New Section
          </button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-4 text-center text-sm text-gray-500">
        💡 Click any text to edit • Drag sections/bullets to reorder • Select text for AI improvements
      </div>
    </div>
  )
}


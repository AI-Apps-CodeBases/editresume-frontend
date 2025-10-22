'use client'
import { useState, useRef, useEffect } from 'react'
import InlineGrammarChecker from './InlineGrammarChecker'
import LeftSidebar from './LeftSidebar'
import { useSettings } from '@/contexts/SettingsContext'

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
  onAddContent?: (newContent: any) => void
}

export default function VisualResumeEditor({ data, onChange, template = 'tech', onAIImprove, onAddContent }: Props) {
  const { settings } = useSettings()
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [draggedBullet, setDraggedBullet] = useState<{ sectionId: string, bulletId: string } | null>(null)
  const [draggedCompanyGroup, setDraggedCompanyGroup] = useState<{ sectionId: string, bulletIds: string[] } | null>(null)
  const [selectedText, setSelectedText] = useState<{ text: string, range: Range | null, element: HTMLElement | null }>({ text: '', range: null, element: null })
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [aiMenuPosition, setAIMenuPosition] = useState({ x: 0, y: 0 })
  const [isAILoading, setIsAILoading] = useState(false)
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false)
  const [isGeneratingBullet, setIsGeneratingBullet] = useState(false)
  const [currentEditingContext, setCurrentEditingContext] = useState<{ type: 'bullet' | 'field', sectionId?: string, bulletId?: string, field?: keyof ResumeData } | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  
  // Undo/Redo functionality
  const [history, setHistory] = useState<ResumeData[]>([data])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isUndoRedoing, setIsUndoRedoing] = useState(false)

  // Save to history when data changes
  useEffect(() => {
    if (!isUndoRedoing) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(data)
      if (newHistory.length > 50) newHistory.shift()
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [data])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyIndex > 0) {
          setIsUndoRedoing(true)
          setHistoryIndex(historyIndex - 1)
          onChange(history[historyIndex - 1])
          setTimeout(() => setIsUndoRedoing(false), 100)
        }
      } else if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault()
        if (historyIndex < history.length - 1) {
          setIsUndoRedoing(true)
          setHistoryIndex(historyIndex + 1)
          onChange(history[historyIndex + 1])
          setTimeout(() => setIsUndoRedoing(false), 100)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [history, historyIndex, onChange])

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
        
        setSelectedText({ text: selection.toString(), range, element: element || null })
        setAIMenuPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
        setShowAIMenu(true)
      } else {
        setShowAIMenu(false)
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [onAIImprove])

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

  const insertBulletAfter = (sectionId: string, afterBulletId: string) => {
    const sections = data.sections.map(s => {
      if (s.id === sectionId) {
        const bullets = [...s.bullets]
        const index = bullets.findIndex(b => b.id === afterBulletId)
        if (index !== -1) {
          bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '', params: {} })
        }
        return { ...s, bullets }
      }
      return s
    })
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

  const insertSectionAfter = (afterSectionId: string) => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: 'New Section',
      bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
    }
    const index = data.sections.findIndex(s => s.id === afterSectionId)
    if (index !== -1) {
      const sections = [...data.sections]
      sections.splice(index + 1, 0, newSection)
      onChange({ ...data, sections })
    }
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

  const handleBulletDragStart = (sectionId: string, bulletId: string, isCompany: boolean = false) => {
    if (isCompany) {
      // Dragging a company - find all its tasks until next company or separator
      const section = data.sections.find(s => s.id === sectionId)
      if (section) {
        const bulletIndex = section.bullets.findIndex(b => b.id === bulletId)
        const groupIds: string[] = [bulletId]
        
        // Collect all bullets after this company until separator or next company
        for (let i = bulletIndex + 1; i < section.bullets.length; i++) {
          const bullet = section.bullets[i]
          const text = bullet.text.trim()
          
          // Stop at empty separator or next company
          if (!text || (text.startsWith('**') && text.includes('**', 2))) {
            break
          }
          groupIds.push(bullet.id)
        }
        
        setDraggedCompanyGroup({ sectionId, bulletIds: groupIds })
        console.log('Dragging company group:', groupIds)
      }
    } else {
      setDraggedBullet({ sectionId, bulletId })
    }
  }

  const handleBulletDragOver = (e: React.DragEvent, targetSectionId: string, targetBulletId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Handle company group dragging
    if (draggedCompanyGroup) {
      const sections = [...data.sections]
      const sourceSectionIdx = sections.findIndex(s => s.id === draggedCompanyGroup.sectionId)
      const targetSectionIdx = sections.findIndex(s => s.id === targetSectionId)
      
      if (sourceSectionIdx === -1 || targetSectionIdx === -1) return
      
      const sourceBullets = [...sections[sourceSectionIdx].bullets]
      
      // Extract the entire group
      const groupBullets = sourceBullets.filter(b => draggedCompanyGroup.bulletIds.includes(b.id))
      const remainingBullets = sourceBullets.filter(b => !draggedCompanyGroup.bulletIds.includes(b.id))
      
      if (draggedCompanyGroup.sectionId === targetSectionId) {
        const targetBulletIdx = remainingBullets.findIndex(b => b.id === targetBulletId)
        if (targetBulletIdx !== -1) {
          remainingBullets.splice(targetBulletIdx, 0, ...groupBullets)
        } else {
          remainingBullets.push(...groupBullets)
        }
        sections[sourceSectionIdx].bullets = remainingBullets
      } else {
        sections[sourceSectionIdx].bullets = remainingBullets
        const targetBullets = [...sections[targetSectionIdx].bullets]
        const targetBulletIdx = targetBullets.findIndex(b => b.id === targetBulletId)
        targetBullets.splice(targetBulletIdx, 0, ...groupBullets)
        sections[targetSectionIdx].bullets = targetBullets
      }
      
      onChange({ ...data, sections })
      return
    }
    
    // Handle single bullet dragging
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
    setDraggedCompanyGroup(null)
  }

  const generateSummaryFromExperience = async () => {
    setIsSummaryGenerating(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/generate_summary_from_experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          title: data.title,
          sections: data.sections
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Generated summary:', result)
      
      if (result.summary) {
        onChange({ ...data, summary: result.summary })
      }
    } catch (error) {
      console.error('Summary generation failed:', error)
      alert('Failed to generate summary: ' + (error as Error).message)
    } finally {
      setIsSummaryGenerating(false)
    }
  }

  const generateBulletFromKeywords = async (sectionId: string, keywords: string) => {
    console.log('generateBulletFromKeywords called with:', { sectionId, keywords })
    setIsGeneratingBullet(true)
    try {
      // Find the section to get company context
      const section = data.sections.find(s => s.id === sectionId)
      console.log('Found section:', section)
      if (!section) {
        console.error('Section not found:', sectionId)
        return
      }

      // Extract company title and job title from the section
      let companyTitle = ''
      let jobTitle = ''
      
      // Look for company headers in the section
      for (const bullet of section.bullets) {
        if (bullet.text.startsWith('**') && bullet.text.includes('**', 2)) {
          const companyText = bullet.text.replace(/\*\*/g, '').trim()
          const parts = companyText.split(' / ')
          if (parts.length >= 2) {
            companyTitle = parts[0]
            jobTitle = parts[1]
            break
          }
        }
      }

      console.log('Company context:', { companyTitle, jobTitle })

      const requestBody = {
        keywords: keywords,
        company_title: companyTitle,
        job_title: jobTitle
      }
      console.log('Sending request:', requestBody)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/generate_bullet_from_keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('API result:', result)
      
      if (result.success && result.bullet_text) {
        console.log('Adding bullet:', result.bullet_text)
        // Add the new bullet to the section
        const sections = data.sections.map(s => {
          if (s.id === sectionId) {
            const newBullets = [...s.bullets, { id: Date.now().toString(), text: `• ${result.bullet_text}`, params: {} }]
            console.log('New bullets for section:', newBullets)
            return {
              ...s,
              bullets: newBullets
            }
          }
          return s
        })
        console.log('Updating data with new sections:', sections)
        onChange({ ...data, sections })
        console.log('Bullet added successfully!')
      } else {
        console.error('API returned failure:', result)
        alert('Failed to generate bullet point: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Bullet generation failed:', error)
      alert('Bullet generation failed: ' + (error as Error).message)
    } finally {
      setIsGeneratingBullet(false)
    }
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

  const handleGrammarSuggestion = (sectionId: string, bulletId: string, newText: string) => {
    if (sectionId === 'summary') {
      onChange({ ...data, summary: newText })
    } else {
      const sections = data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map(b =>
                b.id === bulletId ? { ...b, text: newText } : b
              )
            }
          : s
      )
      onChange({ ...data, sections })
    }
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Left Sidebar */}
      <LeftSidebar
        resumeData={data}
        onApplySuggestion={handleGrammarSuggestion}
        onAIImprove={onAIImprove}
        onAddContent={onAddContent}
      />

      {/* Main Content */}
      <div className="flex-1 relative" ref={editorRef}>
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

          {/* Professional Summary Section */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-blue-900">Professional Summary</h3>
              <button
                onClick={generateSummaryFromExperience}
                disabled={isSummaryGenerating || !data.sections.length}
                className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1"
                title="AI will analyze your work experience and create an ATS-optimized summary"
              >
                {isSummaryGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    🤖 Generate from Experience
                  </>
                )}
              </button>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 min-h-[80px] px-3 py-2 rounded">
              <InlineGrammarChecker
                text={data.summary || 'Click to edit or generate summary from your work experience above ↑'}
                onApplySuggestion={(originalText, newText) => {
                  updateField('summary', newText)
                }}
                showInline={settings.inlineGrammarCheck}
              />
            </div>
          </div>

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
                    onClick={() => insertSectionAfter(section.id)}
                    className="w-6 h-6 bg-green-500 text-white rounded flex items-center justify-center text-xs hover:bg-green-600"
                    title="Insert section below"
                  >
                    +
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
                  {section.bullets.map((bullet, idx) => {
                    const isCompanyHeader = bullet.text.startsWith('**') && bullet.text.includes('**', 2)
                    const isEmptySeparator = !bullet.text.trim()
                    
                    if (isEmptySeparator) {
                      return (
                        <div
                          key={bullet.id}
                          className="h-4 group/bullet relative my-2"
                        >
                          <div className="absolute inset-0 border-t border-dashed border-gray-400 opacity-50 group-hover/bullet:opacity-100"></div>
                          <div className="absolute right-0 -top-2 opacity-0 group-hover/bullet:opacity-100 flex gap-1 bg-white px-2 py-1 rounded shadow-md">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const sections = data.sections.map(s => {
                                  if (s.id === section.id) {
                                    const bullets = [...s.bullets]
                                    const index = bullets.findIndex(b => b.id === bullet.id)
                                    if (index !== -1) {
                                      bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '• ', params: {} })
                                    }
                                    return { ...s, bullets }
                                  }
                                  return s
                                })
                                onChange({ ...data, sections })
                              }}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600"
                              title="Insert task below"
                            >
                              + Task
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const sections = data.sections.map(s => {
                                  if (s.id === section.id) {
                                    const bullets = [...s.bullets]
                                    const index = bullets.findIndex(b => b.id === bullet.id)
                                    if (index !== -1) {
                                      bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '**Company / Role / Dates**', params: {} })
                                    }
                                    return { ...s, bullets }
                                  }
                                  return s
                                })
                                onChange({ ...data, sections })
                              }}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600"
                              title="Insert company below"
                            >
                              + Company
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeBullet(section.id, bullet.id)
                              }}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
                              title="Remove separator"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    }
                    
                    if (isCompanyHeader) {
                      return (
                        <div
                          key={bullet.id}
                          draggable
                          onDragStart={() => handleBulletDragStart(section.id, bullet.id, true)}
                          onDragOver={(e) => handleBulletDragOver(e, section.id, bullet.id)}
                          onDragEnd={handleBulletDragEnd}
                          className={`group/bullet transition-all ${
                            draggedCompanyGroup?.bulletIds.includes(bullet.id) ? 'opacity-50' : ''
                          } hover:bg-green-50 rounded px-2 py-2 mt-3 border-l-4 border-transparent hover:border-green-400`}
                          title="Drag to move this company and all its tasks as a group"
                        >
                          <div className="flex items-start gap-2">
                            <textarea
                              value={bullet.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                              onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                              onMouseUp={(e) => {
                                const textarea = e.target as HTMLTextAreaElement
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                if (start !== end) {
                                  const selectedText = textarea.value.substring(start, end)
                                  if (selectedText.trim()) {
                                    setSelectedText({ 
                                      text: selectedText, 
                                      range: null, 
                                      element: textarea 
                                    })
                                    const rect = textarea.getBoundingClientRect()
                                    setAIMenuPosition({ 
                                      x: rect.left + rect.width / 2, 
                                      y: rect.top - 10 
                                    })
                                    setShowAIMenu(true)
                                  }
                                }
                              }}
                              onKeyUp={(e) => {
                                const textarea = e.target as HTMLTextAreaElement
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                if (start !== end) {
                                  const selectedText = textarea.value.substring(start, end)
                                  if (selectedText.trim()) {
                                    setSelectedText({ 
                                      text: selectedText, 
                                      range: null, 
                                      element: textarea 
                                    })
                                    const rect = textarea.getBoundingClientRect()
                                    setAIMenuPosition({ 
                                      x: rect.left + rect.width / 2, 
                                      y: rect.top - 10 
                                    })
                                    setShowAIMenu(true)
                                  }
                                }
                              }}
                              data-editable-type="bullet"
                              data-section-id={section.id}
                              data-bullet-id={bullet.id}
                              className="flex-1 text-base font-bold text-gray-900 leading-relaxed outline-none cursor-text resize-none border-none bg-transparent"
                              rows={1}
                              placeholder="Company / Role / Dates"
                            />
                            <div className="opacity-0 group-hover/bullet:opacity-100 flex gap-1 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  insertBulletAfter(section.id, bullet.id)
                                }}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 shadow-sm"
                                title="Insert task below this company"
                              >
                                + Task
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const sections = data.sections.map(s => {
                                    if (s.id === section.id) {
                                      const bullets = [...s.bullets]
                                      const index = bullets.findIndex(b => b.id === bullet.id)
                                      if (index !== -1) {
                                        bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '**Company / Role / Dates**', params: {} })
                                      }
                                      return { ...s, bullets }
                                    }
                                    return s
                                  })
                                  onChange({ ...data, sections })
                                }}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 shadow-sm"
                                title="Insert new company below"
                              >
                                + Company
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  // Convert company header to regular task
                                  const companyText = bullet.text.replace(/\*\*/g, '').trim()
                                  updateBullet(section.id, bullet.id, `• ${companyText}`)
                                }}
                                className="px-2 py-1 bg-yellow-500 text-white rounded text-xs font-bold hover:bg-yellow-600 shadow-sm"
                                title="Convert company to regular task"
                              >
                                • Task
                              </button>
                              <button
                                onClick={(e) => {
                                  console.log('🤖 AI button clicked (company header)!')
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const keywords = prompt('Enter 3-4 keywords for AI bullet generation:\n(e.g., "monitoring, Datadog, optimization, cost reduction")')
                                  console.log('Keywords entered (company):', keywords)
                                  if (keywords && keywords.trim()) {
                                    console.log('Calling generateBulletFromKeywords with (company):', section.id, keywords.trim())
                                    generateBulletFromKeywords(section.id, keywords.trim())
                                  } else {
                                    console.log('No keywords provided or cancelled (company)')
                                  }
                                }}
                                disabled={isGeneratingBullet}
                                className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold hover:bg-purple-600 shadow-sm disabled:opacity-50"
                                title="Generate AI bullet from keywords"
                              >
                                {isGeneratingBullet ? '🤖...' : '🤖 AI'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeBullet(section.id, bullet.id)
                                }}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 shadow-sm"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={bullet.id}
                        draggable
                        onDragStart={() => handleBulletDragStart(section.id, bullet.id, false)}
                        onDragOver={(e) => handleBulletDragOver(e, section.id, bullet.id)}
                        onDragEnd={handleBulletDragEnd}
                        className={`group/bullet transition-all ${
                          draggedBullet?.bulletId === bullet.id ? 'opacity-50' : ''
                        } ${
                          draggedCompanyGroup?.bulletIds.includes(bullet.id) ? 'opacity-50 bg-green-100 border-l-2 border-green-400' : ''
                        } hover:bg-blue-50 rounded px-2 py-1`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 mt-1">•</span>
                          <textarea
                            value={bullet.text.startsWith('• ') ? bullet.text.substring(2) : bullet.text || ''}
                            onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                            onMouseUp={(e) => {
                              const textarea = e.target as HTMLTextAreaElement
                              const start = textarea.selectionStart
                              const end = textarea.selectionEnd
                              if (start !== end) {
                                const selectedText = textarea.value.substring(start, end)
                                if (selectedText.trim()) {
                                  setSelectedText({ 
                                    text: selectedText, 
                                    range: null, 
                                    element: textarea 
                                  })
                                  const rect = textarea.getBoundingClientRect()
                                  setAIMenuPosition({ 
                                    x: rect.left + rect.width / 2, 
                                    y: rect.top - 10 
                                  })
                                  setShowAIMenu(true)
                                }
                              }
                            }}
                            onKeyUp={(e) => {
                              const textarea = e.target as HTMLTextAreaElement
                              const start = textarea.selectionStart
                              const end = textarea.selectionEnd
                              if (start !== end) {
                                const selectedText = textarea.value.substring(start, end)
                                if (selectedText.trim()) {
                                  setSelectedText({ 
                                    text: selectedText, 
                                    range: null, 
                                    element: textarea 
                                  })
                                  const rect = textarea.getBoundingClientRect()
                                  setAIMenuPosition({ 
                                    x: rect.left + rect.width / 2, 
                                    y: rect.top - 10 
                                  })
                                  setShowAIMenu(true)
                                }
                              }
                            }}
                            data-editable-type="bullet"
                            data-section-id={section.id}
                            data-bullet-id={bullet.id}
                            className="flex-1 text-sm text-gray-700 leading-relaxed resize-none border-none bg-transparent outline-none"
                            rows={1}
                            placeholder="Click to edit bullet point"
                          />
                        </div>
                        
                        {/* Action Buttons Below Bullet */}
                        <div className="opacity-0 group-hover/bullet:opacity-100 flex gap-1 mt-1 ml-6 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const sections = data.sections.map(s => {
                                if (s.id === section.id) {
                                  const bullets = [...s.bullets]
                                  const index = bullets.findIndex(b => b.id === bullet.id)
                                  if (index !== -1) {
                                    bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '• ', params: {} })
                                  }
                                  return { ...s, bullets }
                                }
                                return s
                              })
                              onChange({ ...data, sections })
                            }}
                            className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-semibold hover:bg-blue-600 shadow-sm"
                            title="Insert task below"
                          >
                            ➕ Task
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Convert this bullet to a company header
                              updateBullet(section.id, bullet.id, `**${bullet.text.replace(/^• /, '')} / Role / Dates**`)
                            }}
                            className="px-2 py-0.5 bg-orange-500 text-white rounded text-[10px] font-semibold hover:bg-orange-600 shadow-sm"
                            title="Convert this task to a company header"
                          >
                            🏢 Company
                          </button>
                          <button
                            onClick={(e) => {
                              console.log('🤖 AI button clicked!')
                              e.preventDefault()
                              e.stopPropagation()
                              const keywords = prompt('Enter 3-4 keywords for AI bullet generation:\n(e.g., "monitoring, Datadog, optimization, cost reduction")')
                              console.log('Keywords entered:', keywords)
                              if (keywords && keywords.trim()) {
                                console.log('Calling generateBulletFromKeywords with:', section.id, keywords.trim())
                                generateBulletFromKeywords(section.id, keywords.trim())
                              } else {
                                console.log('No keywords provided or cancelled')
                              }
                            }}
                            disabled={isGeneratingBullet}
                            className="px-2 py-0.5 bg-purple-500 text-white rounded text-[10px] font-semibold hover:bg-purple-600 shadow-sm disabled:opacity-50"
                            title="Generate AI bullet from keywords"
                          >
                            {isGeneratingBullet ? '🤖...' : '🤖 AI'}
                          </button>
                          {(section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work')) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const sections = data.sections.map(s => {
                                    if (s.id === section.id) {
                                      const bullets = [...s.bullets]
                                      const index = bullets.findIndex(b => b.id === bullet.id)
                                      if (index !== -1) {
                                        bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '**Company / Role / Dates**', params: {} })
                                      }
                                      return { ...s, bullets }
                                    }
                                    return s
                                  })
                                  onChange({ ...data, sections })
                                }}
                                className="px-2 py-0.5 bg-green-500 text-white rounded text-[10px] font-semibold hover:bg-green-600 shadow-sm"
                                title="Insert company below"
                              >
                                🏢 Company
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  updateBullet(section.id, bullet.id, `**${bullet.text.replace(/^• /, '')} / Role / Dates**`)
                                }}
                                className="px-2 py-0.5 bg-purple-500 text-white rounded text-[10px] font-semibold hover:bg-purple-600 shadow-sm"
                                title="Convert to company"
                              >
                                ↗️ To Company
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeBullet(section.id, bullet.id)
                            }}
                            className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-semibold hover:bg-red-600 shadow-sm"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Add Buttons */}
                  <div className="mt-3 flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        const sections = data.sections.map(s =>
                          s.id === section.id
                            ? {
                                ...s,
                                bullets: [...s.bullets, { id: Date.now().toString(), text: '• ', params: {} }]
                              }
                            : s
                        )
                        onChange({ ...data, sections })
                      }}
                      className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                      title="Add task bullet at the end"
                    >
                      <span>+</span> Add Task
                    </button>
                    
                    {(section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work')) && (
                      <>
                        <button
                          onClick={() => {
                            const sections = data.sections.map(s =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    bullets: [...s.bullets, { id: Date.now().toString(), text: '**Company / Role / Dates**', params: {} }]
                                  }
                                : s
                            )
                            onChange({ ...data, sections })
                          }}
                          className="text-xs px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                          title="Add new company/job at the end"
                        >
                          <span>+</span> Add Company
                        </button>
                        <button
                          onClick={() => {
                            const sections = data.sections.map(s =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
                                  }
                                : s
                            )
                            onChange({ ...data, sections })
                          }}
                          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                          title="Add separator between companies"
                        >
                          <span>+</span> Add Separator
                        </button>
                      </>
                    )}
                  </div>
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

      {/* Undo/Redo Buttons */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => {
            if (historyIndex > 0) {
              setIsUndoRedoing(true)
              setHistoryIndex(historyIndex - 1)
              onChange(history[historyIndex - 1])
              setTimeout(() => setIsUndoRedoing(false), 100)
            }
          }}
          disabled={historyIndex === 0}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          title="Undo (Cmd/Ctrl + Z)"
        >
          ↶ Undo
        </button>
        <span className="text-xs text-gray-500">
          {historyIndex + 1} / {history.length}
        </span>
        <button
          onClick={() => {
            if (historyIndex < history.length - 1) {
              setIsUndoRedoing(true)
              setHistoryIndex(historyIndex + 1)
              onChange(history[historyIndex + 1])
              setTimeout(() => setIsUndoRedoing(false), 100)
            }
          }}
          disabled={historyIndex === history.length - 1}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          title="Redo (Cmd/Ctrl + Shift + Z)"
        >
          Redo ↷
        </button>
      </div>

      {/* Test AI Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => {
            console.log('🧪 TEST: Direct AI button clicked!')
            if (data.sections.length > 0) {
              const firstSection = data.sections[0]
              console.log('🧪 TEST: Using first section:', firstSection.id)
              generateBulletFromKeywords(firstSection.id, 'test, automation, deployment')
            } else {
              console.log('🧪 TEST: No sections found!')
            }
          }}
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 shadow-sm"
          title="Test AI bullet generation directly"
        >
          🧪 TEST AI (Direct)
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-4 text-center text-sm text-gray-500 space-y-1">
        <div>💡 Cmd+Z to undo • Drag company to move as group • Hover for buttons • 🤖 AI for keywords</div>
        <div className="text-xs text-gray-400">Company format: **Company / Role / Dates** then • Task 1, • Task 2, etc.</div>
      </div>
      </div>
    </div>
  )
}


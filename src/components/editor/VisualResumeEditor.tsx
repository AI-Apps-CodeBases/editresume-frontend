'use client'
import { useState, useRef, useEffect } from 'react'
import InlineGrammarChecker from './InlineGrammarChecker'
import LeftSidebar from './LeftSidebar'
import AIWorkExperience from './AIWorkExperience'
import AISectionAssistant from './AISectionAssistant'
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
  const [isAILoading, setIsAILoading] = useState(false)
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false)
  const [isGeneratingBullet, setIsGeneratingBullet] = useState(false)
  const [currentEditingContext, setCurrentEditingContext] = useState<{ type: 'bullet' | 'field', sectionId?: string, bulletId?: string, field?: keyof ResumeData } | null>(null)
  const [useNewExperienceLayout, setUseNewExperienceLayout] = useState(true)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [showAIParser, setShowAIParser] = useState(false)
  const [showAIWorkExperience, setShowAIWorkExperience] = useState(false)
  const [aiWorkExperienceContext, setAiWorkExperienceContext] = useState<any>(null)
  const [showAISectionAssistant, setShowAISectionAssistant] = useState(false)
  const [aiSectionAssistantContext, setAiSectionAssistantContext] = useState<any>(null)
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

  const handleParsedResume = (jobs: any[], sections: any[]) => {
    console.log('=== PARSING RESUME DATA ===')
    console.log('Jobs:', jobs)
    console.log('Sections:', sections)
    
    const newSections: Section[] = []
    
    // Create work experience section with modern format
    if (jobs.length > 0) {
      const workExperienceSection: Section = {
        id: `work-experience-${Date.now()}`,
        title: 'Work Experience',
        bullets: []
      }
      
      jobs.forEach((job, index) => {
        // Create company header
        const companyHeader = {
          id: `company-header-${Date.now()}-${index}`,
          text: `**${job.company} / ${job.role} / ${job.date}**`,
          params: {}
        }
        workExperienceSection.bullets.push(companyHeader)
        
        // Add job bullets
        job.bullets.forEach((bullet: string, bulletIndex: number) => {
          const bulletItem = {
            id: `bullet-${Date.now()}-${index}-${bulletIndex}`,
            text: `• ${bullet}`,
            params: {}
          }
          workExperienceSection.bullets.push(bulletItem)
        })
      })
      
      newSections.push(workExperienceSection)
    }
    
    // Process ALL sections and create modern format for each
    sections.forEach((section, index) => {
      console.log(`Processing section: ${section.title}`)
      console.log('Section content:', section.content)
      
      if (section.content && section.content.length > 0) {
        const modernSection: Section = {
          id: `section-${Date.now()}-${index}`,
          title: section.title,
          bullets: []
        }
        
        // For each item in the section, create a modern format entry
        section.content.forEach((item: string, itemIndex: number) => {
          // Create a header for each item
          const headerBullet = {
            id: `header-${Date.now()}-${index}-${itemIndex}`,
            text: `**${item} / Type / Date**`,
            params: {}
          }
          modernSection.bullets.push(headerBullet)
          
          // Add the original item as a bullet point
          const itemBullet = {
            id: `item-${Date.now()}-${index}-${itemIndex}`,
            text: `• ${item}`,
            params: {}
          }
          modernSection.bullets.push(itemBullet)
        })
        
        newSections.push(modernSection)
      }
    })
    
    console.log('Created sections:', newSections)
    
    // Replace all existing sections with new ones
    onChange({ ...data, sections: newSections })
    setShowAIParser(false)
  }

  const getSectionType = (title: string): 'work' | 'project' | 'skill' | 'certificate' | 'education' | 'other' => {
    const lower = title.toLowerCase()
    console.log(`Checking section type for: "${title}"`)
    
    // More comprehensive detection
    if (lower.includes('project') || lower.includes('portfolio') || lower.includes('development')) {
      console.log('Detected as PROJECT')
      return 'project'
    }
    if (lower.includes('skill') || lower.includes('technical') || lower.includes('technology') || lower.includes('competencies') || lower.includes('expertise') || lower.includes('proficiencies')) {
      console.log('Detected as SKILL')
      return 'skill'
    }
    if (lower.includes('certificate') || lower.includes('certification') || lower.includes('license') || lower.includes('credential') || lower.includes('qualification')) {
      console.log('Detected as CERTIFICATE')
      return 'certificate'
    }
    if (lower.includes('education') || lower.includes('academic') || lower.includes('university') || lower.includes('college') || lower.includes('degree') || lower.includes('diploma')) {
      console.log('Detected as EDUCATION')
      return 'education'
    }
    if (lower.includes('experience') || lower.includes('work') || lower.includes('employment') || lower.includes('career') || lower.includes('professional')) {
      console.log('Detected as WORK')
      return 'work'
    }
    
    console.log('Detected as OTHER')
    return 'other'
  }


  const moveSectionUp = (sectionId: string) => {
    const sections = [...data.sections]
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex > 0) {
      [sections[currentIndex], sections[currentIndex - 1]] = [sections[currentIndex - 1], sections[currentIndex]]
      onChange({ ...data, sections })
    }
  }

  const moveSectionDown = (sectionId: string) => {
    const sections = [...data.sections]
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex < sections.length - 1) {
      [sections[currentIndex], sections[currentIndex + 1]] = [sections[currentIndex + 1], sections[currentIndex]]
      onChange({ ...data, sections })
    }
  }

  const handleAIWorkExperienceUpdate = (updateData: {
    companyName: string
    jobTitle: string
    dateRange: string
    bullets: string[]
  }) => {
    if (!aiWorkExperienceContext) return

    const { sectionId, bulletId } = aiWorkExperienceContext
    
    // Find the section and update the company header
    const sections = data.sections.map(section => {
      if (section.id === sectionId) {
        const updatedBullets = section.bullets.map(bullet => {
          if (bullet.id === bulletId) {
            // Update the company header with new information
            return {
              ...bullet,
              text: `**${updateData.companyName} / ${updateData.jobTitle} / ${updateData.dateRange}**`
            }
          }
          return bullet
        })
        
        // Remove existing bullets for this company and add new ones
        const companyBulletIds: string[] = []
        const headerIndex = updatedBullets.findIndex(b => b.id === bulletId)
        
        // Find all bullets that belong to this company (until next company or end)
        for (let i = headerIndex + 1; i < updatedBullets.length; i++) {
          const bullet = updatedBullets[i]
          if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
            break // Next company found
          }
          if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
            companyBulletIds.push(bullet.id)
          }
        }
        
        // Remove old bullets
        const filteredBullets = updatedBullets.filter(bullet => !companyBulletIds.includes(bullet.id))
        
        // Add new bullets after the company header
        const newBullets = updateData.bullets.map((bulletText, index) => ({
          id: `bullet-${Date.now()}-${index}`,
          text: `• ${bulletText}`,
          params: {}
        }))
        
        // Insert new bullets after the company header
        const newHeaderIndex = filteredBullets.findIndex(b => b.id === bulletId)
        filteredBullets.splice(newHeaderIndex + 1, 0, ...newBullets)
        
        return {
          ...section,
          bullets: filteredBullets
        }
      }
      return section
    })
    
    onChange({ ...data, sections })
    setShowAIWorkExperience(false)
    setAiWorkExperienceContext(null)
  }

  const handleSectionAssistantUpdate = (sectionData: any) => {
    console.log('=== HANDLING SECTION ASSISTANT UPDATE ===')
    console.log('Section data:', sectionData)
    console.log('Context:', aiSectionAssistantContext)

    try {
      const { itemName, itemType, dateRange, bullets } = sectionData
      const { sectionId, bulletId } = aiSectionAssistantContext

      // Find the section and update the item header
      const sections = data.sections.map(section => {
        if (section.id === sectionId) {
          const updatedBullets = section.bullets.map(bullet => {
            if (bullet.id === bulletId) {
              // Update the item header with new information
              return {
                ...bullet,
                text: `**${itemName} / ${itemType} / ${dateRange}**`
              }
            }
            return bullet
          })

          // Find all bullets that belong to this item (until next item or end)
          const itemBulletIds: string[] = []
          const headerIndex = updatedBullets.findIndex(b => b.id === bulletId)
          
          // Find all bullets that belong to this item (until next item or end)
          for (let i = headerIndex + 1; i < updatedBullets.length; i++) {
            const bullet = updatedBullets[i]
            if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
              break // Next item found
            }
            if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
              itemBulletIds.push(bullet.id)
            }
          }
          
          // Remove old bullets
          const filteredBullets = updatedBullets.filter(bullet => !itemBulletIds.includes(bullet.id))
          
          // Add new bullets after the item header
          const newBullets = bullets.map((bulletText: string, index: number) => ({
            id: `bullet-${Date.now()}-${index}`,
            text: `• ${bulletText}`,
            params: {}
          }))
          
          // Insert new bullets after the item header
          const headerIndexAfter = filteredBullets.findIndex(b => b.id === bulletId)
          filteredBullets.splice(headerIndexAfter + 1, 0, ...newBullets)
          
          return {
            ...section,
            bullets: filteredBullets
          }
        }
        return section
      })

      onChange({ ...data, sections })
      console.log('Section content updated successfully')

    } catch (error) {
      console.error('Error updating section content:', error)
      alert('Failed to update section content: ' + (error as Error).message)
    }
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
        if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
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

          {/* Experience Layout Toggle */}

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
            <div 
              contentEditable
              suppressContentEditableWarning
              data-editable-type="field"
              data-field="summary"
              onBlur={(e) => updateField('summary', e.currentTarget.textContent || '')}
              className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 min-h-[80px] px-3 py-2 rounded outline-none hover:bg-blue-50 focus:bg-blue-50 transition-colors cursor-text"
            >
              {data.summary || 'Click to edit or generate summary from your work experience above ↑'}
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


                {/* Modern Experience Layout - All Sections */}
                  <div className="space-y-6">
                    {/* Add New Item Button - At Top */}
                    <div className="flex justify-center mb-6">
                      <button
                        onClick={() => {
                          if (section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work')) {
                            // Add new company for work experience
                            const newItemBullet = {
                              id: `company-${Date.now()}`,
                              text: '**New Company / New Role / Date Range**',
                              params: {}
                            }

                            const sections = data.sections.map(s =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    bullets: [newItemBullet, ...s.bullets]
                                  }
                                : s
                            )
                            onChange({ ...data, sections })
                          } else {
                            // Add simple bullet point for other sections
                            const newBullet = {
                              id: `bullet-${Date.now()}`,
                              text: '• ',
                              params: {}
                            }

                            const sections = data.sections.map(s =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    bullets: [newBullet, ...s.bullets]
                                  }
                                : s
                            )
                            onChange({ ...data, sections })
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <span>+</span> Add {section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work') ? 'Company' : 'Bullet Point'}
                      </button>
                    </div>

                    {/* Work Experience - Company-based layout */}
                    {section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work') ? (
                      section.bullets.map((bullet, idx) => {
                        const isItemHeader = bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)

                        if (!isItemHeader) return null
                        
                        // Extract company/project info from header
                        const headerText = bullet.text.replace(/\*\*/g, '').trim()
                        const parts = headerText.split(' / ')
                        const companyName = parts[0]?.trim() || 'Unknown Company'
                        const jobTitle = parts[1]?.trim() || 'Unknown Role'
                        const dateRange = parts[2]?.trim() || 'Unknown Date'
                      
                        // Find all bullets for this company (until next company or end)
                        const companyBullets: Bullet[] = []
                        for (let i = idx + 1; i < section.bullets.length; i++) {
                          const nextBullet = section.bullets[i]
                          if (nextBullet.text?.startsWith('**') && nextBullet.text?.includes('**', 2)) {
                            break // Next company found
                          }
                          // Only include bullets that start with • and are not empty
                          if (nextBullet.text?.trim() && nextBullet.text?.startsWith('•') && !nextBullet.text?.startsWith('**')) {
                            companyBullets.push(nextBullet)
                          }
                        }
                        
                        return (
                          <div 
                            key={`company-${idx}`}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Company Header with Controls */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <div className="flex-1">
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-editable-type="company-name"
                                    data-section-id={section.id}
                                    data-bullet-id={bullet.id}
                                    onBlur={(e) => {
                                      const newText = `**${e.currentTarget.textContent || 'Company Name'} / ${jobTitle} / ${dateRange}**`
                                      updateBullet(section.id, bullet.id, newText)
                                    }}
                                    className="text-lg font-bold text-gray-900 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                  >
                                    {companyName}
                                  </div>
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-editable-type="job-title"
                                    data-section-id={section.id}
                                    data-bullet-id={bullet.id}
                                    onBlur={(e) => {
                                      const newText = `**${companyName} / ${e.currentTarget.textContent || 'Job Title'} / ${dateRange}**`
                                      updateBullet(section.id, bullet.id, newText)
                                    }}
                                    className="text-sm text-gray-600 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                  >
                                    {jobTitle}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  data-editable-type="date-range"
                                  data-section-id={section.id}
                                  data-bullet-id={bullet.id}
                                  onBlur={(e) => {
                                    const newText = `**${companyName} / ${jobTitle} / ${e.currentTarget.textContent || 'Date Range'}**`
                                    updateBullet(section.id, bullet.id, newText)
                                  }}
                                  className="text-sm text-gray-500 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                >
                                  {dateRange}
                                </div>
                                
                                {/* AI Assistant Button */}
                                <button
                                  onClick={() => {
                                    setAiWorkExperienceContext({
                                      companyName,
                                      jobTitle,
                                      dateRange,
                                      sectionId: section.id,
                                      bulletId: bullet.id
                                    })
                                    setShowAIWorkExperience(true)
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                                  title="🤖 AI Assistant - Generate work experience content"
                                >
                                  <span>🤖</span> AI Assistant
                                </button>
                                
                                {/* Delete Company Button */}
                                <button
                                  onClick={() => {
                                    // Remove this company panel and its bullet points
                                    const companyBulletIds: string[] = []
                                    
                                    // Find all bullets that belong to this company (until next company or end)
                                    for (let i = idx + 1; i < section.bullets.length; i++) {
                                      const bullet = section.bullets[i]
                                      if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
                                        break // Next company found
                                      }
                                      if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
                                        companyBulletIds.push(bullet.id)
                                      }
                                    }
                                    
                                    // Remove the company header and all its bullets
                                    const currentBulletId = bullet.id
                                    const updatedBullets = section.bullets.filter(b => 
                                      b.id !== currentBulletId && !companyBulletIds.includes(b.id)
                                    )
                                    
                                    const sections = data.sections.map(s =>
                                      s.id === section.id
                                        ? { ...s, bullets: updatedBullets }
                                        : s
                                    )
                                    onChange({ ...data, sections })
                                  }}
                                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                  title="Delete company panel"
                                >
                                  <span>×</span> Delete Company
                                </button>
                              </div>
                            </div>

                            {/* Bullet Points Container */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="space-y-3">
                                {companyBullets.map((companyBullet, bulletIdx) => (
                                  <div key={companyBullet.id} className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      data-editable-type="bullet"
                                      data-section-id={section.id}
                                      data-bullet-id={companyBullet.id}
                                      onBlur={(e) => updateBullet(section.id, companyBullet.id, e.currentTarget.textContent || '')}
                                      className="flex-1 text-sm text-gray-700 outline-none hover:bg-white focus:bg-white px-2 py-1 rounded transition-colors cursor-text"
                                    >
                                      {companyBullet.text.replace(/^•\s*/, '')}
                                    </div>
                                    
                                    {/* AI Improve Button */}
                                    <button
                                      onClick={async () => {
                                        if (onAIImprove) {
                                          try {
                                            setIsAILoading(true)
                                            const improvedText = await onAIImprove(companyBullet.text)
                                            updateBullet(section.id, companyBullet.id, improvedText)
                                          } catch (error) {
                                            console.error('AI improvement failed:', error)
                                          } finally {
                                            setIsAILoading(false)
                                          }
                                        }
                                      }}
                                      disabled={isAILoading}
                                      className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 disabled:opacity-50"
                                      title="✨ AI Improve - Enhance this bullet point"
                                    >
                                      <span>{isAILoading ? '⏳' : '✨'}</span> {isAILoading ? 'Improving...' : 'Improve'}
                                    </button>
                                    
                                    {/* Remove Bullet Button */}
                                    <button
                                      onClick={() => removeBullet(section.id, companyBullet.id)}
                                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                      title="Remove bullet point"
                                    >
                                      <span>×</span> Remove
                                    </button>
                                  </div>
                                ))}
                                
                                {/* Add Bullet Button */}
                                <div className="flex justify-center pt-2">
                                  <button
                                    onClick={() => {
                                      // Add new bullet after the last company bullet
                                      const companyBulletIds = companyBullets.map(b => b.id)
                                      const lastCompanyBulletIndex = section.bullets.findIndex(b => b.id === companyBulletIds[companyBulletIds.length - 1])
                                      
                                      const newBullet = { id: Date.now().toString(), text: '• ', params: {} }
                                      
                                      const sections = data.sections.map(s =>
                                        s.id === section.id
                                          ? {
                                              ...s,
                                              bullets: [
                                                ...s.bullets.slice(0, lastCompanyBulletIndex + 1),
                                                newBullet,
                                                ...s.bullets.slice(lastCompanyBulletIndex + 1)
                                              ]
                                            }
                                          : s
                                      )
                                      onChange({ ...data, sections })
                                    }}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold flex items-center gap-1 transition-all text-xs"
                                    title="Add bullet point to this company"
                                  >
                                    <span>+</span> Add Bullet
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      /* Simple Bullet Points for non-work experience sections */
                      section.bullets.map((bullet, idx) => {
                        // Show bullets that start with • or don't start with ** (simple bullet points)
                        if (bullet.text?.startsWith('**')) return null
                        
                        return (
                          <div 
                            key={bullet.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Simple Bullet Point */}
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div className="flex-1">
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  data-editable-type="bullet"
                                  data-section-id={section.id}
                                  data-bullet-id={bullet.id}
                                  onBlur={(e) => updateBullet(section.id, bullet.id, e.currentTarget.textContent || '')}
                                  className="text-sm text-gray-700 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                >
                                  {bullet.text.replace(/^•\s*/, '')}
                                </div>
                                
                                {/* AI Improve Button */}
                                <button
                                  onClick={async () => {
                                    if (onAIImprove) {
                                      try {
                                        setIsAILoading(true)
                                        const improvedText = await onAIImprove(bullet.text)
                                        updateBullet(section.id, bullet.id, improvedText)
                                      } catch (error) {
                                        console.error('AI improvement failed:', error)
                                      } finally {
                                        setIsAILoading(false)
                                      }
                                    }
                                  }}
                                  disabled={isAILoading}
                                  className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 disabled:opacity-50"
                                  title="✨ AI Improve - Enhance this bullet point"
                                >
                                  <span>{isAILoading ? '⏳' : '✨'}</span> {isAILoading ? 'Improving...' : 'Improve'}
                                </button>
                                
                                {/* Remove Button */}
                                <button
                                  onClick={() => removeBullet(section.id, bullet.id)}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                  title="Remove bullet point"
                                >
                                  <span>×</span> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
              </div>
            ))}
          </div>


          {/* Add Section Buttons */}
          <div className="mt-6 space-y-3">
          <button
            onClick={addSection}
              className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-500 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Add New Section
          </button>
          </div>
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

      {/* AI Work Experience */}
      {showAIWorkExperience && aiWorkExperienceContext && (
        <AIWorkExperience
          companyName={aiWorkExperienceContext.companyName}
          jobTitle={aiWorkExperienceContext.jobTitle}
          dateRange={aiWorkExperienceContext.dateRange}
          sectionId={aiWorkExperienceContext.sectionId}
          bulletId={aiWorkExperienceContext.bulletId}
          onUpdate={(workData) => {
            // Update the company header in the current resume data
            const sections = data.sections.map((s: any) =>
              s.id === aiWorkExperienceContext.sectionId
                ? {
                    ...s,
                    bullets: s.bullets.map((b: any) =>
                      b.id === aiWorkExperienceContext.bulletId
                        ? {
                            ...b,
                            text: `**${workData.companyName} / ${workData.jobTitle} / ${workData.dateRange}**`
                          }
                        : b
                    )
                  }
                : s
            )

            // Add new bullet points after the company header
            if (workData.bullets && workData.bullets.length > 0) {
              const newBullets = workData.bullets.map((bulletText: string, index: number) => ({
                id: `bullet-${Date.now()}-${index}`,
                text: `• ${bulletText}`,
                params: {}
              }))

              const updatedSections = sections.map((s: any) =>
                s.id === aiWorkExperienceContext.sectionId
                  ? {
                      ...s,
                      bullets: [
                        ...s.bullets.slice(0, s.bullets.findIndex((b: any) => b.id === aiWorkExperienceContext.bulletId) + 1),
                        ...newBullets,
                        ...s.bullets.slice(s.bullets.findIndex((b: any) => b.id === aiWorkExperienceContext.bulletId) + 1)
                      ]
                    }
                  : s
              )

              onChange({ ...data, sections: updatedSections })
            } else {
              onChange({ ...data, sections })
            }

            setShowAIWorkExperience(false)
            setAiWorkExperienceContext(null)
          }}
          onClose={() => {
            setShowAIWorkExperience(false)
            setAiWorkExperienceContext(null)
          }}
        />
      )}

      {/* AI Section Assistant */}
      {showAISectionAssistant && aiSectionAssistantContext && (
        <AISectionAssistant
          isOpen={showAISectionAssistant}
          onClose={() => {
            setShowAISectionAssistant(false)
            setAiSectionAssistantContext(null)
          }}
          onUpdate={handleSectionAssistantUpdate}
          context={aiSectionAssistantContext}
        />
      )}
    </div>
  )
}


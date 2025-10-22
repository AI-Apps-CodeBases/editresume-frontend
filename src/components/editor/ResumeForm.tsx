'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Comments from './Comments'

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
  onChange: (data: ResumeData) => void
  replacements: Record<string, string>
  roomId?: string | null
  onAddComment?: (text: string, targetType: string, targetId: string) => void
  onResolveComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
}

function SectionCard({
  section,
  data,
  updateSection,
  removeSection,
  addBullet,
  updateBullet,
  removeBullet,
  moveBulletUp,
  moveBulletDown,
  toggleBoldText,
  improveBulletWithAI,
  generateBulletsWithAI,
  generateBulletFromKeywords,
  improvingBullet,
  generatingBullets,
  roomId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: {
  section: ResumeData['sections'][0]
  data: ResumeData
  updateSection: (id: string, title: string) => void
  removeSection: (id: string) => void
  addBullet: (sectionId: string) => void
  updateBullet: (sectionId: string, bulletId: string, text: string) => void
  removeBullet: (sectionId: string, bulletId: string) => void
  moveBulletUp: (sectionId: string, bulletId: string) => void
  moveBulletDown: (sectionId: string, bulletId: string) => void
  toggleBoldText: (sectionId: string, bulletId: string) => void
  improveBulletWithAI: (sectionId: string, bulletId: string, bulletText: string) => void
  generateBulletsWithAI: (sectionId: string) => void
  generateBulletFromKeywords: (sectionId: string, keywords: string) => void
  improvingBullet: string | null
  generatingBullets: string | null
  roomId?: string | null
  onAddComment?: (text: string, targetType: string, targetId: string) => void
  onResolveComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
}) {
  const [showComments, setShowComments] = useState<string | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
        isDragging ? 'opacity-50 shadow-2xl ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Drag to reorder section"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <input
            type="text"
            value={section.title}
            onChange={(e) => updateSection(section.id, e.target.value)}
            className="text-lg font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 flex-1"
          />
        </div>
        <div className="flex gap-2">
          {roomId && onAddComment && (
            <button
              onClick={() => setShowComments(showComments === section.id ? null : section.id)}
              className="px-3 py-1.5 bg-yellow-50 border-2 border-yellow-300 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition-all flex items-center gap-1"
            >
              💬 Comments
            </button>
          )}
          <button
            onClick={() => removeSection(section.id)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Remove Section
          </button>
        </div>
      </div>

      {showComments === section.id && roomId && onAddComment && onResolveComment && onDeleteComment && (
        <div className="mb-4">
          <Comments
            roomId={roomId}
            targetType="section"
            targetId={section.id}
            onAddComment={onAddComment}
            onResolveComment={onResolveComment}
            onDeleteComment={onDeleteComment}
          />
        </div>
      )}

      <div className="space-y-2">
        {section.bullets.map((bullet, index) => (
          <div key={bullet.id} className="group relative bg-gray-50 rounded-lg p-3 border">
            <div className="flex gap-2 items-start">
              <div className="flex flex-col items-center gap-1">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveBulletUp(section.id, bullet.id)}
                    disabled={index === 0}
                    className="w-5 h-5 rounded bg-white border border-gray-300 hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Move up"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveBulletDown(section.id, bullet.id)}
                    disabled={index === section.bullets.length - 1}
                    className="w-5 h-5 rounded bg-white border border-gray-300 hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Move down"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <textarea
                  placeholder="Add bullet... Use {{company}} {{tech}} {{metric}} for dynamic text"
                  value={bullet.text}
                  onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg resize-none text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                  rows={1}
                />
                
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => toggleBoldText(section.id, bullet.id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                      bullet.text.includes('**') 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Toggle bold text"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    </svg>
                    Bold
                  </button>

                  <button
                    onClick={() => improveBulletWithAI(section.id, bullet.id, bullet.text)}
                    disabled={improvingBullet === bullet.id || !bullet.text.trim()}
                    className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Improve with AI"
                  >
                    {improvingBullet === bullet.id ? (
                      <>
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ...
                      </>
                    ) : (
                      <>
                        ✨ AI
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const keywords = prompt('Enter 3-4 keywords for AI bullet generation:\n(e.g., "monitoring, Datadog, optimization, cost reduction")')
                      if (keywords && keywords.trim()) {
                        generateBulletFromKeywords(section.id, keywords.trim())
                      }
                    }}
                    disabled={generatingBullets === section.id}
                    className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate AI bullet from keywords"
                  >
                    {generatingBullets === section.id ? (
                      <>
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ...
                      </>
                    ) : (
                      <>
                        🤖 Keywords
                      </>
                    )}
                  </button>
                  
                  <div className="text-xs text-gray-500">
                    {bullet.text.length} chars
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeBullet(section.id, bullet.id)}
                className="flex-shrink-0 w-6 h-6 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                title="Delete bullet"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={() => addBullet(section.id)}
            className="flex-1 py-3 border-2 border-dashed rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bullet Point
          </button>
          <button
            onClick={() => generateBulletsWithAI(section.id)}
            disabled={generatingBullets === section.id}
            className="flex-1 py-3 border-2 border-purple-300 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingBullets === section.id ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                ✨ Generate Bullets with AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResumeForm({ data, onChange, replacements, roomId, onAddComment, onResolveComment, onDeleteComment }: Props) {
  const [improvingBullet, setImprovingBullet] = useState<string | null>(null)
  const [generatingBullets, setGeneratingBullets] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [selectedTone, setSelectedTone] = useState<string>('professional')
  
  const generateBulletFromKeywords = async (sectionId: string, keywords: string) => {
    setGeneratingBullets(sectionId)
    try {
      // Extract company title and job title from the section
      let companyTitle = ''
      let jobTitle = ''
      
      // Look for company headers in the section
      const section = data.sections.find(s => s.id === sectionId)
      if (section) {
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
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/generate_bullet_from_keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords,
          company_title: companyTitle,
          job_title: jobTitle
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.bullet_text) {
        // Add the new bullet to the section
        const newBullet = {
          id: Date.now().toString(),
          text: result.bullet_text,
          params: {}
        }
        
        onChange({
          ...data,
          sections: data.sections.map(s => 
            s.id === sectionId 
              ? { ...s, bullets: [...s.bullets, newBullet] }
              : s
          )
        })
      }
    } catch (error) {
      console.error('Error generating bullet from keywords:', error)
      alert('Failed to generate bullet. Please try again.')
    } finally {
      setGeneratingBullets(null)
    }
  }
  
  const updateField = (field: keyof ResumeData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const addSection = () => {
    const newSection = {
      id: Date.now().toString(),
      title: 'New Section',
      bullets: []
    }
    onChange({ ...data, sections: [...data.sections, newSection] })
  }

  const updateSection = (id: string, title: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => s.id === id ? { ...s, title } : s)
    })
  }

  const removeSection = (id: string) => {
    onChange({
      ...data,
      sections: data.sections.filter(s => s.id !== id)
    })
  }

  const addBullet = (sectionId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
            }
          : s
      )
    })
  }

  const updateBullet = (sectionId: string, bulletId: string, text: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map(b =>
                b.id === bulletId ? { ...b, text } : b
              )
            }
          : s
      )
    })
  }

  const removeBullet = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.filter(b => b.id !== bulletId)
            }
          : s
      )
    })
  }

  const moveBulletUp = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => {
        if (s.id === sectionId) {
          const bullets = [...s.bullets]
          const index = bullets.findIndex(b => b.id === bulletId)
          if (index > 0) {
            [bullets[index], bullets[index - 1]] = [bullets[index - 1], bullets[index]]
          }
          return { ...s, bullets }
        }
        return s
      })
    })
  }

  const moveBulletDown = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => {
        if (s.id === sectionId) {
          const bullets = [...s.bullets]
          const index = bullets.findIndex(b => b.id === bulletId)
          if (index < bullets.length - 1) {
            [bullets[index], bullets[index + 1]] = [bullets[index + 1], bullets[index]]
          }
          return { ...s, bullets }
        }
        return s
      })
    })
  }

  const toggleBoldText = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map(b =>
                b.id === bulletId 
                  ? { ...b, text: b.text.includes('**') ? b.text.replace(/\*\*(.*?)\*\*/g, '$1') : `**${b.text}**` }
                  : b
              )
            }
          : s
      )
    })
  }

  const improveBulletWithAI = async (sectionId: string, bulletId: string, bulletText: string) => {
    if (!bulletText.trim()) {
      alert('Please enter some text first')
      return
    }

    setImprovingBullet(bulletId)
    try {
      const response = await fetch('http://localhost:8000/api/openai/improve-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: bulletText,
          context: `${data.title} at ${data.name}`,
          tone: selectedTone
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to improve bullet')
      }

      const result = await response.json()
      updateBullet(sectionId, bulletId, result.improved)
    } catch (error) {
      console.error('AI improve error:', error)
      alert(error instanceof Error ? error.message : 'Failed to improve bullet with AI')
    } finally {
      setImprovingBullet(null)
    }
  }

  const generateBulletsWithAI = async (sectionId: string) => {
    const section = data.sections.find(s => s.id === sectionId)
    if (!section) return

    const role = data.title || 'Professional'
    
    setGeneratingBullets(sectionId)
    try {
      const response = await fetch('http://localhost:8000/api/ai/generate_bullet_points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          company: data.name || undefined,
          achievements: `Work in ${section.title}`,
          count: 3,
          tone: selectedTone
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to generate bullets')
      }

      const result = await response.json()
      
      const newBullets = result.bullets.map((text: string) => ({
        id: `${Date.now()}-${Math.random()}`,
        text,
        params: {}
      }))

      onChange({
        ...data,
        sections: data.sections.map(s =>
          s.id === sectionId
            ? { ...s, bullets: [...s.bullets, ...newBullets] }
            : s
        )
      })
    } catch (error) {
      console.error('AI generate error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate bullets with AI')
    } finally {
      setGeneratingBullets(null)
    }
  }


  const generateSummaryWithAI = async () => {
    setGeneratingSummary(true)
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
      
      if (result.summary) {
        updateField('summary', result.summary)
      } else {
        alert('Failed to generate summary')
      }
    } catch (error) {
      console.error('Summary generation failed:', error)
      alert('Summary generation failed: ' + (error as Error).message)
    } finally {
      setGeneratingSummary(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = data.sections.findIndex((s) => s.id === active.id)
      const newIndex = data.sections.findIndex((s) => s.id === over.id)
      const newSections = arrayMove(data.sections, oldIndex, newIndex)
      onChange({ ...data, sections: newSections })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">AI Writing Tone</h3>
              <p className="text-xs text-gray-600">Choose the style for AI-generated content</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'professional', label: '💼 Professional', desc: 'Corporate & polished' },
              { value: 'technical', label: '⚙️ Technical', desc: 'Tech-focused' },
              { value: 'formal', label: '👔 Formal', desc: 'Executive-level' },
              { value: 'casual', label: '😊 Casual', desc: 'Conversational' }
            ].map(tone => (
              <button
                key={tone.value}
                onClick={() => setSelectedTone(tone.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedTone === tone.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
                title={tone.desc}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-300 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-2xl">👤</div>
          <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
          {!data.name && (
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold animate-pulse">
              ⚠️ Name Required
            </span>
          )}
        </div>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name (e.g., John Doe)"
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-semibold transition-all ${
                data.name 
                  ? 'border-green-400 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200' 
                  : 'border-red-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }`}
              autoFocus
            />
            {!data.name && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                👆 Start here! Enter your name to enable export
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="Job Title"
            value={data.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="px-4 py-2 border rounded-xl"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
            <input
              type="text"
              placeholder="Location"
              value={data.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <textarea
              placeholder="Professional Summary (e.g., Results-driven engineer with 5+ years...)"
              value={data.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              className="w-full px-4 py-2 border rounded-xl resize-none"
              rows={3}
            />
            <button
              onClick={generateSummaryWithAI}
              disabled={generatingSummary || !data.title}
              className="w-full py-2 border-2 border-purple-300 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!data.title ? 'Enter job title first' : 'Generate summary with AI'}
            >
              {generatingSummary ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Summary...
                </>
              ) : (
                <>
                  ✨ Generate Summary with AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={data.sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {data.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              data={data}
              updateSection={updateSection}
              removeSection={removeSection}
              addBullet={addBullet}
              updateBullet={updateBullet}
              removeBullet={removeBullet}
              moveBulletUp={moveBulletUp}
              moveBulletDown={moveBulletDown}
              toggleBoldText={toggleBoldText}
              improveBulletWithAI={improveBulletWithAI}
              generateBulletsWithAI={generateBulletsWithAI}
              generateBulletFromKeywords={generateBulletFromKeywords}
              improvingBullet={improvingBullet}
              generatingBullets={generatingBullets}
              roomId={roomId}
              onAddComment={onAddComment}
              onResolveComment={onResolveComment}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addSection}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add New Section
      </button>
    </div>
  )
}

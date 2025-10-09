'use client'
import { useState, useEffect } from 'react'

interface Section {
  id: string
  title: string
  bullets: Array<{
    id: string
    text: string
    params: Record<string, string>
  }>
}

interface Props {
  sections: Section[]
  onUpdate: (sections: Section[]) => void
}

export default function TwoColumnEditor({ sections, onUpdate }: Props) {
  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('twoColumnLeftWidth')) || 40
    }
    return 40
  })
  const [leftSections, setLeftSections] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('twoColumnLeft')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [rightSections, setRightSections] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('twoColumnRight')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('twoColumnLeftWidth', leftWidth.toString())
      localStorage.setItem('twoColumnLeft', JSON.stringify(leftSections))
      localStorage.setItem('twoColumnRight', JSON.stringify(rightSections))
    }
  }, [leftWidth, leftSections, rightSections])

  const toggleSectionColumn = (sectionId: string) => {
    if (leftSections.includes(sectionId)) {
      const newLeft = leftSections.filter(id => id !== sectionId)
      const newRight = [...rightSections, sectionId]
      setLeftSections(newLeft)
      setRightSections(newRight)
    } else if (rightSections.includes(sectionId)) {
      const newRight = rightSections.filter(id => id !== sectionId)
      const newLeft = [...leftSections, sectionId]
      setRightSections(newRight)
      setLeftSections(newLeft)
    } else {
      setLeftSections([...leftSections, sectionId])
    }
  }

  const updateBullet = (sectionId: string, bulletId: string, text: string) => {
    const updated = sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.map(b =>
              b.id === bulletId ? { ...b, text } : b
            )
          }
        : s
    )
    onUpdate(updated)
  }

  const addBullet = (sectionId: string) => {
    const updated = sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
          }
        : s
    )
    onUpdate(updated)
  }

  const removeBullet = (sectionId: string, bulletId: string) => {
    const updated = sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.filter(b => b.id !== bulletId)
          }
        : s
    )
    onUpdate(updated)
  }

  const moveBulletUp = (sectionId: string, bulletId: string) => {
    const updated = sections.map(s => {
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
    onUpdate(updated)
  }

  const moveBulletDown = (sectionId: string, bulletId: string) => {
    const updated = sections.map(s => {
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
    onUpdate(updated)
  }

  const toggleBoldText = (sectionId: string, bulletId: string) => {
    const updated = sections.map(s =>
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
    onUpdate(updated)
  }

  const leftSectionsList = sections.filter(s => leftSections.includes(s.id))
  const rightSectionsList = sections.filter(s => rightSections.includes(s.id))
  const unassignedSections = sections.filter(s => !leftSections.includes(s.id) && !rightSections.includes(s.id))

  return (
    <div className="space-y-4">
      {/* Column Width Control */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-blue-900">Two-Column Layout Settings</span>
          <span className="text-xs text-blue-600">Left: {leftWidth}% | Right: {100-leftWidth}%</span>
        </div>
        <input
          type="range"
          min="25"
          max="75"
          value={leftWidth}
          onChange={(e) => setLeftWidth(Number(e.target.value))}
          className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-blue-600 mt-1">
          <span>Narrow Left</span>
          <span>Balanced</span>
          <span>Wide Left</span>
        </div>
      </div>

      {/* Unassigned Sections */}
      {unassignedSections.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-3">📦 Assign Sections to Columns:</h3>
          <div className="space-y-2">
            {unassignedSections.map((section) => (
              <div key={section.id} className="flex gap-2">
                <div className="flex-1 bg-white px-3 py-2 rounded-lg border text-sm font-medium">
                  {section.title}
                </div>
                <button
                  onClick={() => {
                    setLeftSections([...leftSections, section.id])
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                >
                  → Left
                </button>
                <button
                  onClick={() => {
                    setRightSections([...rightSections, section.id])
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 transition-colors"
                >
                  Right →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Preview & Edit */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `${leftWidth}% ${100-leftWidth}%` }}>
        {/* Left Column */}
        <div className="space-y-3 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-blue-900">📍 Left Column</h3>
            <span className="text-xs bg-blue-200 px-2 py-1 rounded-full text-blue-700">
              {leftSectionsList.length} sections
            </span>
          </div>
          
          {leftSectionsList.map((section) => (
            <div key={section.id} className="bg-white rounded-lg p-3 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{section.title}</h4>
                <button
                  onClick={() => toggleSectionColumn(section.id)}
                  className="text-xs text-blue-600 hover:text-purple-600"
                >
                  Move →
                </button>
              </div>
              <div className="space-y-2">
                {section.bullets.map((bullet, idx) => (
                  <div key={bullet.id} className="bg-gray-50 rounded-lg p-2 border">
                    <div className="flex gap-2 items-start">
                      {/* Bullet Number & Reorder Controls */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveBulletUp(section.id, bullet.id)}
                            disabled={idx === 0}
                            className="w-4 h-4 rounded bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Move up"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveBulletDown(section.id, bullet.id)}
                            disabled={idx === section.bullets.length - 1}
                            className="w-4 h-4 rounded bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Move down"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Text Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={bullet.text}
                          onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                          className="w-full text-xs px-2 py-1 border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="Bullet point..."
                        />
                        
                        {/* Formatting Controls */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => toggleBoldText(section.id, bullet.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              bullet.text.includes('**') 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Toggle bold text"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeBullet(section.id, bullet.id)}
                        className="text-red-400 hover:text-red-600 text-sm font-bold"
                        title="Delete bullet"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addBullet(section.id)}
                  className="w-full text-xs py-1 border border-dashed border-blue-300 rounded hover:border-blue-500 hover:bg-blue-50 text-blue-600"
                >
                  + Add bullet
                </button>
              </div>
            </div>
          ))}
          
          {leftSectionsList.length === 0 && (
            <div className="text-center py-8 text-blue-400 text-sm">
              No sections in left column
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3 bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-purple-900">📍 Right Column</h3>
            <span className="text-xs bg-purple-200 px-2 py-1 rounded-full text-purple-700">
              {rightSectionsList.length} sections
            </span>
          </div>
          
          {rightSectionsList.map((section) => (
            <div key={section.id} className="bg-white rounded-lg p-3 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{section.title}</h4>
                <button
                  onClick={() => toggleSectionColumn(section.id)}
                  className="text-xs text-purple-600 hover:text-blue-600"
                >
                  ← Move
                </button>
              </div>
              <div className="space-y-2">
                {section.bullets.map((bullet, idx) => (
                  <div key={bullet.id} className="bg-gray-50 rounded-lg p-2 border">
                    <div className="flex gap-2 items-start">
                      {/* Bullet Number & Reorder Controls */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveBulletUp(section.id, bullet.id)}
                            disabled={idx === 0}
                            className="w-4 h-4 rounded bg-white border border-gray-300 hover:border-purple-500 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Move up"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveBulletDown(section.id, bullet.id)}
                            disabled={idx === section.bullets.length - 1}
                            className="w-4 h-4 rounded bg-white border border-gray-300 hover:border-purple-500 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Move down"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Text Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={bullet.text}
                          onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                          className="w-full text-xs px-2 py-1 border rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                          placeholder="Bullet point..."
                        />
                        
                        {/* Formatting Controls */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => toggleBoldText(section.id, bullet.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              bullet.text.includes('**') 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Toggle bold text"
                          >
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeBullet(section.id, bullet.id)}
                        className="text-red-400 hover:text-red-600 text-sm font-bold"
                        title="Delete bullet"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addBullet(section.id)}
                  className="w-full text-xs py-1 border border-dashed border-purple-300 rounded hover:border-purple-500 hover:bg-purple-50 text-purple-600"
                >
                  + Add bullet
                </button>
              </div>
            </div>
          ))}
          
          {rightSectionsList.length === 0 && (
            <div className="text-center py-8 text-purple-400 text-sm">
              No sections in right column
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


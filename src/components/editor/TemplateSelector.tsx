'use client'
import { useEffect, useState } from 'react'

interface Template {
  id: string
  name: string
  industry: string
}

interface Props {
  selected: string
  onChange: (templateId: string) => void
}

export default function TemplateSelector({ selected, onChange }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/templates`)
      .then(res => res.json())
      .then(data => setTemplates(data.templates))
      .catch(err => console.error('Failed to load templates:', err))
  }, [])

  const displayTemplates = showAll ? templates : templates.slice(0, 6)

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-gray-900">📄 Resume Template</label>
        <a 
          href="/templates" 
          target="_blank"
          className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
        >
          View All
        </a>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {displayTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onChange(template.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition text-left ${
              selected === template.id
                ? 'border-purple-600 bg-purple-100 text-purple-900'
                : 'border-gray-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="font-semibold">{template.name}</div>
            <div className="text-[10px] opacity-60">{template.industry}</div>
          </button>
        ))}
      </div>
      {templates.length > 6 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-2 py-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          Show {templates.length - 6} more templates →
        </button>
      )}
      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full mt-2 py-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          Show less ←
        </button>
      )}
    </div>
  )
}


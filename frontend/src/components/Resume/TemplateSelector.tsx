'use client'
import { useEffect, useState } from 'react'

import config from '@/lib/config';
interface Template {
  id: string
  name: string
  industry: string
  preview: string
}

interface Props {
  selected: string
  onChange: (templateId: string) => void
}

export default function TemplateSelector({ selected, onChange }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch(`${config.apiBase}/api/resume/templates`)
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
            className={`p-2 rounded-lg border-2 transition text-left ${
              selected === template.id
                ? 'border-purple-600 bg-purple-100'
                : 'border-gray-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="mb-2 bg-gray-50 rounded border overflow-hidden" style={{ height: '60px' }}>
              <img 
                src={template.preview} 
                alt={`${template.name} template preview`}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5UZW1wbGF0ZTwvdGV4dD48L3N2Zz4='
                }}
              />
            </div>
            <div className="font-semibold text-xs text-gray-900">{template.name}</div>
            <div className="text-[10px] text-gray-600 opacity-75">{template.industry}</div>
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


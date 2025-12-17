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
    <div className="bg-gradient-to-br from-primary-50/50 to-purple-50/50 rounded-2xl border-2 border-primary-200 p-4 shadow-sm surface-card">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-text-primary">📄 Resume Template</label>
        <a 
          href="/templates" 
          target="_blank"
          className="text-xs text-primary-600 hover:text-primary-800 font-medium underline transition-colors duration-200"
        >
          View All
        </a>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {displayTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onChange(template.id)}
            className={`p-2 rounded-lg border-2 transition-all duration-200 text-left shadow-sm hover:shadow-md ${
              selected === template.id
                ? 'border-primary-500 bg-primary-100 shadow-md'
                : 'border-border-subtle bg-white/95 backdrop-blur-sm hover:border-primary-300'
            }`}
          >
            <div className="mb-2 bg-primary-50/30 rounded border border-border-subtle overflow-hidden shadow-sm" style={{ height: '60px' }}>
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
            <div className="font-semibold text-xs text-text-primary">{template.name}</div>
            <div className="text-[10px] text-text-muted opacity-75">{template.industry}</div>
          </button>
        ))}
      </div>
      {templates.length > 6 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-2 py-2 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors duration-200"
        >
          Show {templates.length - 6} more templates →
        </button>
      )}
      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full mt-2 py-2 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors duration-200"
        >
          Show less ←
        </button>
      )}
    </div>
  )
}


'use client'
import { useEffect, useState } from 'react'

interface Template {
  id: string
  name: string
}

interface Props {
  selected: string
  onChange: (templateId: string) => void
}

export default function TemplateSelector({ selected, onChange }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/templates`)
      .then(res => res.json())
      .then(data => setTemplates(data.templates))
      .catch(err => console.error('Failed to load templates:', err))
  }, [])

  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm">
      <label className="text-sm font-semibold text-gray-700">Template</label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onChange(template.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
              selected === template.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  )
}


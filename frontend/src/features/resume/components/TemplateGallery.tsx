'use client'

import { useState } from 'react'
import { templateRegistry, TemplateRegistryEntry } from '../templates/registry'
import { TemplatePreview } from './TemplatePreview'

interface Props {
  currentTemplateId: string
  onSelectTemplate: (templateId: string) => void
  resumeData?: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    summary: string
    sections: Array<{
      id: string
      title: string
      bullets: Array<{ id: string; text: string }>
    }>
  }
}

export function TemplateGallery({ currentTemplateId, onSelectTemplate, resumeData }: Props) {
  const [filter, setFilter] = useState<'all' | 'traditional' | 'modern' | 'creative' | 'ats-friendly'>('all')

  const filteredTemplates = filter === 'all'
    ? templateRegistry
    : templateRegistry.filter(t => t.category === filter)

  const sampleResumeData = resumeData || {
    name: 'John Doe',
    title: 'Software Engineer',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    summary: 'Experienced professional with a proven track record of delivering high-quality solutions.',
    sections: [
      {
        id: '1',
        title: 'Experience',
        bullets: [
          { id: '1', text: 'Led development of key features improving user engagement' },
          { id: '2', text: 'Improved system performance by 40% through optimization' },
        ],
      },
      {
        id: '2',
        title: 'Skills',
        bullets: [
          { id: '3', text: 'JavaScript, TypeScript, React' },
          { id: '4', text: 'Node.js, Python, SQL' },
        ],
      },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Choose Template</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        >
          <option value="all">All Templates</option>
          <option value="traditional">Traditional</option>
          <option value="modern">Modern</option>
          <option value="creative">Creative</option>
          <option value="ats-friendly">ATS Friendly</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={currentTemplateId === template.id}
            onSelect={() => onSelectTemplate(template.id)}
            resumeData={sampleResumeData}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  resumeData,
}: {
  template: TemplateRegistryEntry
  isSelected: boolean
  onSelect: () => void
  resumeData: any
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-purple-600 bg-purple-50 shadow-md'
          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
          <p className="text-xs text-gray-600 mt-0.5">{template.description}</p>
        </div>
        {isSelected && (
          <span className="text-purple-600 text-xs font-medium ml-2">✓ Selected</span>
        )}
      </div>
      
      <div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200 overflow-hidden" style={{ height: '120px' }}>
        <TemplatePreview template={template} resumeData={resumeData} scale={0.15} />
      </div>
      
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-xs">{template.category}</span>
        <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs">ATS: {template.atsScore}%</span>
      </div>
    </button>
  )
}


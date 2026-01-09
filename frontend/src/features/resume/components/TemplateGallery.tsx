'use client'

import { useState } from 'react'
import { templateRegistry, TemplateRegistryEntry } from '../templates/registry'

// Placeholder SVG for template preview thumbnails
const TemplatePlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-white">
    <svg
      width="200"
      height="260"
      viewBox="0 0 200 260"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* White background */}
      <rect width="200" height="260" fill="#ffffff" />
      {/* Header section */}
      <rect x="15" y="15" width="170" height="28" rx="3" fill="#e5e7eb" />
      {/* Contact info lines */}
      <rect x="15" y="50" width="95" height="6" rx="2" fill="#d1d5db" />
      <rect x="15" y="60" width="115" height="6" rx="2" fill="#d1d5db" />
      {/* Section 1 */}
      <rect x="15" y="80" width="170" height="18" rx="3" fill="#e5e7eb" />
      <circle cx="20" cy="108" r="2.5" fill="#9ca3af" />
      <rect x="28" y="106" width="150" height="5" rx="2" fill="#e5e7eb" />
      <circle cx="20" cy="118" r="2.5" fill="#9ca3af" />
      <rect x="28" y="116" width="125" height="5" rx="2" fill="#e5e7eb" />
      {/* Section 2 */}
      <rect x="15" y="135" width="170" height="18" rx="3" fill="#e5e7eb" />
      <circle cx="20" cy="163" r="2.5" fill="#9ca3af" />
      <rect x="28" y="161" width="155" height="5" rx="2" fill="#e5e7eb" />
      <circle cx="20" cy="173" r="2.5" fill="#9ca3af" />
      <rect x="28" y="171" width="105" height="5" rx="2" fill="#e5e7eb" />
      {/* Section 3 */}
      <rect x="15" y="190" width="170" height="18" rx="3" fill="#e5e7eb" />
      <circle cx="20" cy="218" r="2.5" fill="#9ca3af" />
      <rect x="28" y="216" width="140" height="5" rx="2" fill="#e5e7eb" />
      <circle cx="20" cy="228" r="2.5" fill="#9ca3af" />
      <rect x="28" y="226" width="120" height="5" rx="2" fill="#e5e7eb" />
    </svg>
  </div>
)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Choose Template</h3>
          <p className="text-sm text-gray-500 mt-1">Select a template that matches your style and industry</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        >
          <option value="all">All Templates</option>
          <option value="traditional">Traditional</option>
          <option value="modern">Modern</option>
          <option value="creative">Creative</option>
          <option value="ats-friendly">ATS Friendly</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

function TemplatePlaceholderImage({ template }: { template: TemplateRegistryEntry }) {
  // Since the preview files are data URIs stored as text files (not actual images),
  // we'll use the placeholder component for all templates
  // In the future, when actual PNG preview images are available, they can be loaded here
  return <TemplatePlaceholder />
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
      className={`group relative w-full text-left transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2'
          : 'hover:shadow-lg'
      }`}
    >
      <div className={`rounded-xl border-2 overflow-hidden bg-white transition-all ${
        isSelected
          ? 'border-primary-500 shadow-lg'
          : 'border-gray-200 group-hover:border-primary-300 shadow-md'
      }`}>
        <div className="relative bg-gray-50 border-b border-gray-200 overflow-hidden" style={{ height: '200px' }}>
          <TemplatePlaceholderImage 
            template={template}
          />
          {isSelected && (
            <div className="absolute top-3 right-3 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shadow-lg z-10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-gray-900 text-base mb-1">{template.name}</h4>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{template.description}</p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="capitalize px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
              {template.category.replace('-', ' ')}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-md border border-green-200">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-green-700">ATS {template.atsScore}%</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}


'use client'

import { useState } from 'react'
import { templateRegistry, TemplateRegistryEntry } from '../templates/registry'
import { Check } from 'lucide-react'

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
  filter?: 'all' | 'traditional' | 'modern' | 'creative' | 'ats-friendly'
}

export function TemplateGallery({ currentTemplateId, onSelectTemplate, resumeData, filter = 'all' }: Props) {
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
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Choose Template</h3>
        <p className="text-sm text-gray-500 mt-1">Select a template that matches your style and industry</p>
      </div>

      <div id="template-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="grid" aria-label="Template selection grid">
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
  const getATSBadgeStyle = (score: number) => {
    if (score >= 85) {
      return 'bg-green-50 border-green-200 text-green-700'
    } else if (score >= 70) {
      return 'bg-amber-50 border-amber-200 text-amber-700'
    }
    return 'bg-green-50 border-green-200 text-green-700'
  }

  return (
    <button
      onClick={onSelect}
      className="group relative w-full text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl"
      aria-label={`Select ${template.name} template`}
    >
      <div
        className={`rounded-xl border-2 overflow-hidden bg-white transition-all duration-200 ${
          isSelected
            ? 'border-primary-600 shadow-xl ring-2 ring-primary-500/20 scale-[1.02]'
            : 'border-gray-200 group-hover:border-primary-300 shadow-md group-hover:shadow-lg group-hover:scale-[1.02]'
        }`}
      >
        <div className="relative bg-gray-50 border-b border-gray-200 overflow-hidden" style={{ height: '200px' }}>
          <TemplatePlaceholderImage template={template} />
          
          {/* Selection Checkmark Badge */}
          {isSelected && (
            <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-xl z-10 animate-in fade-in zoom-in duration-200">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-gray-900 text-base mb-1 leading-tight">{template.name}</h4>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{template.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="capitalize px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
              {template.category.replace('-', ' ')}
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getATSBadgeStyle(
              template.atsScore
            )}`}>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="text-xs font-semibold">ATS {template.atsScore}%</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}


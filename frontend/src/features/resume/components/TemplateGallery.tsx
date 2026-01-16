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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Choose Template</h3>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-2 sm:p-4">
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
  const getTemplateThumbnail = (templateId: string) => {
    const thumbnails: Record<string, JSX.Element> = {
      'classic': (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <rect width="200" height="100" fill="#f8f9fa"/>
          <rect x="20" y="10" width="160" height="8" fill="#dee2e6" rx="2"/>
          <rect x="20" y="25" width="80" height="6" fill="#adb5bd" rx="1"/>
          <rect x="20" y="35" width="60" height="4" fill="#ced4da" rx="1"/>
          <line x1="20" y1="50" x2="180" y2="50" stroke="#dee2e6" strokeWidth="1"/>
          <rect x="20" y="58" width="160" height="6" fill="#adb5bd" rx="1"/>
          <circle cx="25" cy="75" r="2" fill="#6c757d"/>
          <rect x="30" y="73" width="120" height="4" fill="#ced4da" rx="1"/>
          <circle cx="25" cy="85" r="2" fill="#6c757d"/>
          <rect x="30" y="83" width="100" height="4" fill="#ced4da" rx="1"/>
        </svg>
      ),
      'modern': (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <rect width="200" height="100" fill="#f8f9fa"/>
          <rect x="60" y="10" width="80" height="8" fill="#dee2e6" rx="2"/>
          <rect x="60" y="22" width="60" height="4" fill="#adb5bd" rx="1"/>
          <rect x="20" y="35" width="160" height="6" fill="#adb5bd" rx="1"/>
          <rect x="20" y="45" width="140" height="4" fill="#ced4da" rx="1"/>
          <rect x="20" y="58" width="160" height="6" fill="#adb5bd" rx="1"/>
          <circle cx="25" cy="75" r="2" fill="#6c757d"/>
          <rect x="30" y="73" width="130" height="4" fill="#ced4da" rx="1"/>
          <circle cx="25" cy="85" r="2" fill="#6c757d"/>
          <rect x="30" y="83" width="110" height="4" fill="#ced4da" rx="1"/>
        </svg>
      ),
      'two-column': (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <rect width="200" height="100" fill="#f8f9fa"/>
          <rect x="20" y="10" width="70" height="8" fill="#dee2e6" rx="2"/>
          <rect x="110" y="10" width="70" height="8" fill="#dee2e6" rx="2"/>
          <rect x="20" y="25" width="70" height="6" fill="#adb5bd" rx="1"/>
          <rect x="110" y="25" width="70" height="6" fill="#adb5bd" rx="1"/>
          <line x1="100" y1="10" x2="100" y2="90" stroke="#dee2e6" strokeWidth="1"/>
          <circle cx="25" cy="45" r="2" fill="#6c757d"/>
          <rect x="30" y="43" width="50" height="4" fill="#ced4da" rx="1"/>
          <circle cx="115" cy="45" r="2" fill="#6c757d"/>
          <rect x="120" y="43" width="50" height="4" fill="#ced4da" rx="1"/>
          <rect x="20" y="58" width="70" height="6" fill="#adb5bd" rx="1"/>
          <rect x="110" y="58" width="70" height="6" fill="#adb5bd" rx="1"/>
        </svg>
      ),
      'creative': (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea"/>
              <stop offset="100%" stopColor="#764ba2"/>
            </linearGradient>
          </defs>
          <rect width="200" height="100" fill="#f8f9fa"/>
          <rect x="0" y="0" width="200" height="20" fill="url(#grad)"/>
          <rect x="20" y="30" width="160" height="8" fill="#adb5bd" rx="2"/>
          <rect x="20" y="45" width="140" height="6" fill="#ced4da" rx="1"/>
          <rect x="20" y="58" width="160" height="6" fill="#adb5bd" rx="1"/>
          <circle cx="25" cy="75" r="2" fill="#6c757d"/>
          <rect x="30" y="73" width="120" height="4" fill="#ced4da" rx="1"/>
        </svg>
      ),
      'ats-friendly': (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <rect width="200" height="100" fill="#f8f9fa"/>
          <rect x="20" y="10" width="160" height="6" fill="#28a745" rx="1"/>
          <rect x="20" y="20" width="160" height="4" fill="#6c757d" rx="1"/>
          <line x1="20" y1="32" x2="180" y2="32" stroke="#28a745" strokeWidth="2"/>
          <rect x="20" y="38" width="160" height="6" fill="#adb5bd" rx="1"/>
          <circle cx="25" cy="55" r="2" fill="#28a745"/>
          <rect x="30" y="53" width="150" height="4" fill="#ced4da" rx="1"/>
          <circle cx="25" cy="65" r="2" fill="#28a745"/>
          <rect x="30" y="63" width="130" height="4" fill="#ced4da" rx="1"/>
          <rect x="20" y="75" width="160" height="6" fill="#adb5bd" rx="1"/>
        </svg>
      ),
    }
    return thumbnails[templateId] || thumbnails['classic']
  }

  return (
    <button
      onClick={onSelect}
      className={`relative w-full p-3 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50/30 shadow-lg'
          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
      }`}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-md z-10">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
          <p className="text-xs text-gray-600 mt-0.5">{template.description}</p>
        </div>
      </div>
      
      <div className="mb-2 bg-white rounded border border-gray-200 overflow-hidden h-24 sm:h-24 lg:h-16 xl:h-14">
        {getTemplateThumbnail(template.id)}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{template.category}</span>
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium text-green-700">ATS {template.atsScore}%</span>
        </div>
      </div>
    </button>
  )
}


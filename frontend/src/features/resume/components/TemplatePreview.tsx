'use client'

import { Suspense } from 'react'
import { templateRegistry, TemplateRegistryEntry } from '../templates/registry'

interface Props {
  template: TemplateRegistryEntry
  resumeData: {
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
  scale?: number
}

export function TemplatePreview({ template, resumeData, scale = 0.3 }: Props) {
  const TemplateComponent = template.Component
  const config = template.defaultConfig

  const sampleData = {
    name: resumeData.name || 'John Doe',
    title: resumeData.title || 'Software Engineer',
    email: resumeData.email || 'john.doe@email.com',
    phone: resumeData.phone || '+1 (555) 123-4567',
    location: resumeData.location || 'San Francisco, CA',
    summary: resumeData.summary || 'Experienced professional with a proven track record.',
    sections: resumeData.sections.length > 0
      ? resumeData.sections.slice(0, 2)
      : [
          {
            id: '1',
            title: 'Experience',
            bullets: [
              { id: '1', text: 'Led development of key features' },
              { id: '2', text: 'Improved performance by 40%' },
            ],
          },
        ],
    fieldsVisible: {},
  }

  const containerHeight = scale >= 0.12 ? 80 : 120
  return (
    <div className="relative w-full" style={{ height: `${containerHeight}px`, overflow: 'hidden' }}>
      <div
        className="absolute top-0 left-0 origin-top-left bg-white"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
          minHeight: `${containerHeight / scale}px`,
        }}
      >
        <Suspense fallback={<div className="p-4 text-center text-gray-400 text-xs">Loading...</div>}>
          <TemplateComponent
            data={sampleData}
            config={config}
            replacements={{}}
          />
        </Suspense>
      </div>
    </div>
  )
}


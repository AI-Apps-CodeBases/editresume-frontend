'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  description: string
  preview: string
  layout: string
}

const TEMPLATES: Template[] = [
  {
    id: 'clean',
    name: 'Clean ATS',
    description: 'Traditional centered layout, perfect for ATS systems',
    preview: 'Center-aligned header, uppercase sections, classic format',
    layout: 'Header (center) → Summary → Experience → Skills → Education'
  },
  {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Left-aligned, clean lines, contemporary look',
    preview: 'Left-aligned header, mixed case sections, modern spacing',
    layout: 'Header (left) → Skills (sidebar) → Experience → Education'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Subtle styling, maximum readability',
    preview: 'Minimal borders, clean typography, spacious layout',
    layout: 'Header → Experience → Skills → Education → Projects'
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Skills sidebar with main content area',
    preview: 'Left sidebar for skills/contact, right for experience',
    layout: 'Sidebar (Skills, Contact) → Main (Experience, Education)'
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'More content, less space, dense but readable',
    preview: 'Tight spacing, more info per page',
    layout: 'Header → Skills → Experience → Education → Projects'
  }
]

export default function TemplatesPage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    localStorage.setItem('selectedTemplate', templateId)
    router.push('/editor')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-semibold text-primary">editresume.io</a>
          <a href="/editor" className="text-sm text-gray-600 hover:text-primary">
            Skip to Editor →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Choose Your Template</h1>
          <p className="text-lg text-gray-600 mt-2">
            Pick a layout, then customize with your content
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border-2 p-6 hover:border-primary cursor-pointer transition shadow-sm"
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div className="mb-4">
                <div className="aspect-[8.5/11] bg-white rounded-lg border-2 p-4 flex flex-col text-xs overflow-hidden">
                  {/* Preview based on template type */}
                  {template.id === 'clean' && (
                    <>
                      <div className="text-center border-b-2 border-black pb-2 mb-2">
                        <div className="font-bold text-sm">JOHN DOE</div>
                        <div className="text-xs">Senior Engineer</div>
                        <div className="text-xs opacity-60">email@example.com | 555-1234</div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="font-bold uppercase text-xs border-b border-black">EXPERIENCE</div>
                          <div className="text-xs opacity-60 mt-1">• Led team of 5 engineers</div>
                          <div className="text-xs opacity-60">• Reduced costs by 40%</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-xs border-b border-black">SKILLS</div>
                          <div className="text-xs opacity-60 mt-1">Python, AWS, Docker</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'modern' && (
                    <>
                      <div className="border-b pb-2 mb-2">
                        <div className="font-bold text-sm">John Doe</div>
                        <div className="text-xs">Senior Engineer</div>
                        <div className="text-xs opacity-60">email@example.com | 555-1234</div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="font-bold text-xs border-b">Experience</div>
                          <div className="text-xs opacity-60 mt-1">• Led team of 5 engineers</div>
                        </div>
                        <div>
                          <div className="font-bold text-xs border-b">Skills</div>
                          <div className="text-xs opacity-60 mt-1">Python, AWS, Docker</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'minimal' && (
                    <>
                      <div className="border-b border-gray-300 pb-2 mb-2">
                        <div className="font-semibold text-sm">John Doe</div>
                        <div className="text-xs opacity-70">Senior Engineer</div>
                        <div className="text-xs opacity-50">email@example.com</div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="font-semibold text-xs">Experience</div>
                          <div className="text-xs opacity-60 mt-1">• Led engineering team</div>
                        </div>
                        <div>
                          <div className="font-semibold text-xs">Skills</div>
                          <div className="text-xs opacity-60 mt-1">Python, AWS</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'two-column' && (
                    <div className="flex gap-2 h-full">
                      <div className="w-1/3 bg-gray-100 p-2 rounded">
                        <div className="font-bold text-xs mb-2">SKILLS</div>
                        <div className="text-xs opacity-60 space-y-1">
                          <div>• Python</div>
                          <div>• AWS</div>
                          <div>• Docker</div>
                        </div>
                        <div className="font-bold text-xs mt-2 mb-1">CONTACT</div>
                        <div className="text-xs opacity-60">email@example.com</div>
                      </div>
                      <div className="w-2/3">
                        <div className="text-center border-b pb-1 mb-2">
                          <div className="font-bold text-sm">JOHN DOE</div>
                          <div className="text-xs">Senior Engineer</div>
                        </div>
                        <div className="font-bold text-xs border-b">EXPERIENCE</div>
                        <div className="text-xs opacity-60 mt-1">• Led team</div>
                        <div className="text-xs opacity-60">• 40% cost reduction</div>
                      </div>
                    </div>
                  )}
                  {template.id === 'compact' && (
                    <>
                      <div className="text-center border-b border-black pb-1 mb-1">
                        <div className="font-bold text-xs">JOHN DOE</div>
                        <div className="text-xs">Senior Engineer | email@example.com</div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <div className="font-bold uppercase text-xs">SKILLS</div>
                          <div className="text-xs opacity-60">Python, AWS, Docker, Kubernetes</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-xs">EXPERIENCE</div>
                          <div className="text-xs opacity-60">• Led 5 engineers • Cost savings 40%</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-xs">EDUCATION</div>
                          <div className="text-xs opacity-60">BS Computer Science</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <strong>Layout:</strong><br/>
                {template.layout}
              </div>

              <button
                onClick={() => handleSelectTemplate(template.id)}
                className="mt-4 w-full py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark"
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Don't worry - you can change templates anytime in the editor
          </p>
          <a
            href="/editor"
            className="inline-block px-6 py-3 border-2 border-primary text-primary rounded-xl font-medium hover:bg-primary hover:text-white transition"
          >
            Or Start Without Template
          </a>
        </div>
      </div>
    </div>
  )
}


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
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Bold blue accent for polished corporate look',
    preview: 'Blue header border, uppercase sections, professional font',
    layout: 'Header (blue accent) → Summary → Experience → Skills'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Unique styling for creative industries',
    preview: 'No borders, creative font, modern layout',
    layout: 'Header → Portfolio → Experience → Skills → Education'
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated serif font for leadership roles',
    preview: 'Navy border, centered header, executive presence',
    layout: 'Header (center) → Summary → Leadership → Experience'
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Monospace font ideal for developers',
    preview: 'Code-style font, technical aesthetic',
    layout: 'Header → Skills → Projects → Experience → Education'
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Classic format for academic positions',
    preview: 'Times font, traditional academic style',
    layout: 'Header → Education → Publications → Experience → Research'
  }
]

export default function TemplatesPage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    localStorage.setItem('selectedTemplate', templateId)
    router.push('/editor')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-200 to-yellow-200 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            editresume.io
          </a>
          <a 
            href="/editor" 
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-semibold"
          >
            Skip to Editor →
          </a>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="text-center mb-12 animate-fadeIn">
          <div className="inline-block text-6xl mb-4">📄</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Choose Your Template
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pick a design that matches your style. You can change it anytime in the editor.
          </p>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fadeIn">
          {TEMPLATES.map((template, index) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border-2 border-gray-200 p-4 hover:border-blue-400 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl group transform hover:scale-105"
              onClick={() => handleSelectTemplate(template.id)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mb-3">
                <div className="aspect-[8.5/11] bg-white rounded-lg border p-3 flex flex-col text-[10px] overflow-hidden">
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
                  {template.id === 'professional' && (
                    <>
                      <div className="border-b-2 border-blue-600 pb-2 mb-2">
                        <div className="font-bold text-sm">John Doe</div>
                        <div className="text-xs">Senior Engineer</div>
                        <div className="text-xs opacity-60">email@example.com</div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <div className="font-bold uppercase text-xs">EXPERIENCE</div>
                          <div className="text-xs opacity-60">• Led team</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-xs">SKILLS</div>
                          <div className="text-xs opacity-60">AWS, Docker</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'creative' && (
                    <>
                      <div className="pb-2 mb-2">
                        <div className="font-bold text-sm text-purple-600">John Doe</div>
                        <div className="text-xs italic">Creative Professional</div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <div className="font-semibold text-xs">Portfolio</div>
                          <div className="text-xs opacity-60">Award designs</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'executive' && (
                    <>
                      <div className="text-center border-b-2 border-blue-800 pb-2 mb-2">
                        <div className="font-bold text-sm">JOHN DOE</div>
                        <div className="text-xs font-serif">CEO</div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <div className="font-bold uppercase text-xs">LEADERSHIP</div>
                          <div className="text-xs opacity-60">• 20 years</div>
                        </div>
                      </div>
                    </>
                  )}
                  {template.id === 'technical' && (
                    <>
                      <div className="border-b border-gray-500 pb-2 mb-2 font-mono">
                        <div className="font-bold text-sm">john_doe</div>
                        <div className="text-xs">$ developer</div>
                      </div>
                      <div className="space-y-1 font-mono">
                        <div className="text-xs">// projects</div>
                        <div className="text-xs opacity-60">- microservices</div>
                      </div>
                    </>
                  )}
                  {template.id === 'academic' && (
                    <>
                      <div className="text-center border-b border-black pb-2 mb-2 font-serif">
                        <div className="font-bold text-sm">Dr. John Doe</div>
                        <div className="text-xs">Professor</div>
                      </div>
                      <div className="space-y-1 font-serif">
                        <div className="text-xs font-semibold">Education</div>
                        <div className="text-xs opacity-60">PhD CS</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 min-h-[32px]">{template.description}</p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectTemplate(template.id)
                  }}
                  className="w-full py-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Select Template
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center animate-fadeIn">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200 max-w-2xl mx-auto">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Not Sure Yet?</h2>
            <p className="text-gray-600 mb-6">
              You can always change your template later in the editor. Start creating your resume now!
            </p>
            <a
              href="/editor"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Without Template
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 animate-fadeIn">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-bold text-gray-900 mb-2">Fully Customizable</h3>
            <p className="text-sm text-gray-600">Change colors, fonts, and layouts to match your style</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-bold text-gray-900 mb-2">ATS-Friendly</h3>
            <p className="text-sm text-gray-600">All templates are optimized for applicant tracking systems</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-gray-900 mb-2">Export Anywhere</h3>
            <p className="text-sm text-gray-600">Download as PDF or DOCX for any application</p>
          </div>
        </div>
      </div>
    </div>
  )
}


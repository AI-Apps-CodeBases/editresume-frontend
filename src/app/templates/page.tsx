'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  industry: string
}

const TEMPLATE_CONFIGS: Record<string, {
  description: string
  color: string
  icon: string
  preview: {
    headerAlign: 'left' | 'center'
    borderColor: string
    bgColor: string
    font: string
    uppercase: boolean
  }
}> = {
  tech: {
    description: 'Modern layout for software engineers, developers, and tech professionals',
    color: 'from-blue-500 to-blue-700',
    icon: '💻',
    preview: { headerAlign: 'left', borderColor: '#2563eb', bgColor: '#eff6ff', font: 'font-sans', uppercase: false }
  },
  healthcare: {
    description: 'Professional design for doctors, nurses, and healthcare workers',
    color: 'from-green-500 to-emerald-600',
    icon: '⚕️',
    preview: { headerAlign: 'center', borderColor: '#059669', bgColor: '#ecfdf5', font: 'font-serif', uppercase: true }
  },
  finance: {
    description: 'Executive style for bankers, analysts, and financial professionals',
    color: 'from-blue-700 to-blue-900',
    icon: '💼',
    preview: { headerAlign: 'center', borderColor: '#1e40af', bgColor: '#dbeafe', font: 'font-serif', uppercase: true }
  },
  creative: {
    description: 'Eye-catching design for designers, marketers, and creative roles',
    color: 'from-purple-500 to-pink-500',
    icon: '🎨',
    preview: { headerAlign: 'left', borderColor: '#a855f7', bgColor: '#fae8ff', font: 'font-sans', uppercase: false }
  },
  academic: {
    description: 'Scholarly format for professors, researchers, and educators',
    color: 'from-gray-600 to-gray-800',
    icon: '🎓',
    preview: { headerAlign: 'center', borderColor: '#374151', bgColor: '#f9fafb', font: 'font-serif', uppercase: false }
  },
  legal: {
    description: 'Formal layout for lawyers, attorneys, and legal professionals',
    color: 'from-slate-700 to-slate-900',
    icon: '⚖️',
    preview: { headerAlign: 'center', borderColor: '#1e293b', bgColor: '#f1f5f9', font: 'font-serif', uppercase: true }
  },
  engineering: {
    description: 'Technical design for mechanical, civil, and other engineers',
    color: 'from-orange-500 to-orange-700',
    icon: '⚙️',
    preview: { headerAlign: 'left', borderColor: '#ea580c', bgColor: '#ffedd5', font: 'font-sans', uppercase: false }
  },
  sales: {
    description: 'Dynamic layout for sales professionals and business developers',
    color: 'from-red-500 to-red-700',
    icon: '📈',
    preview: { headerAlign: 'left', borderColor: '#dc2626', bgColor: '#fee2e2', font: 'font-sans', uppercase: false }
  },
  consulting: {
    description: 'Sophisticated design for consultants and strategy professionals',
    color: 'from-indigo-600 to-indigo-800',
    icon: '🤝',
    preview: { headerAlign: 'center', borderColor: '#4338ca', bgColor: '#e0e7ff', font: 'font-serif', uppercase: true }
  },
  hr: {
    description: 'People-focused layout for HR managers and recruiters',
    color: 'from-purple-600 to-purple-800',
    icon: '👥',
    preview: { headerAlign: 'left', borderColor: '#7c3aed', bgColor: '#f3e8ff', font: 'font-sans', uppercase: false }
  },
  operations: {
    description: 'Efficient design for operations and logistics professionals',
    color: 'from-cyan-600 to-cyan-800',
    icon: '📦',
    preview: { headerAlign: 'left', borderColor: '#0891b2', bgColor: '#cffafe', font: 'font-sans', uppercase: false }
  },
  customer: {
    description: 'Friendly layout for customer service and support professionals',
    color: 'from-sky-500 to-sky-700',
    icon: '🎯',
    preview: { headerAlign: 'center', borderColor: '#0284c7', bgColor: '#e0f2fe', font: 'font-sans', uppercase: false }
  },
  data: {
    description: 'Analytical design for data scientists and analysts',
    color: 'from-violet-600 to-violet-800',
    icon: '📊',
    preview: { headerAlign: 'left', borderColor: '#8b5cf6', bgColor: '#ede9fe', font: 'font-mono', uppercase: false }
  },
  product: {
    description: 'Strategic layout for product managers and owners',
    color: 'from-pink-600 to-pink-800',
    icon: '🚀',
    preview: { headerAlign: 'left', borderColor: '#ec4899', bgColor: '#fce7f3', font: 'font-sans', uppercase: false }
  },
  executive: {
    description: 'Premium design for C-suite executives and senior leadership',
    color: 'from-slate-800 to-black',
    icon: '👔',
    preview: { headerAlign: 'center', borderColor: '#0f172a', bgColor: '#f8fafc', font: 'font-serif', uppercase: true }
  }
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/templates`)
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load templates:', err)
        setLoading(false)
      })
  }, [])

  const handleSelectTemplate = (templateId: string) => {
    localStorage.setItem('selectedTemplate', templateId)
    router.push('/editor')
  }

  const industries = ['all', ...new Set(templates.map(t => t.industry))]
  const filteredTemplates = selectedIndustry === 'all' 
    ? templates 
    : templates.filter(t => t.industry === selectedIndustry)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
        <div className="text-center mb-12">
          <div className="inline-block text-6xl mb-4">📄</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            15 Industry-Specific Templates
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
            Each template has unique styling: colors, fonts, alignments, and formatting.
          </p>
          <p className="text-sm text-gray-500">
            Notice the differences: header borders, text alignment, uppercase vs mixed case, serif vs sans-serif fonts
          </p>
        </div>

        {/* Industry Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {industries.map(industry => (
            <button
              key={industry}
              onClick={() => setSelectedIndustry(industry)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedIndustry === industry
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {industry === 'all' ? '🌟 All Industries' : industry}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTemplates.map((template, index) => {
              const config = TEMPLATE_CONFIGS[template.id] || TEMPLATE_CONFIGS.tech
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-3 hover:border-blue-400 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl group transform hover:scale-105"
                  onClick={() => handleSelectTemplate(template.id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className="text-center mb-2">
                    <span className="text-3xl">{config.icon}</span>
                  </div>

                  {/* Live Preview - SUPER OBVIOUS differences */}
                  <div className="mb-3 relative">
                    {/* Color indicator badge */}
                    <div 
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full z-10 shadow-lg border-2 border-white"
                      style={{ backgroundColor: config.preview.borderColor }}
                    ></div>
                    
                    <div 
                      className="aspect-[8.5/11] rounded-lg shadow-md p-3 flex flex-col overflow-hidden"
                      style={{ 
                        backgroundColor: config.preview.bgColor,
                        border: `5px solid ${config.preview.borderColor}`
                      }}
                    >
                      {/* Header with extreme styling differences */}
                      <div 
                        className={`pb-2 mb-2 ${config.preview.headerAlign === 'center' ? 'text-center' : 'text-left'}`}
                        style={{ 
                          borderBottom: `4px solid ${config.preview.borderColor}`,
                          backgroundColor: config.preview.borderColor + '15'
                        }}
                      >
                        <div 
                          className={`${config.preview.font} font-extrabold ${config.preview.uppercase ? 'uppercase tracking-widest' : ''}`} 
                          style={{ 
                            fontSize: '11px',
                            color: config.preview.borderColor,
                            letterSpacing: config.preview.uppercase ? '0.1em' : 'normal'
                          }}
                        >
                          {template.id === 'data' ? 'jane_doe' : config.preview.uppercase ? 'J. DOE' : 'John Doe'}
                        </div>
                        <div className={`${config.preview.font} font-semibold`} style={{ fontSize: '8px', opacity: 0.8 }}>
                          {template.industry}
                        </div>
                      </div>
                      
                      {/* Body sections */}
                      <div className="space-y-2 flex-1">
                        <div>
                          <div 
                            className={`${config.preview.font} font-bold ${config.preview.uppercase ? 'uppercase tracking-widest' : ''}`}
                            style={{ 
                              fontSize: '9px',
                              borderBottom: `3px solid ${config.preview.borderColor}`,
                              paddingBottom: '3px',
                              marginBottom: '4px',
                              color: config.preview.borderColor,
                              letterSpacing: config.preview.uppercase ? '0.1em' : 'normal'
                            }}
                          >
                            {config.preview.uppercase ? 'EXPERIENCE' : 'Experience'}
                          </div>
                          <div className={config.preview.font} style={{ fontSize: '7px', opacity: 0.7, paddingLeft: config.preview.headerAlign === 'center' ? '0' : '4px' }}>
                            • Led team of 5
                          </div>
                          <div className={config.preview.font} style={{ fontSize: '7px', opacity: 0.7, paddingLeft: config.preview.headerAlign === 'center' ? '0' : '4px' }}>
                            • Achieved 40% growth
                          </div>
                        </div>
                        <div>
                          <div 
                            className={`${config.preview.font} font-bold ${config.preview.uppercase ? 'uppercase tracking-widest' : ''}`}
                            style={{ 
                              fontSize: '9px',
                              borderBottom: `3px solid ${config.preview.borderColor}`,
                              paddingBottom: '3px',
                              marginBottom: '4px',
                              color: config.preview.borderColor,
                              letterSpacing: config.preview.uppercase ? '0.1em' : 'normal'
                            }}
                          >
                            {config.preview.uppercase ? 'SKILLS' : 'Skills'}
                          </div>
                          <div className={config.preview.font} style={{ fontSize: '7px', opacity: 0.7, paddingLeft: config.preview.headerAlign === 'center' ? '0' : '4px' }}>
                            {template.id === 'data' ? '$ python --skills' : 'Leadership & Strategy'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {template.name}
                      </h3>
                      <p className="text-[10px] text-gray-500">{template.industry}</p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectTemplate(template.id)
                      }}
                      className={`w-full py-1.5 text-[10px] bg-gradient-to-r ${config.color} text-white rounded-lg font-semibold hover:shadow-md transition-all duration-300`}
                    >
                      Select
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Visual Differences Guide */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-center mb-6">What Makes Each Template Unique?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-bold text-sm mb-1">Border Colors</h3>
              <p className="text-xs text-gray-600">Blue, green, red, orange borders for different industries</p>
              <div className="flex gap-1 mt-2">
                <div className="w-6 h-6 rounded border-2 border-blue-600"></div>
                <div className="w-6 h-6 rounded border-2 border-green-600"></div>
                <div className="w-6 h-6 rounded border-2 border-red-600"></div>
                <div className="w-6 h-6 rounded border-2 border-orange-600"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">📐</div>
              <h3 className="font-bold text-sm mb-1">Header Alignment</h3>
              <p className="text-xs text-gray-600">Left-aligned for modern, centered for traditional</p>
              <div className="mt-2 space-y-1">
                <div className="text-[8px] text-left border-b pb-1">Left Aligned</div>
                <div className="text-[8px] text-center border-b pb-1">Centered</div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">Aa</div>
              <h3 className="font-bold text-sm mb-1">Font Styles</h3>
              <p className="text-xs text-gray-600">Sans-serif, serif, or monospace fonts</p>
              <div className="mt-2 space-y-1">
                <div className="text-[9px] font-sans">Sans-serif Font</div>
                <div className="text-[9px] font-serif">Serif Font</div>
                <div className="text-[9px] font-mono">Monospace</div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">ABC</div>
              <h3 className="font-bold text-sm mb-1">Text Casing</h3>
              <p className="text-xs text-gray-600">UPPERCASE for formal, Mixed for modern</p>
              <div className="mt-2 space-y-1">
                <div className="text-[9px] uppercase font-bold">Experience</div>
                <div className="text-[9px] font-bold">Experience</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200 max-w-2xl mx-auto">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">All Templates Include</h2>
            <div className="grid md:grid-cols-2 gap-4 text-left mt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h3 className="font-semibold text-sm">ATS-Optimized</h3>
                  <p className="text-xs text-gray-600">Pass applicant tracking systems</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h3 className="font-semibold text-sm">Fully Customizable</h3>
                  <p className="text-xs text-gray-600">Edit colors, fonts, and layout</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h3 className="font-semibold text-sm">PDF & DOCX Export</h3>
                  <p className="text-xs text-gray-600">Download in both formats</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h3 className="font-semibold text-sm">AI-Powered</h3>
                  <p className="text-xs text-gray-600">Improve content with AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

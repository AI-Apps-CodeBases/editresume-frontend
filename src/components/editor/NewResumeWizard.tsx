'use client'
import { useState } from 'react'
import UploadResume from './UploadResume'
import PasteResume from './PasteResume'

interface Props {
  onComplete: (data: any, template: string, layoutConfig?: any) => void
  onCancel: () => void
}

export default function NewResumeWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<'method' | 'template' | 'layout'>('method')
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste' | 'scratch' | null>(null)
  const [resumeData, setResumeData] = useState<any>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('clean')
  const [layoutConfig, setLayoutConfig] = useState({
    leftWidth: 50,
    leftSections: [] as string[],
    rightSections: [] as string[]
  })

  const templates = [
    { id: 'clean', name: 'Clean', desc: 'Simple and professional', layout: 'single' },
    { id: 'modern', name: 'Modern', desc: 'Bold headers with style', layout: 'single' },
    { id: 'minimal', name: 'Minimal', desc: 'Ultra-clean design', layout: 'single' },
    { id: 'two-column', name: 'Two Column', desc: 'Side-by-side layout', layout: 'two-column' },
    { id: 'compact', name: 'Compact', desc: 'Space-efficient', layout: 'single' },
    { id: 'professional', name: 'Professional', desc: 'Corporate style', layout: 'single' },
    { id: 'creative', name: 'Creative', desc: 'Stand out design', layout: 'single' },
    { id: 'executive', name: 'Executive', desc: 'Senior leadership', layout: 'single' },
    { id: 'technical', name: 'Technical', desc: 'Developer focused', layout: 'single' },
    { id: 'academic', name: 'Academic', desc: 'Research oriented', layout: 'single' }
  ]

  const handleMethodSelect = (method: 'upload' | 'paste' | 'scratch') => {
    setInputMethod(method)
    if (method === 'scratch') {
      setResumeData({
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        sections: [
          {
            id: Date.now().toString(),
            title: 'Work Experience',
            bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
          },
          {
            id: (Date.now() + 1).toString(),
            title: 'Skills',
            bullets: [{ id: Date.now().toString() + '-2', text: '', params: {} }]
          },
          {
            id: (Date.now() + 2).toString(),
            title: 'Education',
            bullets: [{ id: Date.now().toString() + '-3', text: '', params: {} }]
          }
        ]
      })
      setStep('template')
    }
  }

  const handleUploadOrPasteSuccess = (data: any) => {
    setResumeData(data)
    setStep('template')
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    
    if (template?.layout === 'two-column' && resumeData?.sections?.length > 0) {
      setStep('layout')
    } else {
      finishWizard(templateId, null)
    }
  }

  const finishWizard = (template: string, layout: any) => {
    onComplete(resumeData, template, layout)
  }

  const handleLayoutComplete = () => {
    finishWizard(selectedTemplate, layoutConfig)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 z-50 overflow-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Create Your Resume</h1>
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 'method' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <span className="font-bold">1</span>
                <span>Input Method</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-600"></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 'template' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <span className="font-bold">2</span>
                <span>Template</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-600"></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 'layout' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <span className="font-bold">3</span>
                <span>Layout</span>
              </div>
            </div>
          </div>

          {/* Step 1: Choose Input Method */}
          {step === 'method' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">How would you like to start?</h2>
                <p className="text-gray-400">Choose your preferred method to create your resume</p>
              </div>

              {inputMethod === 'upload' && (
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={() => setInputMethod(null)}
                    className="mb-4 text-white hover:text-blue-400 flex items-center gap-2"
                  >
                    ← Back to options
                  </button>
                  <UploadResume onUploadSuccess={handleUploadOrPasteSuccess} />
                </div>
              )}

              {inputMethod === 'paste' && (
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={() => setInputMethod(null)}
                    className="mb-4 text-white hover:text-blue-400 flex items-center gap-2"
                  >
                    ← Back to options
                  </button>
                  <PasteResume onPasteSuccess={handleUploadOrPasteSuccess} />
                </div>
              )}

              {!inputMethod && (
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <button
                    onClick={() => handleMethodSelect('upload')}
                    className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Upload File</h3>
                    <p className="text-blue-100 mb-4">Upload your existing PDF or DOCX resume</p>
                    <div className="flex items-center gap-2 text-sm text-blue-200">
                      <span className="text-green-300">✓</span>
                      <span>Auto-extract everything</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleMethodSelect('paste')}
                    className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Paste Text</h3>
                    <p className="text-purple-100 mb-4">Copy and paste your resume content</p>
                    <div className="flex items-center gap-2 text-sm text-purple-200">
                      <span className="text-green-300">✓</span>
                      <span>Quick and easy</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleMethodSelect('scratch')}
                    className="group bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">✨</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Start Fresh</h3>
                    <p className="text-pink-100 mb-4">Create a new resume from scratch</p>
                    <div className="flex items-center gap-2 text-sm text-pink-200">
                      <span className="text-green-300">✓</span>
                      <span>Blank canvas</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Template */}
          {step === 'template' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Template</h2>
                <p className="text-gray-400">Select a design that fits your style</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`group bg-white rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl border-4 ${
                      selectedTemplate === template.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="aspect-[8.5/11] bg-white border-2 border-gray-200 rounded-lg mb-4 p-3 overflow-hidden">
                      {/* Mini Resume Preview */}
                      <div className="h-full flex flex-col text-[8px] leading-tight">
                        {template.layout === 'two-column' ? (
                          <div className="flex gap-1 h-full">
                            <div className="w-1/3 bg-gray-100 p-1 rounded">
                              <div className="font-bold mb-1">SKILLS</div>
                              <div className="text-gray-600">• Python</div>
                              <div className="text-gray-600">• AWS</div>
                            </div>
                            <div className="w-2/3">
                              <div className="font-bold text-center border-b pb-1 mb-1">JOHN DOE</div>
                              <div className="font-bold mb-1">EXPERIENCE</div>
                              <div className="text-gray-600">• Led team</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center border-b pb-1 mb-1">
                              <div className="font-bold">JOHN DOE</div>
                              <div className="text-gray-600">Engineer</div>
                            </div>
                            <div className="font-bold mb-1">EXPERIENCE</div>
                            <div className="text-gray-600 mb-1">• Led team of 5</div>
                            <div className="font-bold mb-1">SKILLS</div>
                            <div className="text-gray-600">Python, AWS</div>
                          </>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-xs text-gray-600">{template.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => setStep('method')}
                  className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Configure Layout (Two-Column Only) */}
          {step === 'layout' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Configure Two-Column Layout</h2>
                <p className="text-gray-400">Assign sections to left or right column</p>
              </div>

              <div className="bg-white rounded-3xl p-8 max-w-4xl mx-auto">
                <div className="space-y-6">
                  {/* Info Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-blue-900 mb-2">📋 Common Resume Sections</h3>
                    <p className="text-sm text-blue-700">Your resume already includes standard sections. Click sections below to assign them to columns, or add custom sections.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Column Width Distribution
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-16">Left {layoutConfig.leftWidth}%</span>
                      <input
                        type="range"
                        min="30"
                        max="70"
                        value={layoutConfig.leftWidth}
                        onChange={(e) => setLayoutConfig({ ...layoutConfig, leftWidth: Number(e.target.value) })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 w-16">Right {100 - layoutConfig.leftWidth}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Left Column
                      </h3>
                      <div className="space-y-2">
                        {resumeData?.sections?.map((section: any) => (
                          <button
                            key={section.id}
                            onClick={() => {
                              const newLeft = layoutConfig.leftSections.includes(section.id)
                                ? layoutConfig.leftSections.filter(id => id !== section.id)
                                : [...layoutConfig.leftSections, section.id]
                              const newRight = layoutConfig.rightSections.filter(id => id !== section.id)
                              setLayoutConfig({ ...layoutConfig, leftSections: newLeft, rightSections: newRight })
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                              layoutConfig.leftSections.includes(section.id)
                                ? 'bg-blue-50 border-blue-500 text-blue-900'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                          >
                            {section.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        Right Column
                      </h3>
                      <div className="space-y-2">
                        {resumeData?.sections?.map((section: any) => (
                          <button
                            key={section.id}
                            onClick={() => {
                              const newRight = layoutConfig.rightSections.includes(section.id)
                                ? layoutConfig.rightSections.filter(id => id !== section.id)
                                : [...layoutConfig.rightSections, section.id]
                              const newLeft = layoutConfig.leftSections.filter(id => id !== section.id)
                              setLayoutConfig({ ...layoutConfig, leftSections: newLeft, rightSections: newRight })
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                              layoutConfig.rightSections.includes(section.id)
                                ? 'bg-purple-50 border-purple-500 text-purple-900'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-300'
                            }`}
                          >
                            {section.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Section Button */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => {
                        const newSection = {
                          id: Date.now().toString(),
                          title: 'New Section',
                          bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
                        }
                        setResumeData({
                          ...resumeData,
                          sections: [...(resumeData?.sections || []), newSection]
                        })
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Custom Section
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => setStep('template')}
                  className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleLayoutComplete}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all"
                >
                  Start Editing →
                </button>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <div className="text-center mt-8">
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


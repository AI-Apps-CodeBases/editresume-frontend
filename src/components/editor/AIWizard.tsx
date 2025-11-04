'use client'
import React, { useState } from 'react'

import config from '@/lib/config';
interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Array<{
    id: string
    title: string
    bullets: Array<{
      id: string
      text: string
      params?: Record<string, any>
    }>
    params?: Record<string, any>
  }>
  fieldsVisible?: Record<string, boolean>
}

interface Props {
  resumeData: ResumeData
  onAddContent?: (newContent: any) => void
  onClose: () => void
  context?: {
    type: string
    companyName?: string
    jobTitle?: string
    dateRange?: string
    sectionId?: string
    bulletId?: string
    bulletText?: string
    sectionTitle?: string
  }
}

export default function AIWizard({ resumeData, onAddContent, onClose, context }: Props) {
  const [step, setStep] = useState(1)
  const [contentType, setContentType] = useState<'job' | 'project' | 'skill' | 'education'>('job')
  const [requirements, setRequirements] = useState('')
  const [position, setPosition] = useState<'beginning' | 'middle' | 'end'>('end')
  const [targetSection, setTargetSection] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)

  // Auto-setup for work experience context
  React.useEffect(() => {
    if (context?.type === 'work-experience' || context?.type === 'work-experience-bullet') {
      setContentType('job')
      setStep(2) // Skip to requirements step
      if (context.companyName && context.jobTitle) {
        setRequirements(`Company: ${context.companyName}\nJob Title: ${context.jobTitle}\nDate Range: ${context.dateRange || 'Not specified'}\n\nPlease describe your experience at this company in 2-3 sentences. Include your role, key responsibilities, and main achievements:`)
      }
      // Skip the position selection step for work experience
      setPosition('end')
    } else if (context?.type === 'bullet-improvement') {
      setContentType('job')
      setStep(2) // Skip to requirements step
      if (context.bulletText) {
        setRequirements(`Current bullet point: "${context.bulletText}"\n\nSection: ${context.sectionTitle || 'Work Experience'}\nCompany: ${context.companyName || 'Not specified'}\nRole: ${context.jobTitle || 'Not specified'}\n\nPlease describe how you want to improve this bullet point. Include specific achievements, metrics, or details you'd like to add:`)
      }
      // Skip the position selection step for bullet improvement
      setPosition('end')
    }
  }, [context])

  const handleGenerate = async () => {
    console.log('=== AI WIZARD GENERATING CONTENT ===')
    console.log('Content type:', contentType)
    console.log('Requirements:', requirements)
    console.log('Position:', position)
    console.log('Target section:', targetSection)
    console.log('Existing data:', resumeData)
    console.log('Context:', context)
    
    setIsGenerating(true)
    try {
      // For work experience context, create a specialized payload
      let payload
      if (context?.type === 'work-experience' || context?.type === 'work-experience-bullet') {
        payload = {
          contentType: 'work-experience',
          requirements,
          context: {
            companyName: context.companyName,
            jobTitle: context.jobTitle,
            dateRange: context.dateRange,
            sectionId: context.sectionId,
            bulletId: context.bulletId,
            existingData: resumeData
          }
        }
      } else if (context?.type === 'bullet-improvement') {
        payload = {
          contentType: 'bullet-improvement',
          requirements,
          context: {
            sectionId: context.sectionId,
            bulletId: context.bulletId,
            bulletText: context.bulletText,
            sectionTitle: context.sectionTitle,
            companyName: context.companyName,
            jobTitle: context.jobTitle,
            existingData: resumeData
          }
        }
      } else {
        payload = {
          contentType,
          requirements,
          position,
          targetSection,
          existingData: resumeData,
          context: {
            name: resumeData.name,
            title: resumeData.title,
            currentSections: resumeData.sections.map(s => s.title)
          }
        }
      }
      
      console.log('Sending payload to backend:', payload)
      
      const response = await fetch(`${config.apiBase}/api/ai/generate_resume_content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Failed to generate content: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Generated content result:', result)
      setGeneratedContent(result)
      setStep(3)
    } catch (error) {
      console.error('Content generation failed:', error)
      alert('Failed to generate content: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddContent = () => {
    console.log('=== AI WIZARD ADDING CONTENT ===')
    console.log('Generated content:', generatedContent)
    console.log('Content type:', contentType)
    console.log('Position:', position)
    console.log('Target section:', targetSection)
    console.log('Context:', context)
    
    if (generatedContent) {
      // For work experience context, directly update the company information
      if (context?.type === 'work-experience' || context?.type === 'work-experience-bullet') {
        const contentToAdd = {
          type: 'work-experience-update',
          content: generatedContent,
          context: {
            companyName: context.companyName,
            jobTitle: context.jobTitle,
            dateRange: context.dateRange,
            sectionId: context.sectionId,
            bulletId: context.bulletId
          }
        }
        
        console.log('Updating work experience:', contentToAdd)
        if (onAddContent) {
          onAddContent(contentToAdd)
        }
        onClose()
      } else if (context?.type === 'bullet-improvement') {
        // For bullet improvement, directly update the specific bullet point
        const contentToAdd = {
          type: 'bullet-improvement',
          content: generatedContent,
          context: {
            sectionId: context.sectionId,
            bulletId: context.bulletId,
            sectionTitle: context.sectionTitle,
            companyName: context.companyName,
            jobTitle: context.jobTitle
          }
        }
        
        console.log('Improving bullet point:', contentToAdd)
        if (onAddContent) {
          onAddContent(contentToAdd)
        }
        onClose()
      } else {
        const contentToAdd = {
          type: contentType,
          content: generatedContent,
          position,
          targetSection
        }
        console.log('Calling onAddContent with:', contentToAdd)
        if (onAddContent) {
          onAddContent(contentToAdd)
        }
        onClose()
      }
    } else {
      console.error('No generated content to add')
      alert('No content generated to add')
    }
  }

  const getContentTypeExamples = () => {
    switch (contentType) {
      case 'job':
        return "Example: 'Add a DevOps Engineer role at Google where I worked with Jenkins, Kubernetes, and led infrastructure migration projects'"
      case 'project':
        return "Example: 'Add a machine learning project where I built a recommendation system using Python and TensorFlow'"
      case 'skill':
        return "Example: 'Add technical skills section with cloud technologies like AWS, Docker, and CI/CD tools'"
      case 'education':
        return "Example: 'Add a Computer Science degree from Stanford with relevant coursework'"
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Content Wizard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Tell me what you want to add, and I'll create it for you!</p>
        </div>

        {/* Step 1: Content Type */}
        {step === 1 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">What would you like to add?</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { type: 'job', label: '💼 Work Experience', desc: 'Add a new job or position' },
                { type: 'project', label: '🚀 Project', desc: 'Add a project or achievement' },
                { type: 'skill', label: '🛠️ Skills', desc: 'Add technical or soft skills' },
                { type: 'education', label: '🎓 Education', desc: 'Add education or certification' }
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setContentType(type as any)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    contentType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{label}</div>
                  <div className="text-sm text-gray-600">{desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Next: Describe Your Requirements
            </button>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Describe what you want to add</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Requirements
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={`${getContentTypeExamples()}`}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {contentType === 'job' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Where to add this job?
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'beginning', label: '🏁 Beginning' },
                      { value: 'middle', label: '📍 Middle' },
                      { value: 'end', label: '🏁 End' }
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setPosition(value as any)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          position === value
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {contentType === 'job' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Section
                  </label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Auto-detect (Work Experience)</option>
                    {resumeData.sections.map(section => (
                      <option key={section.id} value={section.id}>{section.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={!requirements.trim() || isGenerating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    🤖 Generate Content
                  </>
                )}
              </button>
            </div>
          </div>
        )}

            {/* Step 3: Review & Add */}
        {step === 3 && generatedContent && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Review Generated Content</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Generated {contentType === 'job' ? 'Job Experience' : contentType}:</h4>
              <div className="space-y-2">
                {contentType === 'job' && (
                  <>
                    {generatedContent.company && (
                      <div><strong>Company:</strong> {generatedContent.company}</div>
                    )}
                    {generatedContent.role && (
                      <div><strong>Role:</strong> {generatedContent.role}</div>
                    )}
                    {generatedContent.duration && (
                      <div><strong>Duration:</strong> {generatedContent.duration}</div>
                    )}
                    {generatedContent.bullets && Array.isArray(generatedContent.bullets) && (
                      <div>
                        <strong>Bullet Points:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {generatedContent.bullets.map((bullet: string, index: number) => (
                            <li key={index} className="text-sm">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {contentType === 'project' && (
                  <>
                    {generatedContent.name && (
                      <div><strong>Project Name:</strong> {generatedContent.name}</div>
                    )}
                    {generatedContent.description && (
                      <div><strong>Description:</strong> {generatedContent.description}</div>
                    )}
                    {generatedContent.bullets && Array.isArray(generatedContent.bullets) && (
                      <div>
                        <strong>Bullet Points:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {generatedContent.bullets.map((bullet: string, index: number) => (
                            <li key={index} className="text-sm">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {contentType === 'skill' && generatedContent.categories && (
                  <div>
                    <strong>Skills by Category:</strong>
                    <div className="mt-2 space-y-1">
                      {Object.entries(generatedContent.categories).map(([category, skills]) => (
                        <div key={category} className="text-sm">
                          <strong>{category}:</strong> {Array.isArray(skills) ? (skills as string[]).join(', ') : String(skills)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {contentType === 'education' && (
                  <>
                    {generatedContent.institution && (
                      <div><strong>Institution:</strong> {generatedContent.institution}</div>
                    )}
                    {generatedContent.degree && (
                      <div><strong>Degree:</strong> {generatedContent.degree}</div>
                    )}
                    {generatedContent.year && (
                      <div><strong>Year:</strong> {generatedContent.year}</div>
                    )}
                    {generatedContent.coursework && Array.isArray(generatedContent.coursework) && (
                      <div>
                        <strong>Coursework:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {generatedContent.coursework.map((course: string, index: number) => (
                            <li key={index} className="text-sm">{course}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedContent.honors && Array.isArray(generatedContent.honors) && (
                      <div>
                        <strong>Honors:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {generatedContent.honors.map((honor: string, index: number) => (
                            <li key={index} className="text-sm">{honor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={handleAddContent}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                ✅ Add to Resume
              </button>
            </div>
            
            {/* Debug Test Button */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700 mb-2">
                🧪 <strong>Debug:</strong> Test backend connection
              </p>
              <button
                onClick={async () => {
                  console.log('=== TESTING BACKEND CONNECTION ===')
                  try {
                    const response = await fetch(`${config.apiBase}/api/ai/generate_resume_content`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contentType: 'job',
                        requirements: 'Test DevOps job at Google with Jenkins and Kubernetes',
                        position: 'beginning',
                        targetSection: '',
                        existingData: resumeData,
                        context: {
                          name: resumeData.name,
                          title: resumeData.title,
                          currentSections: resumeData.sections.map(s => s.title)
                        }
                      })
                    })
                    console.log('Test response status:', response.status)
                    const result = await response.json()
                    console.log('Test response result:', result)
                    alert('Backend test successful! Check console for details.')
                  } catch (error) {
                    console.error('Backend test failed:', error)
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    alert('Backend test failed: ' + errorMessage)
                  }
                }}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-semibold hover:bg-yellow-700"
              >
                Test Backend
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import React, { useState } from 'react'

interface ResumeEditorCanvasProps {
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
      bullets: Array<{
        id: string
        text: string
        params: Record<string, string>
      }>
    }>
  }
  onResumeUpdate?: (updatedResume: any) => void
  onSectionGenerate?: (sectionId: string) => void
}

export default function ResumeEditorCanvas({
  resumeData,
  onResumeUpdate,
  onSectionGenerate,
}: ResumeEditorCanvasProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date>(new Date())

  const sectionIcons: Record<string, string> = {
    'Contact Information': '📧',
    'Professional Summary': '📝',
    'Work Experience': '💼',
    Projects: '🚀',
    Education: '🎓',
    Skills: '🛠️',
  }

  const handleFieldEdit = (fieldId: string, value: string) => {
    // Update logic here
    setLastSaved(new Date())
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes === 1) return '1 min ago'
    return `${minutes} min ago`
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 custom-scrollbar">
      {/* Editor Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Resumes</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">{resumeData.name || 'Untitled Resume'}</span>
            <span>/</span>
            <span className="text-gray-600">Editor</span>
          </div>

          {/* Center: View Toggle */}


          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Saved · {formatTimeAgo(lastSaved)}
            </span>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Preview
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Download PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Resume Canvas */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Candidate Name */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            {resumeData.name || 'Your Name'}
          </h1>
        </div>

        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg font-semibold text-gray-700">
              {resumeData.title || 'Your Title'}
            </span>
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
            + Add Title Field
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Contact Information */}
          <SectionCard
            id="contact"
            title="Contact Information"
            icon={sectionIcons['Contact Information']}
            isEnabled={true}
            onGenerate={() => onSectionGenerate?.('contact')}
          >
            <div className="space-y-3">
              <ContactField icon="📧" label="Email" value={resumeData.email || 'your.email@example.com'} />
              <ContactField icon="📱" label="Phone" value={resumeData.phone || '+1 (555) 000-0000'} />
              <ContactField icon="📍" label="Location" value={resumeData.location || 'City, Country'} />
              <ContactField icon="💼" label="LinkedIn" value="linkedin.com/in/yourprofile" />
              <ContactField icon="🌐" label="Website" value="yourwebsite.com" />
              <ContactField icon="💻" label="GitHub" value="github.com/yourusername" />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                + Add Contact Field
              </div>
            </div>
          </SectionCard>

          {/* Professional Summary */}
          <SectionCard
            id="summary"
            title="Professional Summary"
            icon={sectionIcons['Professional Summary']}
            isEnabled={true}
            onGenerate={() => onSectionGenerate?.('summary')}
          >
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {resumeData.summary || 'Write a compelling professional summary that highlights your key skills and experience...'}
              </p>
            </div>
          </SectionCard>

          {/* Work Experience */}
          <SectionCard
            id="experience"
            title="Work Experience"
            icon={sectionIcons['Work Experience']}
            isEnabled={true}
            onGenerate={() => onSectionGenerate?.('experience')}
          >
            <div className="space-y-4">
              {resumeData.sections
                .find((s) => s.title === 'Work Experience')
                ?.bullets.map((bullet) => (
                  <div key={bullet.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg group">
                    <div className="cursor-move text-gray-400 group-hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700">{bullet.text}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )) || (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                    + Add Work Experience
                  </div>
                )}
            </div>
          </SectionCard>

          {/* Add more sections similarly */}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  id,
  title,
  icon,
  isEnabled,
  onGenerate,
  children,
}: {
  id: string
  title: string
  icon: string
  isEnabled: boolean
  onGenerate?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={() => {}} 
            className="w-4 h-4 text-blue-600 rounded" 
          />
          <span className="text-xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
          >
            Generate
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          <div className="cursor-move text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-4">{children}</div>
    </div>
  )
}

function ContactField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-gray-900 font-medium">{value}</div>
      </div>
      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  )
}


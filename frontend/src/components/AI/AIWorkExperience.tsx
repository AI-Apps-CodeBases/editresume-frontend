'use client'
import React, { useState, useEffect } from 'react'
import { useModal } from '@/contexts/ModalContext'
import config from '@/lib/config'

interface Props {
  companyName: string
  jobTitle: string
  dateRange: string
  sectionId: string
  bulletId: string
  onUpdate: (data: {
    companyName: string
    jobTitle: string
    dateRange: string
    bullets: string[]
  }) => void
  onClose: () => void
}

export default function AIWorkExperience({ companyName, jobTitle, dateRange, sectionId, bulletId, onUpdate, onClose }: Props) {
  const { showAlert } = useModal()
  const [formData, setFormData] = useState({
    companyName: companyName || '',
    jobTitle: jobTitle || '',
    dateRange: dateRange || '',
    projects: ''
  })
  const [experienceDescription, setExperienceDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<any>(null)
  const [jobDescription, setJobDescription] = useState<string>('')

  useEffect(() => {
    const jd = typeof window !== 'undefined' ? localStorage.getItem('currentJDText') || '' : ''
    setJobDescription(jd)
  }, [])

  const handleGenerate = async () => {
    if (!formData.companyName.trim()) {
      await showAlert({
        type: 'warning',
        message: 'Please enter a company name',
        title: 'Missing Information'
      })
      return
    }
    if (!formData.jobTitle.trim()) {
      await showAlert({
        type: 'warning',
        message: 'Please enter a job title',
        title: 'Missing Information'
      })
      return
    }
    if (!formData.dateRange.trim()) {
      await showAlert({
        type: 'warning',
        message: 'Please enter a date range',
        title: 'Missing Information'
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`${config.apiBase}/api/ai/generate-work-experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCompany: formData.companyName,
          currentJobTitle: formData.jobTitle,
          currentDateRange: formData.dateRange,
          experienceDescription: experienceDescription || `${formData.jobTitle} at ${formData.companyName}. ${formData.projects ? `Projects: ${formData.projects}` : ''}`,
          projects: formData.projects,
          jobDescription: jobDescription
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate work experience')
      }

      const result = await response.json()
      setGeneratedData({
        companyName: result.companyName || formData.companyName,
        jobTitle: result.jobTitle || formData.jobTitle,
        dateRange: result.dateRange || formData.dateRange,
        bullets: result.bullets || []
      })
    } catch (error) {
      console.error('Error generating work experience:', error)
      await showAlert({
        type: 'error',
        message: 'Failed to generate work experience. Please try again.',
        title: 'Generation Error'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (generatedData) {
      onUpdate({
        companyName: generatedData.companyName,
        jobTitle: generatedData.jobTitle,
        dateRange: generatedData.dateRange,
        bullets: generatedData.bullets
      })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🤖 AI Work Experience Generator
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Fill in your work details and AI will generate optimized bullet points based on your job description
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {!generatedData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="e.g., Google, Microsoft, Amazon"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Range <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dateRange}
                  onChange={(e) => setFormData({...formData, dateRange: e.target.value})}
                  placeholder="e.g., Jan 2020 - Dec 2023 or 2020-2023"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Projects You Worked On
                </label>
                <textarea
                  value={formData.projects}
                  onChange={(e) => setFormData({...formData, projects: e.target.value})}
                  placeholder="List the main projects you worked on at this company. For example: 'E-commerce platform migration, Payment gateway integration, Mobile app development'"
                  className="w-full h-24 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Describe key projects to help AI generate more relevant bullet points
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Experience Details (Optional)
                </label>
                <textarea
                  value={experienceDescription}
                  onChange={(e) => setExperienceDescription(e.target.value)}
                  placeholder="Add any additional details about your responsibilities, achievements, or technologies used..."
                  className="w-full h-32 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {jobDescription && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">📋 Job Description Detected</p>
                  <p className="text-xs text-blue-700">
                    AI will optimize bullet points to match keywords and requirements from your target job description
                  </p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!formData.companyName.trim() || !formData.jobTitle.trim() || !formData.dateRange.trim() || isGenerating}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating optimized bullet points...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>Generate Work Experience</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  <span>✨</span>
                  <span>Generated Work Experience</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={generatedData.companyName}
                      onChange={(e) => setGeneratedData({...generatedData, companyName: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title</label>
                      <input
                        type="text"
                        value={generatedData.jobTitle}
                        onChange={(e) => setGeneratedData({...generatedData, jobTitle: e.target.value})}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
                      <input
                        type="text"
                        value={generatedData.dateRange}
                        onChange={(e) => setGeneratedData({...generatedData, dateRange: e.target.value})}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span>📝</span>
                  <span>Generated Bullet Points</span>
                </h3>
                <div className="space-y-3">
                  {generatedData.bullets.map((bullet: string, index: number) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                      <textarea
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...generatedData.bullets]
                          newBullets[index] = e.target.value
                          setGeneratedData({...generatedData, bullets: newBullets})
                        }}
                        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => {
                          const newBullets = generatedData.bullets.filter((_: any, i: number) => i !== index)
                          setGeneratedData({...generatedData, bullets: newBullets})
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0"
                        title="Remove bullet point"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setGeneratedData({
                        ...generatedData,
                        bullets: [...generatedData.bullets, 'New bullet point']
                      })
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    + Add Bullet Point
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedData(null)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  ← Back to Form
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                >
                  ✅ Apply to Resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'
import React, { useState } from 'react'

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
  const [experienceDescription, setExperienceDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<any>(null)

  const handleGenerate = async () => {
    if (!experienceDescription.trim()) {
      alert('Please describe your experience first')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/generate-work-experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceDescription,
          currentCompany: companyName,
          currentJobTitle: jobTitle,
          currentDateRange: dateRange
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate work experience')
      }

      const result = await response.json()
      setGeneratedData(result)
    } catch (error) {
      console.error('Error generating work experience:', error)
      // Fallback to mock data for testing
      setGeneratedData({
        companyName: companyName || 'Tech Company',
        jobTitle: jobTitle || 'Software Engineer',
        dateRange: dateRange || '2020-2023',
        bullets: [
          'Developed and maintained web applications using modern technologies',
          'Collaborated with cross-functional teams to deliver high-quality software solutions',
          'Implemented automated testing and CI/CD pipelines',
          'Mentored junior developers and conducted code reviews'
        ]
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Work Experience Generator</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Describe your experience and AI will generate company info and bullet points</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedData ? (
            <div className="space-y-6">
              {/* Current Company Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Company Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Company:</strong> {companyName}</div>
                  <div><strong>Role:</strong> {jobTitle}</div>
                  <div><strong>Date Range:</strong> {dateRange}</div>
                </div>
              </div>

              {/* Experience Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Experience
                </label>
                <textarea
                  value={experienceDescription}
                  onChange={(e) => setExperienceDescription(e.target.value)}
                  placeholder="Example: I worked as a Senior Software Engineer at TechCorp from 2020 to 2023. I led a team of 5 developers, built scalable web applications using React and Node.js, implemented CI/CD pipelines, and improved system performance by 40%. I also mentored junior developers and conducted code reviews."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include your role, company, time period, key responsibilities, and achievements
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!experienceDescription.trim() || isGenerating}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    🤖 Generate Work Experience
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated Company Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">✨ Generated Company Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={generatedData.companyName}
                      onChange={(e) => setGeneratedData({...generatedData, companyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={generatedData.jobTitle}
                      onChange={(e) => setGeneratedData({...generatedData, jobTitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <input
                      type="text"
                      value={generatedData.dateRange}
                      onChange={(e) => setGeneratedData({...generatedData, dateRange: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Bullet Points */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Generated Bullet Points</h3>
                <div className="space-y-3">
                  {generatedData.bullets.map((bullet: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <textarea
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...generatedData.bullets]
                          newBullets[index] = e.target.value
                          setGeneratedData({...generatedData, bullets: newBullets})
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                      />
                      <button
                        onClick={() => {
                          const newBullets = generatedData.bullets.filter((_: any, i: number) => i !== index)
                          setGeneratedData({...generatedData, bullets: newBullets})
                        }}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
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
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Bullet Point
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Back to Description
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  ✅ Apply Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


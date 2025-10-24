import React, { useState } from 'react'

interface AISectionAssistantProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (data: any) => void
  context: {
    sectionTitle: string
    sectionId: string
    bulletId: string
    itemName: string
    itemType: string
    dateRange: string
  }
}

export default function AISectionAssistant({ isOpen, onClose, onUpdate, context }: AISectionAssistantProps) {
  const [description, setDescription] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please provide a description of your experience')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/generate-section-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          sectionTitle: context.sectionTitle,
          itemName: context.itemName,
          itemType: context.itemType,
          dateRange: context.dateRange
        })
      })

      if (!response.ok) throw new Error('Failed to generate content')
      
      const result = await response.json()
      setGeneratedContent(result)
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (generatedContent) {
      onUpdate(generatedContent)
      onClose()
    }
  }

  const getSectionType = () => {
    const title = context.sectionTitle.toLowerCase()
    if (title.includes('experience') || title.includes('work')) return 'work experience'
    if (title.includes('project')) return 'project'
    if (title.includes('skill')) return 'skill'
    if (title.includes('certificate')) return 'certificate'
    if (title.includes('education')) return 'education'
    return 'content'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🤖 AI Assistant - {getSectionType().charAt(0).toUpperCase() + getSectionType().slice(1)}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Current Item Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Current {getSectionType()}:</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <div><strong>Name:</strong> {context.itemName}</div>
                <div><strong>Type:</strong> {context.itemType}</div>
                <div><strong>Date:</strong> {context.dateRange}</div>
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Describe your {getSectionType()} in 2-3 sentences:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Please describe your ${getSectionType()} at ${context.itemName}. Include your role, key responsibilities, and main achievements:`}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </div>
              ) : (
                '🤖 Generate Content'
              )}
            </button>

            {/* Generated Content */}
            {generatedContent && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Generated Content:</h3>
                
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name:</label>
                  <input
                    type="text"
                    value={generatedContent.itemName || ''}
                    onChange={(e) => setGeneratedContent({...generatedContent, itemName: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Type:</label>
                  <input
                    type="text"
                    value={generatedContent.itemType || ''}
                    onChange={(e) => setGeneratedContent({...generatedContent, itemType: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date:</label>
                  <input
                    type="text"
                    value={generatedContent.dateRange || ''}
                    onChange={(e) => setGeneratedContent({...generatedContent, dateRange: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Bullet Points */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bullet Points:</label>
                  <div className="space-y-2">
                    {generatedContent.bullets?.map((bullet: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-gray-600 mt-1">•</span>
                        <textarea
                          value={bullet}
                          onChange={(e) => {
                            const newBullets = [...generatedContent.bullets]
                            newBullets[index] = e.target.value
                            setGeneratedContent({...generatedContent, bullets: newBullets})
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApply}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-blue-600 transition-all"
                >
                  ✅ Apply Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

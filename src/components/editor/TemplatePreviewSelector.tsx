'use client'
import React, { useState } from 'react'

interface TemplatePreviewSelectorProps {
  currentTemplate: string
  onTemplateChange: (template: string) => void
  className?: string
}

const templates = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Professional and minimalist',
    preview: 'Clean, professional layout with clear typography',
    color: 'bg-blue-500'
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Side-by-side layout',
    preview: 'Two-column layout for more content',
    color: 'bg-purple-500'
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense, information-rich',
    preview: 'Compact layout maximizing space',
    color: 'bg-green-500'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean design',
    preview: 'Minimalist approach with lots of whitespace',
    color: 'bg-gray-500'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary styling',
    preview: 'Modern design with subtle gradients',
    color: 'bg-pink-500'
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Perfect for developers',
    preview: 'Tech-focused layout with code-like styling',
    color: 'bg-indigo-500'
  }
]

export default function TemplatePreviewSelector({ 
  currentTemplate, 
  onTemplateChange, 
  className = '' 
}: TemplatePreviewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentTemplateData = templates.find(t => t.id === currentTemplate)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover-lift"
      >
        <div className={`w-3 h-3 rounded-full ${currentTemplateData?.color}`}></div>
        <div className="text-left">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {currentTemplateData?.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentTemplateData?.description}
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-soft-lg z-50 animate-fade-in-up">
          <div className="p-2 space-y-1">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onTemplateChange(template.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  currentTemplate === template.id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' 
                    : ''
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${template.color}`}></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {template.description}
                  </div>
                </div>
                {currentTemplate === template.id && (
                  <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

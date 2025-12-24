'use client'

import { Check, X } from 'lucide-react'

interface FeedbackItem {
  title: string
  status: 'good' | 'issue'
  description?: string
  suggestion?: string
}

interface DetailedFeedbackProps {
  items: FeedbackItem[]
  title?: string
}

export default function DetailedFeedback({ items, title = 'Detailed Feedback' }: DetailedFeedbackProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              item.status === 'good' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div
              className={`flex-shrink-0 mt-0.5 ${
                item.status === 'good' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {item.status === 'good' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${item.status === 'good' ? 'text-green-900' : 'text-red-900'}`}>
                {item.title}
              </div>
              {item.description && (
                <div className={`text-xs mt-1 ${item.status === 'good' ? 'text-green-700' : 'text-red-700'}`}>
                  {item.description}
                </div>
              )}
              {item.suggestion && item.status === 'issue' && (
                <div className="text-xs mt-2 text-gray-700 bg-white rounded p-2 border border-gray-200">
                  <strong>Fix:</strong> {item.suggestion}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


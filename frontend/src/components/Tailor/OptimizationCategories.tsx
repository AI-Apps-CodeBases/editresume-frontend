'use client'

import { ChevronRight } from 'lucide-react'

export interface Category {
  name?: string
  count: number
  items: Array<{
    title: string
    description: string
    priority: string
    impact_score: number
    specific_suggestion: string
    example?: string
  }>
}

interface OptimizationCategoriesProps {
  categories: Record<string, Category>
  onCategoryClick?: (categoryName: string) => void
  expandedCategory?: string | null
}

export default function OptimizationCategories({
  categories,
  onCategoryClick,
  expandedCategory,
}: OptimizationCategoriesProps) {
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'searchability':
        return '🔍'
      case 'hard skills':
        return '⚙️'
      case 'soft skills':
        return '💬'
      case 'formatting':
        return '📄'
      case 'content quality':
        return '✨'
      default:
        return '📝'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-3">
      {Object.entries(categories).map(([categoryName, category]) => (
        <div
          key={categoryName}
          className={`border rounded-lg overflow-hidden transition-all ${
            expandedCategory === categoryName
              ? 'border-blue-500 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <button
            onClick={() => onCategoryClick?.(categoryName)}
            className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{getCategoryIcon(categoryName)}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">{categoryName}</div>
                <div className="text-sm text-gray-600">
                  {category.count} {category.count === 1 ? 'issue' : 'issues'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {category.count > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                    {category.count}
                  </span>
                )}
                <ChevronRight
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedCategory === categoryName ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>
          </button>

          {expandedCategory === categoryName && category.items.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
              {category.items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                    </div>
                    <span
                      className={`ml-2 px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  {item.specific_suggestion && (
                    <div className="text-xs text-gray-700 mt-2">
                      <strong>Suggestion:</strong> {item.specific_suggestion}
                    </div>
                  )}
                  {item.example && (
                    <div className="text-xs text-gray-600 mt-2 italic">
                      <strong>Example:</strong> {item.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


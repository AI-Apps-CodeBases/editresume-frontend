'use client'

import { Suspense } from 'react'
import TailorSuggestionsContainer from '@/features/atsTailor/components/TailorSuggestionsContainer'

export default function TailorSuggestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-3xl animate-pulse">📊</div>
            <p className="text-sm font-semibold text-gray-600">Loading suggestions...</p>
          </div>
        </div>
      }
    >
      <TailorSuggestionsContainer />
    </Suspense>
  )
}


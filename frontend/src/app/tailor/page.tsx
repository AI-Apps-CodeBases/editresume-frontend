'use client'

import { Suspense } from 'react'
import TailorPageContainer from '@/features/atsTailor/components/TailorPageContainer'

export default function TailorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-sm text-slate-600">Loading…</div>
        </div>
      }
    >
      <TailorPageContainer />
    </Suspense>
  )
}



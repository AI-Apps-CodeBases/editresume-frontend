import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import CollaborationSection from '@/components/home/CollaborationSection'
import ExtensionAuthHandler from '@/components/extension/ExtensionAuthHandler'

export default function Page() {
  return (
    <div className="flex flex-col">
      <Suspense fallback={null}>
        <ExtensionAuthHandler />
      </Suspense>
      <HeroSection />
      <FeatureGrid />
      <StepsSection />
      <TestimonialsSection />
      <CollaborationSection />
    </div>
  )
}
import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'
import Pricing from '@/components/Pricing'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import CollaborationSection from '@/components/home/CollaborationSection'

export default function Page() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeatureGrid />
      <Pricing />
      <StepsSection />
      <TestimonialsSection />
      <CollaborationSection />
    </div>
  )
}
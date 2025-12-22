import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'
import Pricing from '@/components/Pricing'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import VideoTutorialSection from '@/components/home/VideoTutorialSection'

export default function Page() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <VideoTutorialSection />
      <FeatureGrid />
      <Pricing />
      <StepsSection />
      <TestimonialsSection />
    </div>
  )
}
import HeroSection from '@/components/home/HeroSection'
import StickyNav from '@/components/home/StickyNav'
import CompanyLogoBar from '@/components/home/CompanyLogoBar'
import BentoFeatureGrid from '@/components/home/BentoFeatureGrid'
import Pricing from '@/components/Pricing'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import VideoTutorialSection from '@/components/home/VideoTutorialSection'

export default function Page() {
  return (
    <div className="flex flex-col">
      <StickyNav />
      <HeroSection />
      <CompanyLogoBar />
      <BentoFeatureGrid />
      <VideoTutorialSection />
      <Pricing />
      <StepsSection />
      <TestimonialsSection />
    </div>
  )
}
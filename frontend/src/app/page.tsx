import HeroSection from '@/components/home/HeroSection'
import CompanyLogoBar from '@/components/home/CompanyLogoBar'
import Pricing from '@/components/Pricing'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import VideoTutorialSection from '@/components/home/VideoTutorialSection'

export default function Page() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <CompanyLogoBar />
      <VideoTutorialSection />
      <Pricing />
      <StepsSection />
      <TestimonialsSection />
    </div>
  )
}
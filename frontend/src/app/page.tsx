import dynamic from 'next/dynamic'
import CompanyLogoBar from '@/components/home/CompanyLogoBar'
import Pricing from '@/components/Pricing'

const HeroSection = dynamic(() => import('@/components/home/HeroSection'), {
  ssr: false,
})

const VideoTutorialSection = dynamic(() => import('@/components/home/VideoTutorialSection'), {
  ssr: false,
})

const StepsSection = dynamic(() => import('@/components/home/StepsSection'), {
  ssr: false,
})

const TestimonialsSection = dynamic(() => import('@/components/home/TestimonialsSection'), {
  ssr: false,
})

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
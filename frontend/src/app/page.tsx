import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import CompanyLogoBar from '@/components/home/CompanyLogoBar'
import Pricing from '@/components/Pricing'

const VideoTutorialSection = dynamic(() => import('@/components/home/VideoTutorialSection'), {
  loading: () => <div className="h-64" />,
})

const StepsSection = dynamic(() => import('@/components/home/StepsSection'), {
  loading: () => <div className="h-96 bg-[#f4f7ff]" />,
})

const TestimonialsSection = dynamic(() => import('@/components/home/TestimonialsSection'), {
  loading: () => <div className="h-64" />,
})

export default function Page() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <CompanyLogoBar />
      <Suspense fallback={<div className="h-64" />}>
        <VideoTutorialSection />
      </Suspense>
      <Pricing />
      <Suspense fallback={<div className="h-96 bg-[#f4f7ff]" />}>
        <StepsSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <TestimonialsSection />
      </Suspense>
    </div>
  )
}
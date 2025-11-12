import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'
import StepsSection from '@/components/home/StepsSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import CollaborationSection from '@/components/home/CollaborationSection'

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <FeatureGrid />
        <StepsSection />
        <TestimonialsSection />
        <CollaborationSection />
      </main>
      <Footer />
    </>
  )
}


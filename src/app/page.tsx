import Hero from '@/components/Hero'
import Problem from '@/components/Problem'
import Steps from '@/components/Steps'
import Features from '@/components/Features'
import Preview from '@/components/Preview'
import Pricing from '@/components/Pricing'
import FooterCTA from '@/components/FooterCTA'

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Steps />
      <Features />
      <Preview />
      <Pricing />
      <FooterCTA />
    </main>
  )
}


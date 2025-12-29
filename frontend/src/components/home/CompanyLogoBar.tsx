'use client'

import Image from 'next/image'

const companies = [
  { name: 'Google', domain: 'google.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Tesla', domain: 'tesla.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Spotify', domain: 'spotify.com' },
]

function getLogoUrl(domain: string): string {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || ''
  const size = 48
  return `https://img.logo.dev/${domain}?token=${token}&size=${size}`
}

export default function CompanyLogoBar() {
  return (
    <section className="py-12 bg-white border-y border-border-subtle overflow-hidden">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        
        <div className="flex gap-16 logo-scroll">
          {[...companies, ...companies].map((company, idx) => (
            <div
              key={`${company.name}-${idx}`}
              className="flex-shrink-0 flex items-center justify-center gap-3 min-w-[180px]"
            >
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src={getLogoUrl(company.domain)}
                  alt={`${company.name} logo`}
                  fill
                  className="object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
                  sizes="48px"
                />
              </div>
              <div className="text-2xl font-bold text-text-muted/40 hover:text-text-primary transition-all duration-300">
                {company.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


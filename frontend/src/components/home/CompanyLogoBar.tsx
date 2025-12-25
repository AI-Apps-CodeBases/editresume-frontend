'use client'

import { useEffect, useState } from 'react'

const companies = [
  { name: 'Google', logo: 'G' },
  { name: 'Microsoft', logo: 'M' },
  { name: 'Apple', logo: 'A' },
  { name: 'Amazon', logo: 'A' },
  { name: 'Meta', logo: 'M' },
  { name: 'Netflix', logo: 'N' },
  { name: 'Tesla', logo: 'T' },
  { name: 'Salesforce', logo: 'S' },
  { name: 'Adobe', logo: 'A' },
  { name: 'Spotify', logo: 'S' },
]

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
              className="flex-shrink-0 flex items-center justify-center min-w-[150px]"
            >
              <div className="text-2xl font-bold text-text-muted/40 grayscale hover:grayscale-0 hover:text-text-primary transition-all duration-300">
                {company.name}
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}


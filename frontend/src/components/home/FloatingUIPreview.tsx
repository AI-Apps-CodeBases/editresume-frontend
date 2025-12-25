'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

export default function FloatingUIPreview() {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateX = (y - centerY) / 20
      const rotateY = (centerX - x) / 20

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`
    }

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)'
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div className="relative">
      <div
        ref={cardRef}
        className="relative transition-transform duration-300 ease-out"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary-400/20 to-purple-400/20 blur-[100px] -z-10" />
        <div className="relative rounded-[32px] border border-border-subtle bg-white shadow-[0_25px_60px_rgba(15,23,42,0.55)] overflow-hidden">
          <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50 to-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-600 mb-2">
                  AI Enhanced
                </p>
                <h3 className="text-xl font-bold text-text-primary leading-tight">Sarah Chen</h3>
                <p className="mt-0.5 text-sm font-semibold text-text-secondary">
                  Senior Product Designer
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
                  <span>sarah.chen@email.com</span>
                  <span>•</span>
                  <span>+1 (555) 123-4567</span>
                  <span>•</span>
                  <span>San Francisco, CA</span>
                </div>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-0.5 text-[10px] font-semibold text-primary-700 whitespace-nowrap">
                Live preview
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-1.5 border-b border-border-subtle pb-0.5">
                Experience
              </h4>
              <div className="mt-2 space-y-2">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-0.5">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-text-primary">
                        Senior Product Designer
                      </p>
                      <p className="text-[10px] text-text-muted">TechCorp Inc. • San Francisco, CA</p>
                    </div>
                    <span className="text-[10px] text-text-muted whitespace-nowrap">
                      2020 - Present
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 ml-3">
                    <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>
                        Led a team of 10+ designers, increasing design efficiency by 40%
                      </span>
                    </li>
                    <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>
                        Designed and shipped 15+ features improving user engagement by 40%
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


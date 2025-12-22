"use client"

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DevelopmentTooltipProps {
  message: string
  children: React.ReactNode
}

export function DevelopmentTooltip({ message, children }: DevelopmentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (containerRef.current && tooltipRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const tooltipHeight = 120
      const tooltipWidth = 288
      const viewportWidth = window.innerWidth
      const scrollY = window.scrollY

      let top = rect.top + scrollY - tooltipHeight - 8
      let left = rect.left + rect.width / 2 - tooltipWidth / 2

      if (rect.top < tooltipHeight + 20) {
        top = rect.bottom + scrollY + 8
      }
      if (left < 8) {
        left = 8
      }
      if (left + tooltipWidth > viewportWidth - 8) {
        left = viewportWidth - tooltipWidth - 8
      }

      setPosition({ top, left })
    }
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      const handleScroll = () => updatePosition()
      const handleResize = () => updatePosition()
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isVisible])

  return (
    <>
      <div
        ref={containerRef}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[999999] w-72 pointer-events-none opacity-100"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-amber-700 text-xl flex-shrink-0 font-bold">⚠️</span>
              <p className="text-sm text-amber-900 leading-relaxed font-semibold">{message}</p>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className="border-4 border-transparent border-t-amber-400"></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}


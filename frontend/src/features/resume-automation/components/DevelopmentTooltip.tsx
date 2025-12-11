"use client"

import { useState } from 'react'

interface DevelopmentTooltipProps {
  message: string
  children: React.ReactNode
}

export function DevelopmentTooltip({ message, children }: DevelopmentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 animate-in fade-in duration-200">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-base flex-shrink-0">⚠️</span>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">{message}</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="border-4 border-transparent border-t-amber-200"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


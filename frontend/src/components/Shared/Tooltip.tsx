'use client'
import React from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  color?: 'blue' | 'green' | 'red' | 'gray' | 'purple' | 'emerald' | 'indigo'
  className?: string
}

const getColorClasses = (color: string) => {
  return {
    bg: 'bg-white border border-gray-300',
    text: 'text-gray-900',
    arrowTop: 'border-t-gray-300',
    arrowBottom: 'border-b-gray-300',
    arrowLeft: 'border-l-gray-300',
    arrowRight: 'border-r-gray-300',
  }
}

export default function Tooltip({ 
  text, 
  children, 
  position = 'top',
  color = 'gray',
  className = '' 
}: TooltipProps) {
  const colorClasses = getColorClasses(color)
  
  let positionClass = ''
  let arrowClass = ''
  
  if (position === 'top') {
    positionClass = 'bottom-full mb-3 left-1/2 -translate-x-1/2'
    arrowClass = `top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${colorClasses.arrowTop}`
  } else if (position === 'bottom') {
    positionClass = 'top-full mt-3 left-1/2 -translate-x-1/2'
    arrowClass = `bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent ${colorClasses.arrowBottom}`
  } else if (position === 'left') {
    positionClass = 'right-full mr-3 top-1/2 -translate-y-1/2'
    arrowClass = `left-full top-1/2 -translate-y-1/2 border-4 border-transparent ${colorClasses.arrowLeft}`
  } else if (position === 'right') {
    positionClass = 'left-full ml-3 top-1/2 -translate-y-1/2'
    arrowClass = `right-full top-1/2 -translate-y-1/2 border-4 border-transparent ${colorClasses.arrowRight}`
  }

  return (
    <div className={`relative group ${className}`} style={{ display: 'inline-block' }}>
      {children}
      <div className={`absolute ${positionClass} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[99999]`}>
        <div className={`${colorClasses.bg} ${colorClasses.text} text-xs px-3 py-2 rounded-lg shadow-xl relative`}>
          {text}
          <div className={`absolute ${arrowClass}`}></div>
        </div>
      </div>
    </div>
  )
}


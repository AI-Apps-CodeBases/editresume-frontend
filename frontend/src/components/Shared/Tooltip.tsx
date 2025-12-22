'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

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
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const colorClasses = getColorClasses(color)
  
  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current) return
    
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const style: React.CSSProperties = {}
    
    if (position === 'top') {
      style.bottom = window.innerHeight - triggerRect.top + 12
      style.left = triggerRect.left + triggerRect.width / 2
      style.transform = 'translateX(-50%)'
    } else if (position === 'bottom') {
      style.top = triggerRect.bottom + 12
      style.left = triggerRect.left + triggerRect.width / 2
      style.transform = 'translateX(-50%)'
    } else if (position === 'left') {
      style.right = window.innerWidth - triggerRect.left + 12
      style.top = triggerRect.top + triggerRect.height / 2
      style.transform = 'translateY(-50%)'
    } else if (position === 'right') {
      style.left = triggerRect.right + 12
      style.top = triggerRect.top + triggerRect.height / 2
      style.transform = 'translateY(-50%)'
    }
    
    setTooltipStyle(style)
  }, [position])
  
  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition()
      const handleScroll = () => updateTooltipPosition()
      const handleResize = () => updateTooltipPosition()
      
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isVisible, position, updateTooltipPosition])
  
  let arrowClass = ''
  if (position === 'top') {
    arrowClass = `top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${colorClasses.arrowTop}`
  } else if (position === 'bottom') {
    arrowClass = `bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent ${colorClasses.arrowBottom}`
  } else if (position === 'left') {
    arrowClass = `left-full top-1/2 -translate-y-1/2 border-4 border-transparent ${colorClasses.arrowLeft}`
  } else if (position === 'right') {
    arrowClass = `right-full top-1/2 -translate-y-1/2 border-4 border-transparent ${colorClasses.arrowRight}`
  }

  const tooltipContent = isVisible && typeof window !== 'undefined' ? createPortal(
    <div
      ref={tooltipRef}
      className={`fixed opacity-0 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[999999] ${isVisible ? 'opacity-100' : ''}`}
      style={tooltipStyle}
    >
      <div className={`${colorClasses.bg} ${colorClasses.text} text-xs px-3 py-2 rounded-lg shadow-xl relative`}>
        {text}
        <div className={`absolute ${arrowClass}`}></div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative ${className}`}
        style={{ display: 'inline-block' }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {tooltipContent}
    </>
  )
}


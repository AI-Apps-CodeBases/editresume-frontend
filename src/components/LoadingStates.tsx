'use client'
import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

export const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const colorClasses = {
    primary: 'border-primary-500',
    white: 'border-white',
    gray: 'border-gray-500'
  }

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  )
}

interface LoadingDotsProps {
  className?: string
}

export const LoadingDots = ({ className = '' }: LoadingDotsProps) => {
  return (
    <div className={`loading-dots ${className}`}>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
}

export const SkeletonCard = ({ lines = 3, className = '' }: SkeletonCardProps) => {
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-title"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-text" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
      ))}
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  showSpinner?: boolean
  className?: string
}

export const LoadingOverlay = ({ 
  message = 'Loading...', 
  showSpinner = true, 
  className = '' 
}: LoadingOverlayProps) => {
  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
        {showSpinner && <LoadingSpinner />}
        <span className="text-sm font-semibold text-gray-700">{message}</span>
      </div>
    </div>
  )
}

interface SkeletonResumeProps {
  className?: string
}

export const SkeletonResume = ({ className = '' }: SkeletonResumeProps) => {
  return (
    <div className={`bg-white rounded-xl p-8 space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="skeleton-title mx-auto w-1/2"></div>
        <div className="skeleton-text mx-auto w-1/3"></div>
        <div className="skeleton-text mx-auto w-1/4"></div>
      </div>
      
      {/* Sections */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton-title w-1/4"></div>
          <div className="space-y-2">
            <div className="skeleton-text"></div>
            <div className="skeleton-text w-5/6"></div>
            <div className="skeleton-text w-4/6"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

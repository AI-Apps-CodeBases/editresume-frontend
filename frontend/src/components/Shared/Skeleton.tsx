'use client'
import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
}

export const Skeleton = ({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

export const SkeletonText = ({ lines = 1, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" className={i === lines - 1 ? 'w-3/4' : 'w-full'} />
    ))}
  </div>
)

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`p-6 bg-white rounded-xl border border-gray-200 ${className}`}>
    <Skeleton variant="rounded" height={24} width="60%" className="mb-4" />
    <SkeletonText lines={3} />
  </div>
)

export const SkeletonJobCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1 space-y-3">
        <Skeleton variant="rounded" height={20} width="70%" />
        <Skeleton variant="rounded" height={16} width="50%" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" height={24} width={80} />
          <Skeleton variant="rounded" height={24} width={100} />
        </div>
      </div>
      <Skeleton variant="circular" width={48} height={48} />
    </div>
    <div className="flex gap-2 mt-4">
      <Skeleton variant="rounded" height={32} width={120} />
      <Skeleton variant="rounded" height={32} width={100} />
    </div>
  </div>
)

export const SkeletonResumeCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1 space-y-2">
        <Skeleton variant="rounded" height={20} width="60%" />
        <Skeleton variant="rounded" height={16} width="40%" />
      </div>
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    <div className="flex gap-2 mt-4">
      <Skeleton variant="rounded" height={24} width={80} />
      <Skeleton variant="rounded" height={24} width={100} />
    </div>
  </div>
)

export const SkeletonTable = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={16} width="80%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton key={colIdx} variant="rounded" height={40} />
        ))}
      </div>
    ))}
  </div>
)

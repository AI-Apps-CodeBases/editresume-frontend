'use client'

interface MatchRateGaugeProps {
  score: number | null
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function MatchRateGauge({ score, label = 'Match Rate', size = 'lg' }: MatchRateGaugeProps) {
  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center">
        <div className={`${size === 'lg' ? 'w-32 h-32' : size === 'md' ? 'w-24 h-24' : 'w-20 h-20'} rounded-full bg-gray-100 flex items-center justify-center`}>
          <span className="text-gray-400 text-sm">N/A</span>
        </div>
        <span className={`mt-2 text-${size === 'lg' ? 'sm' : 'xs'} font-semibold text-gray-500`}>{label}</span>
      </div>
    )
  }

  const sizeClasses = {
    sm: { container: 'w-20 h-20', text: 'text-xl', label: 'text-xs', svg: 40 },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs', svg: 48 },
    lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-sm', svg: 64 },
  }

  const sizeConfig = sizeClasses[size]
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStrokeColor = (score: number) => {
    if (score >= 80) return 'stroke-green-600'
    if (score >= 60) return 'stroke-blue-600'
    if (score >= 40) return 'stroke-yellow-600'
    return 'stroke-red-600'
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeConfig.container} flex items-center justify-center`}>
        <svg viewBox="0 0 36 36" className={`${sizeConfig.container} transform -rotate-90`}>
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            className="stroke-gray-200"
            strokeWidth="4"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            className={getStrokeColor(score)}
            strokeWidth="4"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${sizeConfig.text} font-bold ${getScoreColor(score)}`}>
            {Math.round(score)}%
          </span>
        </div>
      </div>
      <span className={`mt-2 ${sizeConfig.label} font-semibold text-gray-700`}>{label}</span>
    </div>
  )
}


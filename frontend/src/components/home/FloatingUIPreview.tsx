'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getScoreStrokeColor(score: number) {
  if (score >= 80) return 'stroke-green-600'
  if (score >= 60) return 'stroke-yellow-600'
  if (score >= 40) return 'stroke-orange-600'
  return 'stroke-red-600'
}

function getMatchLabel(score: number) {
  if (score >= 80) return 'Excellent Match'
  if (score >= 60) return 'Good Match'
  if (score >= 40) return 'Fair Match'
  return 'Needs Improvement'
}

export default function FloatingUIPreview() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [atsScore, setAtsScore] = useState(62)
  const [matchScore, setMatchScore] = useState(58)

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

  useEffect(() => {
    let currentAts = 62
    let currentMatch = 58
    
    const interval = setInterval(() => {
      if (currentAts < 85) {
        currentAts += 1
        setAtsScore(currentAts)
      }
      if (currentMatch < 78) {
        currentMatch += 1
        setMatchScore(currentMatch)
      }
      
      if (currentAts >= 85 && currentMatch >= 78) {
        setTimeout(() => {
          currentAts = 62
          currentMatch = 58
          setAtsScore(62)
          setMatchScore(58)
        }, 1000)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const circumference = 2 * Math.PI * 52
  const atsDashOffset = circumference - (atsScore / 100) * circumference
  const matchDashOffset = circumference - (matchScore / 100) * circumference

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
          <div className="border-b border-border-subtle bg-gradient-to-r from-blue-50 to-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-1">
                  Match JD
                </p>
                <p className="text-xs text-text-muted">Score based on selected job description</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative inline-flex h-16 w-16 flex-shrink-0 items-center justify-center">
                <svg viewBox="0 0 120 120" className="h-full w-full">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth="6"
                    className={getScoreStrokeColor(atsScore)}
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                      strokeDasharray: circumference,
                      strokeDashoffset: atsDashOffset,
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={atsScore}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`text-xl font-bold ${getScoreColor(atsScore)}`}
                  >
                    {atsScore}%
                  </motion.span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    ATS
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Match Score
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <motion.span
                    key={matchScore}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`text-2xl font-bold ${getScoreColor(matchScore)}`}
                  >
                    {matchScore}%
                  </motion.span>
                  <span className={`text-[10px] font-semibold ${getScoreColor(atsScore)}`}>
                    {getMatchLabel(atsScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wide text-text-primary mb-2">
                MATCH SCORE {atsScore}% ATS {getMatchLabel(atsScore)}
              </div>
              <p className="text-[10px] text-text-muted mb-3">
                Senior DevOps Engineer • Java/Drools/AWS Sonata Software
              </p>
            </div>

            <div className="flex items-center gap-4 text-[9px]">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-green-700">97%</span>
                <span className="text-text-muted">28 of 29 keywords</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-blue-700">75%</span>
                <span className="text-text-muted">28 of 29 terms</span>
              </div>
            </div>

            <div>
              <div className="text-[9px] font-semibold text-text-primary mb-2">
                Keywords to Improve ATS Score
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['java', 'go', 'drools', 'aws', 'terraform', 'devops', 'kubernetes', 'sonata'].map((keyword, index) => (
                  <motion.span
                    key={keyword}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.2 }}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] font-medium border border-blue-200"
                  >
                    {keyword}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

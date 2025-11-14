"use client"

import { useMemo } from 'react'

import type { ATSScore } from '../types'

const getScoreBucket = (value: number) => {
  if (value >= 80) return 'excellent'
  if (value >= 60) return 'good'
  if (value >= 40) return 'fair'
  return 'poor'
}

const bucketToColor: Record<string, string> = {
  excellent: 'text-emerald-600',
  good: 'text-amber-600',
  fair: 'text-yellow-600',
  poor: 'text-rose-600',
}

const bucketToBackground: Record<string, string> = {
  excellent: 'bg-emerald-100',
  good: 'bg-amber-100',
  fair: 'bg-yellow-100',
  poor: 'bg-rose-100',
}

const bucketToLabel: Record<string, string> = {
  excellent: 'Ready to Submit',
  good: 'Strong Match',
  fair: 'Moderate Match',
  poor: 'Needs Work',
}

export function useATSAnalysis(score: ATSScore | null | undefined) {
  return useMemo(() => {
    if (!score) {
      return {
        score: null,
        summary: null,
        metrics: [],
        suggestions: [],
      }
    }

    const overallBucket = getScoreBucket(score.overall_score)

    const metrics = [
      {
        id: 'keyword_match',
        label: 'Keyword Match',
        value: score.keyword_match,
        bucket: getScoreBucket(score.keyword_match),
      },
      {
        id: 'experience_relevance',
        label: 'Experience Relevance',
        value: score.experience_relevance,
        bucket: getScoreBucket(score.experience_relevance),
      },
      {
        id: 'skills_coverage',
        label: 'Skills Coverage',
        value: score.skills_coverage,
        bucket: getScoreBucket(score.skills_coverage),
      },
    ]

    return {
      score,
      summary: {
        bucket: overallBucket,
        label: bucketToLabel[overallBucket],
        color: bucketToColor[overallBucket],
        background: bucketToBackground[overallBucket],
      },
      metrics: metrics.map((metric) => ({
        ...metric,
        color: bucketToColor[metric.bucket],
        background: bucketToBackground[metric.bucket],
      })),
      suggestions: score.suggestions ?? [],
    }
  }, [score])
}





"use client"

import { useMemo } from 'react'

import type { AutoGenerateResponse } from '../types'

export function useOptimizationSuggestions(result: AutoGenerateResponse | null) {
  return useMemo(() => {
    if (!result) {
      return {
        matchedSkills: [],
        missingSkills: [],
        recommendations: [],
        suggestions: [],
      }
    }

    const matchedSkills = result.insights?.match?.matched_skills ?? []
    const missingSkills = result.insights?.match?.missing_skills ?? []
    const recommendations = result.insights?.match?.recommendations ?? []
    const suggestions = result.ats_score?.suggestions ?? []

    return {
      matchedSkills,
      missingSkills,
      recommendations,
      suggestions,
    }
  }, [result])
}










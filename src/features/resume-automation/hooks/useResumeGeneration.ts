"use client"

import { useCallback, useMemo, useState } from 'react'

import { autoGenerateResume } from '../api/resumeAutomation'
import type {
  AutoGenerateRequest,
  AutoGenerateResponse,
  GenerationStatusStep,
} from '../types'

const baseSteps: GenerationStatusStep[] = [
  {
    id: 'fetch-job',
    label: 'Analyzing job description…',
    description: 'Extracting requirements, skills, and priorities',
    state: 'pending',
  },
  {
    id: 'evaluate-resumes',
    label: 'Evaluating existing resumes…',
    description: 'Finding strongest achievements and relevant sections',
    state: 'pending',
  },
  {
    id: 'optimize-content',
    label: 'Optimizing content for ATS…',
    description: 'Aligning bullets, keywords, and structure',
    state: 'pending',
  },
  {
    id: 'calculate-score',
    label: 'Calculating ATS score…',
    description: 'Running Enhanced ATS checks and recommendations',
    state: 'pending',
  },
]

type GenerationState = {
  loading: boolean
  error: string | null
  result: AutoGenerateResponse | null
  steps: GenerationStatusStep[]
}

const transitionStepState = (
  steps: GenerationStatusStep[],
  stepId: string,
  nextState: GenerationStatusStep['state']
): GenerationStatusStep[] =>
  steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          state: nextState,
        }
      : step
  )

const completePreviousSteps = (steps: GenerationStatusStep[], upto: string): GenerationStatusStep[] => {
  const idx = steps.findIndex((step) => step.id === upto)
  if (idx === -1) return steps
  return steps.map((step, index) =>
    index < idx
      ? {
          ...step,
          state: 'complete' as const,
        }
      : step
  )
}

export function useResumeGeneration() {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    result: null,
    steps: baseSteps,
  })

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      result: null,
      steps: baseSteps,
    })
  }, [])

  const generate = useCallback(
    async (payload: AutoGenerateRequest) => {
      setState({
        loading: true,
        error: null,
        result: null,
        steps: transitionStepState(baseSteps, 'fetch-job', 'active'),
      })

      try {
        const result = await autoGenerateResume(payload)

        setState({
          loading: false,
          error: null,
          result,
          steps: baseSteps.map((step) => ({
            ...step,
            state: 'complete',
          })),
        })

        return result
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to generate resume'
        setState((prev) => ({
          loading: false,
          error: message,
          result: null,
          steps: prev.steps,
        }))
        throw error
      }
    },
    []
  )

  const advanceStep = useCallback((nextStepId: string) => {
    setState((prev) => {
      const completed = completePreviousSteps(prev.steps, nextStepId)
      return {
        ...prev,
        steps: transitionStepState(completed, nextStepId, 'active'),
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      result: state.result,
      steps: state.steps,
      generate,
      reset,
      advanceStep,
    }),
    [state, generate, reset, advanceStep]
  )

  return value
}


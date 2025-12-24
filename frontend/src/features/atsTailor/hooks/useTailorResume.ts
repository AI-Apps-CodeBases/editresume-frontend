import { useCallback, useState } from 'react'
import type { ResumeData, TailorOptions, TailorResumeResponse } from '../types/tailorResume'
import { tailorResume } from '../api/tailorResume'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: TailorResumeResponse }
  | { status: 'error'; error: string }

export function useTailorResume() {
  const [state, setState] = useState<State>({ status: 'idle' })

  const run = useCallback(
    async (input: { resumeData: ResumeData; jobDescription: string; options?: TailorOptions }) => {
      setState({ status: 'loading' })
      try {
        const data = await tailorResume({
          resume_data: input.resumeData,
          job_description: input.jobDescription,
          options: input.options,
        })
        setState({ status: 'success', data })
        return data
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to tailor resume'
        setState({ status: 'error', error: message })
        throw e
      }
    },
    []
  )

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, run, reset }
}



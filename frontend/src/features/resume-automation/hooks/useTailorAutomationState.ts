"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSavedJobs } from '@/features/jobs/hooks/useSavedJobs'
import {
  extractJobKeywords,
  fetchUserResumes,
  parseResumeFile,
  parseResumeText,
  saveParsedResume,
} from '../api/resumeAutomation'
import type { ExtractedJobKeywords } from '../types'

export interface ResumeOption {
  id: number
  name: string
  title?: string | null
  summary?: string | null
  updated_at?: string | null
}

export type Stage = 'idle' | 'progress' | 'completed'

type RouterLike = {
  push: (href: string) => void
}

interface UseTailorAutomationStateArgs {
  openSignal?: number
  router: RouterLike
}

export function useTailorAutomationState({ openSignal, router }: UseTailorAutomationStateArgs) {
  const [stage, setStage] = useState<Stage>('idle')
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('')
  const [selectedJobDescription, setSelectedJobDescription] = useState<string>('')
  const [resumeOptions, setResumeOptions] = useState<ResumeOption[]>([])
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    refresh: refreshJobs,
    addJob,
  } = useSavedJobs()

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const previousSignalRef = useRef<number | undefined>(undefined)

  const getUserEmail = useCallback(() => {
    if (typeof window === 'undefined') return null
    const userRaw = localStorage.getItem('user')
    if (!userRaw) return null
    try {
      const parsed = JSON.parse(userRaw)
      return typeof parsed?.email === 'string' ? parsed.email : null
    } catch {
      return null
    }
  }, [])

  const openJobModal = useCallback(() => {
    setSelectedJob(null)
    setSelectedJobTitle('')
    setStage('idle')
    setJobModalOpen(true)
  }, [])

  useEffect(() => {
    if (typeof openSignal === 'number' && openSignal !== previousSignalRef.current) {
      previousSignalRef.current = openSignal
      openJobModal()
    }
  }, [openSignal, openJobModal])

  useEffect(() => {
    if (jobModalOpen) {
      void refreshJobs()
    }
  }, [jobModalOpen, refreshJobs])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const loadResumes = useCallback(async () => {
    setResumeLoading(true)
    setResumeError(null)
    try {
      const list = await fetchUserResumes()
      setResumeOptions(list)
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : 'Failed to load resumes')
    } finally {
      setResumeLoading(false)
    }
  }, [])

  const handleCreateJob = useCallback(
    async (payload: { title: string; company?: string; description: string; skills: string[] }) => {
      const created = await addJob(payload)
      await refreshJobs()
      return created
    },
    [addJob, refreshJobs]
  )

  const handleExtractKeywords = useCallback(
    async (description: string): Promise<ExtractedJobKeywords> => extractJobKeywords(description),
    []
  )

  const handleJobSelected = useCallback(
    (job: { id: number; title: string; description?: string }) => {
      setSelectedJob(job.id)
      setSelectedJobTitle(job.title)
      setSelectedJobDescription(job.description || '')
      setJobModalOpen(false)
      setResumeModalOpen(true)
      void loadResumes()
    },
    [loadResumes]
  )

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }, [])

  const handleResumeConfirm = useCallback(
    async (resumeIds: number[]) => {
      if (!selectedJob) {
        setStage('idle')
        return
      }
      const safeIds = resumeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      if (safeIds.length === 0) {
        setStage('idle')
        return
      }
      setResumeModalOpen(false)
      setStage('idle')
    },
    [selectedJob]
  )

  const handleOpenEditor = useCallback(() => {
    // Generate resume feature removed
  }, [])

  const handleParseResumeText = useCallback(
    async (text: string) => {
      setResumeLoading(true)
      setResumeError(null)
      try {
        const parsed = await parseResumeText(text)
        const email = getUserEmail()
        if (!email) throw new Error('Sign in to save a parsed resume.')
        const saved = await saveParsedResume(parsed, email)
        await loadResumes()
        return saved.resume_id
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse resume text'
        setResumeError(message)
        throw error instanceof Error ? error : new Error(message)
      } finally {
        setResumeLoading(false)
      }
    },
    [getUserEmail, loadResumes]
  )

  const handleParseResumeFile = useCallback(
    async (file: File) => {
      setResumeLoading(true)
      setResumeError(null)
      try {
        const parsed = await parseResumeFile(file)
        const email = getUserEmail()
        if (!email) throw new Error('Sign in to save a parsed resume.')
        const saved = await saveParsedResume(parsed, email)
        await loadResumes()
        return saved.resume_id
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse resume file'
        setResumeError(message)
        throw error instanceof Error ? error : new Error(message)
      } finally {
        setResumeLoading(false)
      }
    },
    [getUserEmail, loadResumes]
  )

  const handleRequestResumeUpload = useCallback(() => {
    setResumeModalOpen(false)
    router.push('/editor?upload=true&source=resume-automation')
  }, [router])

  const handleRequestJobParse = useCallback(() => {
    setJobModalOpen(false)
    router.push('/editor?view=jobs&source=resume-automation')
  }, [router])

  const value = useMemo(
    () => ({
      stage,
      jobModalOpen,
      resumeModalOpen,
      selectedJob,
      selectedJobTitle,
      selectedJobDescription,
      resumeOptions,
      resumeLoading,
      resumeError,
      jobs,
      jobsLoading,
      jobsError,
      openJobModal,
      setJobModalOpen,
      setResumeModalOpen,
      loadResumes,
      refreshJobs,
      handleCreateJob,
      handleExtractKeywords,
      handleJobSelected,
      handleResumeConfirm,
      handleOpenEditor,
      handleParseResumeText,
      handleParseResumeFile,
      handleRequestResumeUpload,
      handleRequestJobParse,
    }),
    [
      stage,
      jobModalOpen,
      resumeModalOpen,
      selectedJob,
      selectedJobTitle,
      selectedJobDescription,
      resumeOptions,
      resumeLoading,
      resumeError,
      jobs,
      jobsLoading,
      jobsError,
      openJobModal,
      setJobModalOpen,
      setResumeModalOpen,
      loadResumes,
      refreshJobs,
      handleCreateJob,
      handleExtractKeywords,
      handleJobSelected,
      handleResumeConfirm,
      handleOpenEditor,
      handleParseResumeText,
      handleParseResumeFile,
      handleRequestResumeUpload,
      handleRequestJobParse,
    ]
  )

  return value
}


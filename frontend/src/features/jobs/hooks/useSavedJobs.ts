"use client"

import { useCallback, useEffect, useState } from 'react'

import { createJob, deleteJob, fetchLegacyJobDescriptions, fetchSavedJobs } from '../api/jobs'
import type { CreateJobPayload, Job } from '../types'

export function useSavedJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [primary, legacy] = await Promise.all([
        fetchSavedJobs(),
        fetchLegacyJobDescriptions().catch(() => [])
      ])

      const mergedById = new Map<number, Job>()
      primary.forEach((job) => mergedById.set(job.id, job))
      legacy.forEach((job) => {
        if (!mergedById.has(job.id)) mergedById.set(job.id, job)
      })

      const combined = Array.from(mergedById.values())
      setJobs(combined)

      if (combined.length === 0) {
        setError('No saved jobs found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  // Listen for job saved events to refresh the list automatically
  useEffect(() => {
    const handleJobSaved = () => {
      void loadJobs()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('jobSaved', handleJobSaved)
      return () => {
        window.removeEventListener('jobSaved', handleJobSaved)
      }
    }
  }, [loadJobs])
  const addJob = useCallback(async (payload: CreateJobPayload) => {
    setLoading(true)
    setError(null)
    try {
      const created = await createJob(payload)
      setJobs((prev) => [created, ...prev])
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const removeJob = useCallback(async (jobId: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteJob(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    jobs,
    loading,
    error,
    refresh: loadJobs,
    addJob,
    removeJob,
  }
}


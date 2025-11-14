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
      const latest = await fetchSavedJobs()
      if (latest.length > 0) {
        setJobs(latest)
        return
      }

      const legacy = await fetchLegacyJobDescriptions()
      setJobs(legacy)
      if (legacy.length === 0) {
        setError(null)
      }
    } catch (err) {
      try {
        const legacy = await fetchLegacyJobDescriptions()
        setJobs(legacy)
        if (legacy.length === 0) {
          setError(err instanceof Error ? err.message : 'No saved jobs found')
        }
      } catch (legacyError) {
        setError(
          legacyError instanceof Error
            ? legacyError.message
            : err instanceof Error
            ? err.message
            : 'Failed to load jobs'
        )
      }
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


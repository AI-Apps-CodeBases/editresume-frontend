export interface AutoGenerateRequest {
  jobId: number
  sourceResumeIds: number[]
}

export interface GeneratedResume {
  id: number
  name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  summary?: string | null
  template?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface GeneratedVersion {
  id: number
  resume_id: number
  version_number: number
  resume_data: Record<string, unknown>
  created_at?: string | null
  change_summary?: string | null
}

export interface ATSScore {
  overall_score: number
  keyword_match: number
  experience_relevance: number
  skills_coverage: number
  suggestions: string[]
}

export interface GenerationInsights {
  match: {
    resume_id: number
    job_id: number
    score: number
    matched_skills: string[]
    missing_skills: string[]
    recommendations: string[]
  }
  job: {
    id: number
    title: string
    company?: string | null
    skills: string[]
  }
}

export interface AutoGenerateResponse {
  resume: GeneratedResume
  version: GeneratedVersion
  ats_score: ATSScore
  insights: GenerationInsights
}

export interface GenerationStatusStep {
  id: string
  label: string
  description: string
  state: 'pending' | 'active' | 'complete'
}









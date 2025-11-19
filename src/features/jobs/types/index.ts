export interface Job {
  id: number
  user_id: number
  title: string
  company?: string | null
  description: string
  url?: string | null
  skills: string[]
  created_at: string
}

export interface CreateJobPayload {
  title: string
  company?: string
  description: string
  url?: string
  skills?: string[]
}








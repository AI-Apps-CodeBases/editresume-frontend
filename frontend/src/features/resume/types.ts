export interface Bullet {
  id: string
  text: string
  params?: Record<string, any>
}

export interface Section {
  id: string
  title: string
  bullets: Bullet[]
  params?: Record<string, any>
}

export interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Section[]
  fieldsVisible?: Record<string, boolean>
  linkedin?: string
  website?: string
  github?: string
  portfolio?: string
  twitter?: string
}

export interface ContactFieldDefinition {
  label: string
  icon: string
  field: string
}

export interface CustomField {
  id: string
  label: string
  field: string
}



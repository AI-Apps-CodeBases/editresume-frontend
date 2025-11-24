import { ContactFieldDefinition } from './types'

export const CONTACT_FIELDS: Record<string, ContactFieldDefinition> = {
  email: { label: '📧 email', icon: '📧', field: 'email' },
  phone: { label: '📱 phone', icon: '📱', field: 'phone' },
  location: { label: '📍 location', icon: '📍', field: 'location' },
  linkedin: { label: '💼 LinkedIn', icon: '💼', field: 'linkedin' },
  website: { label: '🌐 website', icon: '🌐', field: 'website' },
  github: { label: '🐙 GitHub', icon: '🐙', field: 'github' },
  portfolio: { label: '🧩 portfolio', icon: '🧩', field: 'portfolio' },
  twitter: { label: '🐦 twitter', icon: '🐦', field: 'twitter' }
}



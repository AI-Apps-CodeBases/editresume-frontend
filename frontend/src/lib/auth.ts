import { auth } from './firebaseClient'

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getAuthHeadersAsync = async (forceRefresh = false): Promise<Record<string, string>> => {
  if (typeof window === 'undefined') return {}
  
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      const token = await currentUser.getIdToken(forceRefresh)
      if (token) {
        localStorage.setItem('authToken', token)
        return { Authorization: `Bearer ${token}` }
      }
    }
  } catch (error) {
    console.error('Failed to get auth token:', error)
  }
  
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}


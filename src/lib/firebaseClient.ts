import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

let app: FirebaseApp | null = null
let authInstance: Auth | null = null

const isBrowser = typeof window !== 'undefined'

function getAppInstance(): FirebaseApp {
  if (app) {
    return app
  }

  if (!isBrowser) {
    throw new Error('Firebase can only be initialized in the browser')
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase configuration is missing. Check environment variables.')
    throw new Error('Firebase configuration is incomplete')
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return app
}

function getAuthInstance(): Auth {
  if (authInstance) {
    return authInstance
  }

  const appInstance = getAppInstance()
  authInstance = getAuth(appInstance)
  return authInstance
}

const authObj = {} as Auth
Object.defineProperty(authObj, 'currentUser', {
  get() {
    if (!isBrowser) return null
    try {
      return getAuthInstance().currentUser
    } catch {
      return null
    }
  }
})

const appObj = {} as FirebaseApp

export const auth = new Proxy(authObj, {
  get(target, prop) {
    if (!isBrowser) {
      if (prop === 'currentUser') return null
      if (prop === 'onAuthStateChanged') return () => () => {}
      return undefined
    }
    try {
      const instance = getAuthInstance()
      const value = instance[prop as keyof Auth]
      if (typeof value === 'function') {
        return value.bind(instance)
      }
      return value
    } catch (error) {
      console.error('Firebase Auth access error:', error)
      return undefined
    }
  }
}) as Auth

export default new Proxy(appObj, {
  get(target, prop) {
    if (!isBrowser) {
      return undefined
    }
    try {
      const instance = getAppInstance()
      return instance[prop as keyof FirebaseApp]
    } catch (error) {
      console.error('Firebase App access error:', error)
      return undefined
    }
  }
}) as FirebaseApp



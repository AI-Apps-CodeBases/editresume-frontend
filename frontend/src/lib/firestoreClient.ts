import { getFirestore, Firestore } from 'firebase/firestore'
import app from './firebaseClient'

let firestoreInstance: Firestore | null = null

export function getFirestoreInstance(): Firestore {
    if (firestoreInstance) {
        return firestoreInstance
    }

    if (typeof window === 'undefined') {
        throw new Error('Firestore can only be initialized in the browser')
    }

    firestoreInstance = getFirestore(app)
    return firestoreInstance
}

export const db = new Proxy({} as Firestore, {
    get(target, prop) {
        if (typeof window === 'undefined') {
            return undefined
        }
        try {
            const instance = getFirestoreInstance()
            const value = instance[prop as keyof Firestore]
            if (typeof value === 'function') {
                return value.bind(instance)
            }
            return value
        } catch (error) {
            console.error('Firestore access error:', error)
            return undefined
        }
    }
}) as Firestore

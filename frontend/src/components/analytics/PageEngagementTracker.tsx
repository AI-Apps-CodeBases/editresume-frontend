"use client"

import { useEffect, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebaseClient'
import { getApiBaseUrl } from '@/lib/config'

export default function PageEngagementTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const startTimeRef = useRef<number | null>(null)
    const pathRef = useRef<string | null>(null)
    const maxScrollRef = useRef(0)
    const exitSentRef = useRef(false)

    const getPath = () => {
        const query = searchParams?.toString()
        return `${pathname}${query ? `?${query}` : ''}`
    }

    const postEvent = useCallback(async (payload: {
        eventType: string
        path: string
        durationMs?: number
        scrollDepth?: number
        referrer?: string | null
    }) => {
        const currentUser = auth.currentUser
        if (!currentUser) return

        try {
            const token = await currentUser.getIdToken()
            const baseUrl = getApiBaseUrl()
            await fetch(`${baseUrl}/api/analytics/page-engagement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })
        } catch (error) {
            console.warn('Failed to record page engagement', error)
        }
    }, [])

    const sendExit = useCallback(async () => {
        if (exitSentRef.current || !pathRef.current || startTimeRef.current === null) return
        exitSentRef.current = true
        const durationMs = Date.now() - startTimeRef.current
        await postEvent({
            eventType: 'page_exit',
            path: pathRef.current,
            durationMs,
            scrollDepth: maxScrollRef.current,
            referrer: document.referrer || null,
        })
    }, [postEvent])

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement
            const scrollTop = window.scrollY || doc.scrollTop || 0
            const scrollHeight = doc.scrollHeight - doc.clientHeight
            const percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
            if (percent > maxScrollRef.current) {
                maxScrollRef.current = percent
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    useEffect(() => {
        if (!pathname) return

        void sendExit()

        const currentPath = getPath()
        startTimeRef.current = Date.now()
        pathRef.current = currentPath
        maxScrollRef.current = 0
        exitSentRef.current = false

        void postEvent({
            eventType: 'page_view',
            path: currentPath,
            durationMs: 0,
            scrollDepth: 0,
            referrer: document.referrer || null,
        })
    }, [pathname, searchParams, postEvent, sendExit])

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                void sendExit()
            }
        }
        const onBeforeUnload = () => {
            void sendExit()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('beforeunload', onBeforeUnload)

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [sendExit])

    return null
}

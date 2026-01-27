"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getApiBaseUrl } from '@/lib/config'

type EngagementPath = {
    path: string | null
    views: number
    totalDurationMs: number
    avgDurationMs: number
    maxScrollDepth: number
}

const formatDuration = (ms: number) => {
    if (!ms || ms < 0) return '0s'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes === 0) return `${seconds}s`
    return `${minutes}m ${seconds}s`
}

export default function EngagementDashboardPage() {
    const [email, setEmail] = useState('')
    const [days, setDays] = useState('30')
    const [paths, setPaths] = useState<EngagementPath[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchEngagement = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = typeof window !== 'undefined'
                ? localStorage.getItem('authToken')
                : null

            if (!token) {
                setError('Missing admin auth token. Please sign in to the dashboard.')
                setLoading(false)
                return
            }

            const baseUrl = getApiBaseUrl()
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }

            const params = new URLSearchParams()
            params.set('email', email)
            if (days) params.set('days', days)

            const response = await fetch(`${baseUrl}/api/dashboard/page-engagement?${params.toString()}`, { headers })
            if (!response.ok) {
                throw new Error(`Failed to fetch engagement (${response.status})`)
            }

            const data = await response.json()
            setPaths(Array.isArray(data?.paths) ? data.paths : [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch engagement')
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">User Engagement</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="User email"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            placeholder="Days"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={fetchEngagement}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            disabled={loading || !email}
                        >
                            {loading ? 'Loading…' : 'Load Engagement'}
                        </button>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600">{error}</div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Pages by Time Spent</h2>
                        <span className="text-sm text-gray-500">{paths.length} pages</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="px-6 py-3">Path</th>
                                    <th className="px-6 py-3">Views</th>
                                    <th className="px-6 py-3">Total Time</th>
                                    <th className="px-6 py-3">Avg Time</th>
                                    <th className="px-6 py-3">Max Scroll</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paths.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No engagement data.
                                        </td>
                                    </tr>
                                ) : (
                                    paths.map((item) => (
                                        <tr key={item.path || 'unknown'} className="text-gray-800">
                                            <td className="px-6 py-3">{item.path || '—'}</td>
                                            <td className="px-6 py-3">{item.views}</td>
                                            <td className="px-6 py-3">{formatDuration(item.totalDurationMs)}</td>
                                            <td className="px-6 py-3">{formatDuration(item.avgDurationMs)}</td>
                                            <td className="px-6 py-3">{item.maxScrollDepth}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

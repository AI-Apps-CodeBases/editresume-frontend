'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { config } from '@/lib/config'
import type { BillingEvent } from '@/types/dashboard'

interface UserDetails {
    id: string
    name: string
    email: string
    plan: string
    joinDate: string
    status: string
    totalResumes: number
    totalTokens: number
    totalVersions: number
    lastLogin: string | null
    lastLoginFormatted: string
    firstActivityDate: string | null
    firstActivityDateFormatted: string
}

interface UserDetailsModalProps {
    userId: string | null
    isOpen: boolean
    onClose: () => void
}

export function UserDetailsModal({ userId, isOpen, onClose }: UserDetailsModalProps) {
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
    const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [billingLoading, setBillingLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [billingError, setBillingError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserDetails(userId)
            fetchBillingEvents(userId)
        } else {
            setUserDetails(null)
            setBillingEvents([])
            setError(null)
            setBillingError(null)
        }
    }, [isOpen, userId])

    const fetchUserDetails = async (id: string) => {
        setLoading(true)
        setError(null)
        
        try {
            const token = typeof window !== 'undefined'
                ? localStorage.getItem('authToken')
                : null

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(`${config.apiBase}/api/dashboard/users/${id}`, { headers })

            if (!response.ok) {
                throw new Error('Failed to fetch user details')
            }

            const data = await response.json()
            setUserDetails(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const fetchBillingEvents = async (id: string) => {
        setBillingLoading(true)
        setBillingError(null)

        try {
            const token = typeof window !== 'undefined'
                ? localStorage.getItem('authToken')
                : null

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(
                `${config.apiBase}/api/dashboard/users/${id}/billing-events?days=90`,
                { headers }
            )

            if (!response.ok) {
                throw new Error('Failed to fetch billing events')
            }

            const data = await response.json()
            setBillingEvents(Array.isArray(data?.events) ? data.events : [])
        } catch (err) {
            setBillingError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setBillingLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Loading...</div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-red-500">Error: {error}</div>
                        </div>
                    ) : userDetails ? (
                        <div className="space-y-6">
                            {/* User Info Section */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">İsim</label>
                                    <div className="text-base text-gray-900 font-medium">{userDetails.name}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">Email</label>
                                    <div className="text-base text-gray-900">{userDetails.email}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">Plan</label>
                                    <div className="text-base">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                            userDetails.plan === 'Premium'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {userDetails.plan}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">Status</label>
                                    <div className="text-base">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                            userDetails.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {userDetails.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500 mb-1 block">Join Date</label>
                                <div className="text-base text-gray-900">{userDetails.joinDate}</div>
                            </div>

                            {/* Activity Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">Toplam Resume Sayısı</label>
                                        <div className="text-2xl font-bold text-gray-900">{userDetails.totalResumes}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">Toplam Token Kullanımı</label>
                                        <div className="text-2xl font-bold text-blue-600">{userDetails.totalTokens.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500 mt-1">{userDetails.totalVersions} resume versions</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dates Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">Last Login</label>
                                        <div className="text-base text-gray-900">{userDetails.lastLoginFormatted}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">First Activity Date</label>
                                        <div className="text-base text-gray-900">{userDetails.firstActivityDateFormatted}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Billing Events Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Events (last 90 days)</h3>
                                {billingLoading ? (
                                    <div className="text-gray-500">Loading billing events…</div>
                                ) : billingError ? (
                                    <div className="text-red-500">Error: {billingError}</div>
                                ) : billingEvents.length === 0 ? (
                                    <div className="text-gray-500">No billing events recorded.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b">
                                                    <th className="py-2 pr-4">Date</th>
                                                    <th className="py-2 pr-4">Event</th>
                                                    <th className="py-2 pr-4">Plan</th>
                                                    <th className="py-2 pr-4">Period</th>
                                                    <th className="py-2 pr-4">Failure</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {billingEvents.map((event) => (
                                                    <tr key={event.id} className="text-gray-800">
                                                        <td className="py-2 pr-4">
                                                            {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
                                                        </td>
                                                        <td className="py-2 pr-4">{event.eventType}</td>
                                                        <td className="py-2 pr-4">{event.planType || '—'}</td>
                                                        <td className="py-2 pr-4">{event.period || '—'}</td>
                                                        <td className="py-2 pr-4">
                                                            {event.failureMessage || event.failureCode || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

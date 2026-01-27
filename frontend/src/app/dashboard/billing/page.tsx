"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getApiBaseUrl } from '@/lib/config'

type BillingEvent = {
    id: number
    createdAt: string | null
    eventType: string
    planType: string | null
    period: string | null
    stripeCheckoutSessionId: string | null
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    stripePaymentIntentId: string | null
    failureCode: string | null
    failureMessage: string | null
    referrer: string | null
    rawData: string | null
}

export default function BillingDashboardPage() {
    const [uid, setUid] = useState('')
    const [userId, setUserId] = useState('0')
    const [days, setDays] = useState('90')
    const [limit, setLimit] = useState('200')
    const [eventFilter, setEventFilter] = useState('')
    const [events, setEvents] = useState<BillingEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchEvents = async () => {
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
            if (days) params.set('days', days)
            if (limit) params.set('limit', limit)
            if (uid) params.set('uid', uid)

            const response = await fetch(
                `${baseUrl}/api/dashboard/users/${userId || '0'}/billing-events?${params.toString()}`,
                { headers }
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch billing events (${response.status})`)
            }

            const data = await response.json()
            const list = Array.isArray(data?.events) ? data.events : []
            setEvents(list)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch billing events')
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = eventFilter
        ? events.filter(event => event.eventType === eventFilter)
        : events

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Billing Logs</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <input
                            type="text"
                            value={uid}
                            onChange={(e) => setUid(e.target.value)}
                            placeholder="Firebase UID (optional)"
                            className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="User ID"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            placeholder="Days"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            placeholder="Limit"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All events</option>
                            <option value="checkout_session_created">checkout_session_created</option>
                            <option value="checkout_session_completed">checkout_session_completed</option>
                            <option value="checkout_session_expired">checkout_session_expired</option>
                            <option value="checkout_return_success">checkout_return_success</option>
                            <option value="checkout_return_cancel">checkout_return_cancel</option>
                            <option value="payment_intent_payment_failed">payment_intent_payment_failed</option>
                            <option value="invoice_payment_failed">invoice_payment_failed</option>
                            <option value="invoice_paid">invoice_paid</option>
                            <option value="customer.subscription.updated">customer.subscription.updated</option>
                            <option value="customer.subscription.deleted">customer.subscription.deleted</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchEvents}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Loading…' : 'Load Events'}
                        </button>
                        <button
                            onClick={() => {
                                setUid('')
                                setUserId('0')
                                setDays('90')
                                setLimit('200')
                                setEventFilter('')
                                setEvents([])
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Clear
                        </button>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600">{error}</div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Events</h2>
                        <span className="text-sm text-gray-500">{filteredEvents.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Event</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Period</th>
                                    <th className="px-6 py-3">Stripe IDs</th>
                                    <th className="px-6 py-3">Failure</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No billing events.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.map((event) => (
                                        <tr key={event.id} className="text-gray-800">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-6 py-3">{event.eventType}</td>
                                            <td className="px-6 py-3">{event.planType || '—'}</td>
                                            <td className="px-6 py-3">{event.period || '—'}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500">
                                                {event.stripeCheckoutSessionId && <div>cs: {event.stripeCheckoutSessionId}</div>}
                                                {event.stripeCustomerId && <div>cus: {event.stripeCustomerId}</div>}
                                                {event.stripeSubscriptionId && <div>sub: {event.stripeSubscriptionId}</div>}
                                                {event.stripePaymentIntentId && <div>pi: {event.stripePaymentIntentId}</div>}
                                                {!event.stripeCheckoutSessionId && !event.stripeCustomerId && !event.stripeSubscriptionId && !event.stripePaymentIntentId && '—'}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-red-600">
                                                {event.failureMessage || event.failureCode || '—'}
                                            </td>
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

'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MessageSquare, Star, Filter } from 'lucide-react'
import config from '@/lib/config'

interface Feedback {
    id: number
    userEmail: string
    rating: number | null
    feedback: string
    category: string
    pageUrl: string | null
    createdAt: string
    createdAtRaw: string | null
}

interface FeedbackListResponse {
    feedbacks: Feedback[]
    totalFeedbacks: number
    currentPage: number
    totalPages: number
}

const categoryColors: Record<string, string> = {
    general: 'bg-gray-100 text-gray-700',
    bug: 'bg-red-100 text-red-700',
    feature: 'bg-blue-100 text-blue-700',
    ui: 'bg-purple-100 text-purple-700',
    performance: 'bg-green-100 text-green-700',
}

const categoryLabels: Record<string, string> = {
    general: 'General',
    bug: 'Bug Report',
    feature: 'Feature Request',
    ui: 'UI/UX',
    performance: 'Performance',
}

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [totalFeedbacks, setTotalFeedbacks] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [entriesPerPage, setEntriesPerPage] = useState(20)

    useEffect(() => {
        fetchFeedbacks()
    }, [currentPage, selectedCategory, entriesPerPage])

    const fetchFeedbacks = async () => {
        setLoading(true)
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

            const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
            const response = await fetch(
                `${config.apiBase}/api/dashboard/feedback?page=${currentPage}&limit=${entriesPerPage}${categoryParam}`,
                { headers }
            )

            if (response.ok) {
                const data: FeedbackListResponse = await response.json()
                setFeedbacks(data.feedbacks)
                setTotalFeedbacks(data.totalFeedbacks)
                setCurrentPage(data.currentPage)
                setTotalPages(data.totalPages)
            } else {
                console.error('Failed to fetch feedbacks')
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error)
        } finally {
            setLoading(false)
        }
    }

    const renderStars = (rating: number | null) => {
        if (!rating) return null
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((num) => (
                    <Star
                        key={num}
                        className={`w-4 h-4 ${
                            num <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                    />
                ))}
            </div>
        )
    }

    const getCategoryTag = (category: string) => {
        const colorClass = categoryColors[category] || categoryColors.general
        const label = categoryLabels[category] || category
        return (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                {label}
            </span>
        )
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">Loading...</div>
            </DashboardLayout>
        )
    }

    const startIndex = (currentPage - 1) * entriesPerPage
    const endIndex = Math.min(startIndex + entriesPerPage, totalFeedbacks)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalFeedbacks} total feedback{totalFeedbacks !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">Filter by Category:</span>
                                <select
                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                >
                                    <option value="all">All Categories</option>
                                    <option value="general">General</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="ui">UI/UX</option>
                                    <option value="performance">Performance</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show</span>
                            <select
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={entriesPerPage}
                                onChange={(e) => {
                                    setEntriesPerPage(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Feedback List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    {feedbacks.length === 0 ? (
                        <div className="p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No feedback found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {feedbacks.map((feedback) => (
                                <div key={feedback.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="font-medium text-gray-900">
                                                    {feedback.userEmail}
                                                </div>
                                                {getCategoryTag(feedback.category)}
                                                {feedback.rating && (
                                                    <div className="flex items-center gap-1">
                                                        {renderStars(feedback.rating)}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                                                {feedback.feedback}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>{feedback.createdAt}</span>
                                                {feedback.pageUrl && (
                                                    <span className="text-blue-600">
                                                        {feedback.pageUrl}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {startIndex + 1} to {endIndex} of {totalFeedbacks} entries
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    «
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            page === currentPage
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}


'use client'

import { MessageSquare, Star, ExternalLink } from 'lucide-react'
import { Feedback } from '@/types/dashboard'

interface FeedbackTableProps {
    feedbacks: Feedback[]
}

export function FeedbackTable({ feedbacks }: FeedbackTableProps) {
    // Debug log
    console.log('FeedbackTable received feedbacks:', feedbacks)
    
    // Safety check: ensure feedbacks is an array
    const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : []
    
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">User Feedback</h2>
                <span className="ml-auto text-sm text-gray-500">
                    {safeFeedbacks.length} {safeFeedbacks.length === 1 ? 'feedback' : 'feedbacks'}
                </span>
            </div>
            
            {safeFeedbacks.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">No feedback received yet.</p>
                    <p className="text-xs text-gray-400">Check browser console for debug info</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rating</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Feedback</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Page</th>
                            </tr>
                        </thead>
                        <tbody>
                            {safeFeedbacks.map((feedback) => (
                                <tr key={feedback.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {formatDate(feedback.created_at)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-900">
                                        {feedback.user_email || 'Anonymous'}
                                    </td>
                                    <td className="py-3 px-4">
                                        {feedback.rating ? (
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-sm text-gray-700">{feedback.rating}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {feedback.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 max-w-md">
                                        <p className="line-clamp-2">{feedback.feedback}</p>
                                    </td>
                                    <td className="py-3 px-4">
                                        {feedback.page_url ? (
                                            <a
                                                href={feedback.page_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                            >
                                                View
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}


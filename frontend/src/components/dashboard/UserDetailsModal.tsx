'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { config } from '@/lib/config'

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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserDetails(userId)
        } else {
            setUserDetails(null)
            setError(null)
        }
    }, [isOpen, userId])

    const fetchUserDetails = async (id: string) => {
        setLoading(true)
        setError(null)
        
        try {
            const response = await fetch(`${config.apiBase}/api/dashboard/users/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })

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


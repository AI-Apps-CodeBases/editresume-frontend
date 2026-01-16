'use client'

import { useState, useEffect } from 'react'
import { User, UsersTableData } from '@/types/users'
import { getApiBaseUrl } from '@/lib/config'

export function useUsersData(page: number = 1, limit: number = 10, searchQuery: string = '', statusFilter: string = 'all') {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<UsersTableData>({
        users: [],
        totalUsers: 0,
        currentPage: 1,
        totalPages: 1
    })

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                // Get auth token (optional for local development)
                const token = typeof window !== 'undefined' 
                    ? localStorage.getItem('authToken') 
                    : null

                const baseUrl = getApiBaseUrl()
                
                // Build query params
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: limit.toString(),
                })
                
                if (searchQuery) {
                    params.append('search', searchQuery)
                }
                
                if (statusFilter && statusFilter !== 'all') {
                    params.append('status', statusFilter)
                }

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                }
                
                // Add authorization header only if token exists
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }

                const response = await fetch(`${baseUrl}/api/dashboard/users?${params.toString()}`, {
                    headers,
                })

                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.statusText}`)
                }

                const result = await response.json()
                setData(result)
            } catch (error) {
                console.error('Error fetching users:', error)
                setData({
                    users: [],
                    totalUsers: 0,
                    currentPage: 1,
                    totalPages: 1
                })
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [page, limit, searchQuery, statusFilter])

    return { ...data, loading }
}

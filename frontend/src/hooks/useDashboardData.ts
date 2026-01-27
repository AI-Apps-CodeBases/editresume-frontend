import { useState, useEffect } from 'react'
import {
    DashboardStats,
    SalesData,
    SubscriberData,
    UserOverviewData,
    TopPerformer,
    CountryData,
    ContentGenerationData,
    BillingFunnelResponse
} from '@/types/dashboard'
import { getApiBaseUrl } from '@/lib/config'

export const useDashboardData = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalSubscriptions: 0,
        totalFreeUsers: 0,
        totalIncome: 0,
        totalExpense: 0,
        usersChange: 0,
        subscriptionsChange: 0,
        freeUsersChange: 0,
        incomeChange: 0,
        expenseChange: 0,
    })
    const [salesData, setSalesData] = useState<SalesData[]>([])
    const [subscriberData, setSubscriberData] = useState<SubscriberData[]>([])
    const [userOverview, setUserOverview] = useState<UserOverviewData[]>([])
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
    const [topCountries, setTopCountries] = useState<CountryData[]>([])
    const [contentGenData, setContentGenData] = useState<ContentGenerationData[]>([])
    const [billingFunnel, setBillingFunnel] = useState<BillingFunnelResponse | null>(null)
    const [latestUsers, setLatestUsers] = useState<any[]>([])
    const [latestSubscribers, setLatestSubscribers] = useState<any[]>([])
    const [feedbacks, setFeedbacks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(true) // Separate loading for stats
    const [error, setError] = useState<string | null>(null)

    // Fetch real data from PostgreSQL via FastAPI
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            setStatsLoading(true)
            setError(null)
            
            try {
                // Get auth token (optional for local development)
                const token = typeof window !== 'undefined' 
                    ? localStorage.getItem('authToken') 
                    : null

                const baseUrl = getApiBaseUrl()
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                }
                
                // Add authorization header only if token exists
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }

                // PRIORITY 1: Fetch critical stats first (show immediately)
                try {
                    const statsResponse = await fetch(`${baseUrl}/api/dashboard/stats`, { headers })
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json()
                        setStats(statsData)
                        setStatsLoading(false) // Stats loaded, show them
                    }
                } catch (err) {
                    console.error('Stats API error:', err)
                } finally {
                    setLoading(false) // Show page as soon as stats load (or fail)
                }

                // PRIORITY 2: Fetch other data in parallel (non-blocking)
                const [salesRes, subscribersRes, userOverviewRes, topPerformersRes, topCountriesRes, contentGenRes, latestUsersRes, latestSubscribersRes, feedbacksRes, billingFunnelRes] = await Promise.allSettled([
                    fetch(`${baseUrl}/api/dashboard/sales`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/subscribers`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/user-overview`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/top-performers`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/top-countries?period=monthly`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/content-generation`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/latest-users`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/latest-subscribers`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/feedback`, { headers }).catch(err => {
                        console.error('🚨 Feedback fetch error:', err)
                        throw err
                    }),
                    fetch(`${baseUrl}/api/dashboard/billing-funnel?days=30`, { headers }),
                ])

                // Update sales data
                if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
                    const data = await salesRes.value.json()
                    setSalesData(data)
                }

                // Update subscriber data
                if (subscribersRes.status === 'fulfilled' && subscribersRes.value.ok) {
                    const result = await subscribersRes.value.json()
                    // Handle both old format (array) and new format (object with data, totalSubscriptions, subscriptionsChange)
                    if (Array.isArray(result)) {
                        setSubscriberData(result)
                    } else {
                        setSubscriberData(result.data || [])
                        // Update stats with subscriber info if available
                        if (result.totalSubscriptions !== undefined) {
                            setStats(prev => ({
                                ...prev,
                                totalSubscriptions: result.totalSubscriptions,
                                subscriptionsChange: result.subscriptionsChange || 0,
                            }))
                        }
                    }
                }

                // Update user overview
                if (userOverviewRes.status === 'fulfilled' && userOverviewRes.value.ok) {
                    const data = await userOverviewRes.value.json()
                    setUserOverview(data)
                }

                // Update top performers
                if (topPerformersRes.status === 'fulfilled' && topPerformersRes.value.ok) {
                    const data = await topPerformersRes.value.json()
                    setTopPerformers(data)
                }

                // Update top countries
                if (topCountriesRes.status === 'fulfilled' && topCountriesRes.value.ok) {
                    const data = await topCountriesRes.value.json()
                    setTopCountries(data)
                }

                // Update content generation data
                if (contentGenRes.status === 'fulfilled' && contentGenRes.value.ok) {
                    const data = await contentGenRes.value.json()
                    console.log('Content generation data:', data) // Debug log
                    // Ensure data has the correct format with word and image fields
                    const formattedData = Array.isArray(data) ? data.map(item => ({
                        date: item.date || '',
                        word: item.word || 0,
                        image: item.image || 0
                    })) : []
                    setContentGenData(formattedData)
                } else {
                    console.error('Content generation API error:', contentGenRes.status === 'rejected' ? contentGenRes.reason : 'Response not OK')
                }

                // Update latest users
                if (latestUsersRes.status === 'fulfilled' && latestUsersRes.value.ok) {
                    const data = await latestUsersRes.value.json()
                    setLatestUsers(data)
                }

                // Update latest subscribers
                if (latestSubscribersRes.status === 'fulfilled' && latestSubscribersRes.value.ok) {
                    const data = await latestSubscribersRes.value.json()
                    setLatestSubscribers(data)
                }

                // Update feedbacks
                if (feedbacksRes.status === 'fulfilled') {
                    if (feedbacksRes.value.ok) {
                        const data = await feedbacksRes.value.json()
                        console.log('✅ Feedbacks fetched successfully:', data)
                        setFeedbacks(Array.isArray(data) ? data : [])
                    } else {
                        console.error('❌ Failed to fetch feedbacks. Status:', feedbacksRes.value.status, feedbacksRes.value.statusText)
                        try {
                            const errorText = await feedbacksRes.value.text()
                            console.error('Error response body:', errorText)
                        } catch (e) {
                            console.error('Could not read error response')
                        }
                        setFeedbacks([]) // Set empty array on error
                    }
                } else {
                    console.error('❌ Feedbacks fetch rejected:', feedbacksRes.reason)
                    setFeedbacks([]) // Set empty array on rejection
                }

                // Update billing funnel
                if (billingFunnelRes.status === 'fulfilled' && billingFunnelRes.value.ok) {
                    const data = await billingFunnelRes.value.json()
                    setBillingFunnel(data)
                }

            } catch (err) {
                console.error('Error fetching dashboard data:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    // Function to fetch feedbacks separately (for refetching after deletion)
    const fetchFeedbacks = async () => {
        try {
            const token = typeof window !== 'undefined' 
                ? localStorage.getItem('authToken') 
                : null
            
            if (!token) {
                console.error('No auth token available')
                return
            }

            const baseUrl = getApiBaseUrl()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }

            const response = await fetch(`${baseUrl}/api/dashboard/feedback`, { headers })
            
            if (response.ok) {
                const data = await response.json()
                setFeedbacks(Array.isArray(data) ? data : [])
            } else {
                console.error('Failed to fetch feedbacks:', response.status, response.statusText)
            }
        } catch (err) {
            console.error('Error fetching feedbacks:', err)
        }
    }

    // Function to delete a feedback
    const deleteFeedback = async (feedbackId: number): Promise<boolean> => {
        try {
            const token = typeof window !== 'undefined' 
                ? localStorage.getItem('authToken') 
                : null
            
            if (!token) {
                console.error('No auth token available')
                return false
            }

            const baseUrl = getApiBaseUrl()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }

            const response = await fetch(`${baseUrl}/api/dashboard/feedback/${feedbackId}`, {
                method: 'DELETE',
                headers,
            })

            if (response.ok) {
                // Remove the deleted feedback from state immediately for better UX
                setFeedbacks(prevFeedbacks => prevFeedbacks.filter(f => f.id !== feedbackId))
                
                // Optionally refetch to ensure consistency
                // await fetchFeedbacks()
                
                return true
            } else {
                console.error('Failed to delete feedback:', response.status, response.statusText)
                return false
            }
        } catch (err) {
            console.error('Error deleting feedback:', err)
            return false
        }
    }

    return {
        stats,
        salesData,
        subscriberData,
        userOverview,
        topPerformers,
        topCountries,
        contentGenData,
        billingFunnel,
        latestUsers,
        latestSubscribers,
        feedbacks,
        loading,
        statsLoading, // Separate loading state for stats
        error,
        deleteFeedback,
        fetchFeedbacks
    }
}

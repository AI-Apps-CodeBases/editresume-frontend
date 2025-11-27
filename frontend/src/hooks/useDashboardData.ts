import { useState, useEffect } from 'react'
import {
    DashboardStats,
    SalesData,
    SubscriberData,
    UserOverviewData,
    TopPerformer,
    CountryData,
    ContentGenerationData
} from '@/types/dashboard'

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
    const [latestUsers, setLatestUsers] = useState<any[]>([])
    const [latestSubscribers, setLatestSubscribers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch real data from PostgreSQL via FastAPI
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            setError(null)
            
            try {
                // Get auth token
                const token = typeof window !== 'undefined' 
                    ? localStorage.getItem('authToken') 
                    : null
                
                if (!token) {
                    setError('Authentication required')
                    setLoading(false)
                    return
                }

                const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'https://editresume-staging.onrender.com'
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }

                // Fetch all dashboard data in parallel
                const [statsRes, salesRes, subscribersRes, userOverviewRes, topPerformersRes, topCountriesRes, contentGenRes, latestUsersRes, latestSubscribersRes] = await Promise.allSettled([
                    fetch(`${baseUrl}/api/dashboard/stats`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/sales`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/subscribers`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/user-overview`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/top-performers`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/top-countries`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/content-generation`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/latest-users`, { headers }),
                    fetch(`${baseUrl}/api/dashboard/latest-subscribers`, { headers }),
                ])

                // Update stats
                if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
                    const data = await statsRes.value.json()
                    setStats(data)
                }

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
                    setContentGenData(data)
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

            } catch (err) {
                console.error('Error fetching dashboard data:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    return {
        stats,
        salesData,
        subscriberData,
        userOverview,
        topPerformers,
        topCountries,
        contentGenData,
        latestUsers,
        latestSubscribers,
        loading,
        error
    }
}

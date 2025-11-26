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

// Mock Data
const MOCK_STATS: DashboardStats = {
    totalUsers: 20000,
    totalSubscriptions: 15000,
    totalFreeUsers: 5000,
    totalIncome: 42000,
    totalExpense: 30000,
    usersChange: 5000,
    subscriptionsChange: -800,
    freeUsersChange: 200,
    incomeChange: 20000,
    expenseChange: 5000
}

const MOCK_SALES_DATA: SalesData[] = [
    { date: 'Jan', amount: 10000 },
    { date: 'Feb', amount: 20000 },
    { date: 'Mar', amount: 15000 },
    { date: 'Apr', amount: 30000 },
    { date: 'May', amount: 18000 },
    { date: 'Jun', amount: 35000 },
    { date: 'Jul', amount: 22000 },
    { date: 'Aug', amount: 32000 },
    { date: 'Sep', amount: 18000 },
    { date: 'Oct', amount: 25000 },
    { date: 'Nov', amount: 15000 },
    { date: 'Dec', amount: 28000 },
]

const MOCK_SUBSCRIBER_DATA: SubscriberData[] = [
    { date: 'Sun', count: 3000 },
    { date: 'Mon', count: 2500 },
    { date: 'Tue', count: 4000 },
    { date: 'Wed', count: 4200 },
    { date: 'Thu', count: 2800 },
    { date: 'Fri', count: 3500 },
    { date: 'Sat', count: 1800 },
]

const MOCK_USER_OVERVIEW: UserOverviewData[] = [
    { date: 'Today', new: 500, subscribers: 300 }
]

const MOCK_TOP_PERFORMERS: TopPerformer[] = [
    { id: '1', name: 'Dianne Russell', email: 'redaniel@gmail.com', agentId: '36254', revenue: 20, status: 'active' },
    { id: '2', name: 'Wade Warren', email: 'xterris@gmail.com', agentId: '36254', revenue: 20, status: 'active' },
    { id: '3', name: 'Albert Flores', email: 'seannand@mail.ru', agentId: '36254', revenue: 30, status: 'active' },
    { id: '4', name: 'Bessie Cooper', email: 'igerrin@gmail.com', agentId: '36254', revenue: 40, status: 'active' },
    { id: '5', name: 'Arlene McCoy', email: 'fellora@mail.ru', agentId: '36254', revenue: 10, status: 'active' },
    { id: '6', name: 'Arlene McCoy', email: 'fellora@mail.ru', agentId: '36254', revenue: 10, status: 'active' },
]

const MOCK_COUNTRIES: CountryData[] = [
    { country: 'USA', flag: '🇺🇸', users: 1240, percentage: 80 },
    { country: 'Japan', flag: '🇯🇵', users: 1240, percentage: 60 },
    { country: 'France', flag: '🇫🇷', users: 1240, percentage: 49 },
    { country: 'Germany', flag: '🇩🇪', users: 1240, percentage: 100 },
    { country: 'South Korea', flag: '🇰🇷', users: 1240, percentage: 30 },
]

const MOCK_CONTENT_GEN: ContentGenerationData[] = [
    { date: 'Jan', word: 19000, image: 15000 },
    { date: 'Feb', word: 15000, image: 18000 },
    { date: 'Mar', word: 13000, image: 19000 },
    { date: 'Apr', word: 24000, image: 20000 },
    { date: 'May', word: 45000, image: 35000 },
    { date: 'Jun', word: 18000, image: 20000 },
    { date: 'Jul', word: 28000, image: 18000 },
    { date: 'Aug', word: 10000, image: 12000 },
    { date: 'Sep', word: 25000, image: 18000 },
    { date: 'Oct', word: 48000, image: 38000 },
    { date: 'Nov', word: 18000, image: 14000 },
    { date: 'Dec', word: 22000, image: 15000 },
]

export const useDashboardData = () => {
    const [stats, setStats] = useState<DashboardStats>(MOCK_STATS)
    const [salesData, setSalesData] = useState<SalesData[]>(MOCK_SALES_DATA)
    const [subscriberData, setSubscriberData] = useState<SubscriberData[]>(MOCK_SUBSCRIBER_DATA)
    const [userOverview, setUserOverview] = useState<UserOverviewData[]>(MOCK_USER_OVERVIEW)
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>(MOCK_TOP_PERFORMERS)
    const [topCountries, setTopCountries] = useState<CountryData[]>(MOCK_COUNTRIES)
    const [contentGenData, setContentGenData] = useState<ContentGenerationData[]>(MOCK_CONTENT_GEN)
    const [loading, setLoading] = useState(false)

    // In a real implementation, you would fetch data from Firestore here
    useEffect(() => {
        // Simulating fetch
        setLoading(true)
        const timer = setTimeout(() => {
            setLoading(false)
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    return {
        stats,
        salesData,
        subscriberData,
        userOverview,
        topPerformers,
        topCountries,
        contentGenData,
        loading
    }
}

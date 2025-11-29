export interface User {
    id: string
    name: string
    email: string
    avatar?: string
    country?: string
    createdAt: Date
    isSubscriber: boolean
    planType?: 'free' | 'basic' | 'standard' | 'business' | 'enterprise'
    monthlySpend?: number
    tokensUsed?: number
    revenue?: number
}

export interface Subscription {
    id: string
    userId: string
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
    plan: 'free' | 'basic' | 'standard' | 'business' | 'enterprise'
    price: number
    startedAt: Date
    renewedAt?: Date
    stripeSubscriptionId?: string
}

export interface Payment {
    id: string
    userId: string
    amount: number
    currency: string
    type: 'income' | 'expense'
    createdAt: Date
    stripePaymentId?: string
    description?: string
}

export interface TokenUsage {
    id: string
    userId: string
    tokens: number
    createdAt: Date
    actionType: 'generate_content' | 'chat' | 'image' | 'other'
}

export interface DashboardStats {
    totalUsers: number
    totalSubscriptions: number
    totalFreeUsers: number
    totalIncome: number
    totalExpense: number
    usersChange: number
    subscriptionsChange: number
    freeUsersChange: number
    incomeChange: number
    expenseChange: number
}

export interface SalesData {
    date: string
    amount: number
}

export interface SubscriberData {
    date: string
    count: number
}

export interface UserOverviewData {
    date: string
    new: number
    subscribers: number
}

export interface TopPerformer {
    id: string
    name: string
    email: string
    agentId: string
    revenue: number
    status: 'active' | 'inactive'
    avatar?: string
}

export interface CountryData {
    country: string
    flag: string
    users: number
    percentage: number
}

export interface ContentGenerationData {
    date: string
    word: number
    image: number
}

export interface Feedback {
    id: number
    user_email: string | null
    rating: number | null
    feedback: string
    category: string
    page_url: string | null
    created_at: string | null
}

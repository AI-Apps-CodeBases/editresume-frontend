'use client'

import { Users, Award, UserPlus, Wallet, Receipt } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { SubscriberChart } from '@/components/dashboard/SubscriberChart'
import { UserOverviewChart } from '@/components/dashboard/UserOverviewChart'
import { LatestUsersTable } from '@/components/dashboard/LatestUsersTable'
import { TopPerformerList } from '@/components/dashboard/TopPerformerList'
import { TopCountriesMap } from '@/components/dashboard/TopCountriesMap'
import { GeneratedContentChart } from '@/components/dashboard/GeneratedContentChart'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function DashboardPage() {
    const {
        stats,
        salesData,
        subscriberData,
        userOverview,
        topPerformers,
        topCountries,
        contentGenData,
        loading
    } = useDashboardData()

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">Loading...</div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <div className="flex items-center text-sm text-gray-500">
                        <span>Dashboard</span>
                        <span className="mx-2">-</span>
                        <span>AI</span>
                    </div>
                </div>

                {/* Metric Cards - Always 5 columns side by side */}
                <div className="grid grid-cols-5 gap-4">
                    <MetricCard
                        title="Total Users"
                        value={stats.totalUsers.toLocaleString()}
                        change={`+${stats.usersChange}`}
                        changeLabel="Last 30 days users"
                        icon={Users}
                        iconBgColor="bg-cyan-500"
                        iconColor="text-white"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Subscription"
                        value={stats.totalSubscriptions.toLocaleString()}
                        change={`${stats.subscriptionsChange}`}
                        changeLabel="Last 30 days subscription"
                        icon={Award}
                        iconBgColor="bg-purple-500"
                        iconColor="text-white"
                        trend="down"
                        trendColor="text-red-500"
                    />
                    <MetricCard
                        title="Total Free Users"
                        value={stats.totalFreeUsers.toLocaleString()}
                        change={`+${stats.freeUsersChange}`}
                        changeLabel="Last 30 days users"
                        icon={UserPlus}
                        iconBgColor="bg-cyan-400"
                        iconColor="text-white"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Income"
                        value={`$${stats.totalIncome.toLocaleString()}`}
                        change={`+$${stats.incomeChange.toLocaleString()}`}
                        changeLabel="Last 30 days income"
                        icon={Wallet}
                        iconBgColor="bg-green-500"
                        iconColor="text-white"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Expense"
                        value={`$${stats.totalExpense.toLocaleString()}`}
                        change={`+$${stats.expenseChange.toLocaleString()}`}
                        changeLabel="Last 30 days expense"
                        icon={Receipt}
                        iconBgColor="bg-red-600"
                        iconColor="text-white"
                        trend="up"
                    />
                </div>

                {/* Charts Row 1 - Sales Statistic wider (2 cols), others 1 col each */}
                <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-2">
                        <SalesChart data={salesData} />
                    </div>
                    <div className="col-span-1">
                        <SubscriberChart data={subscriberData} />
                    </div>
                    <div className="col-span-1">
                        <UserOverviewChart data={userOverview} />
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <LatestUsersTable />
                    </div>
                    <div className="lg:col-span-1">
                        <TopPerformerList data={topPerformers} />
                    </div>
                </div>

                {/* Charts Row 3 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TopCountriesMap data={topCountries} />
                    <GeneratedContentChart data={contentGenData} />
                </div>

            </div>
        </DashboardLayout>
    )
}

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { UserOverviewData } from '@/types/dashboard'

interface UserOverviewChartProps {
    data: UserOverviewData[]
}

export function UserOverviewChart({ data }: UserOverviewChartProps) {
    // Transform data for Pie Chart - only show New and Subscribed (no inactive)
    const newCount = data[0]?.new || 0
    const subscribedCount = data[0]?.subscribers || 0
    const pieData = [
        { name: 'New', value: newCount, color: '#3B82F6' },
        { name: 'Subscribed', value: subscribedCount, color: '#F59E0B' },
    ].filter(item => item.value > 0) // Only show segments with data

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Users Overview</h3>
                <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                    <option>Today</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                </select>
            </div>

            <div className="h-[200px] w-full min-w-0 relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text - Total Users */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {(data[0]?.new || 0) + (data[0]?.subscribers || 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Total Users</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-8 mt-4">
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></div>
                    <span className="text-sm text-gray-600">New: <span className="font-bold text-gray-900">{data[0]?.new}</span></span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-amber-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Subscribed: <span className="font-bold text-gray-900">{data[0]?.subscribers}</span></span>
                </div>
            </div>
        </div>
    )
}

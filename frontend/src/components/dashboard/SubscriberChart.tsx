import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts'
import { SubscriberData } from '@/types/dashboard'

interface SubscriberChartProps {
    data: SubscriberData[]
    totalSubscriptions?: number
    subscriptionsChange?: number
}

export function SubscriberChart({ data, totalSubscriptions = 0, subscriptionsChange = 0 }: SubscriberChartProps) {
    // Calculate total from data if available
    const calculatedTotal = data.length > 0
        ? data.reduce((sum, item) => sum + (item.count || 0), 0)
        : totalSubscriptions
    
    // Calculate average per day (last 7 days)
    const avgPerDay = data.length > 0
        ? Math.round(calculatedTotal / 7)
        : Math.round(Math.abs(subscriptionsChange) / 30)
    
    // Calculate percentage change
    const percentageChange = data.length > 1 && calculatedTotal > 0
        ? Math.round(((data[data.length - 1]?.count || 0) - (data[0]?.count || 0)) / (data[0]?.count || 1) * 100)
        : subscriptionsChange !== 0 ? Math.round((subscriptionsChange / totalSubscriptions) * 100) : 0
    
    const isPositive = percentageChange >= 0

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Total Subscriber</h3>
                <div className="flex items-center mt-1">
                    <span className="text-2xl font-bold text-gray-900 mr-2">{calculatedTotal.toLocaleString()}</span>
                    <span className={`${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} text-xs font-medium px-2 py-0.5 rounded-full`}>
                        {Math.abs(percentageChange)}% {isPositive ? '▲' : '▼'}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">{isPositive ? '+' : '-'} {avgPerDay} Per Day</span>
                </div>
            </div>

            <div className="h-[250px] w-full min-h-[250px] min-w-0">
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            dy={10}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[10, 10, 10, 10]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#DBEAFE' : '#E0E7FF'} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                    </div>
                )}
            </div>
        </div>
    )
}

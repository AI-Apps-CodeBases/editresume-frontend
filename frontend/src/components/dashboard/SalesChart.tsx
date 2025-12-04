import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { SalesData } from '@/types/dashboard'

interface SalesChartProps {
    data: SalesData[]
    totalIncome?: number
    incomeChange?: number
}

export function SalesChart({ data, totalIncome = 0, incomeChange = 0 }: SalesChartProps) {
    // Calculate total from data if available
    const calculatedTotal = data.length > 0 
        ? data.reduce((sum, item) => sum + (item.amount || 0), 0)
        : totalIncome
    
    // Calculate average per day (last 30 days)
    const avgPerDay = data.length > 0 
        ? Math.round(calculatedTotal / 30)
        : Math.round(incomeChange / 30)
    
    // Calculate percentage change
    const percentageChange = data.length > 1 && calculatedTotal > 0
        ? Math.round(((data[data.length - 1]?.amount || 0) - (data[0]?.amount || 0)) / (data[0]?.amount || 1) * 100)
        : incomeChange > 0 ? 10 : -10
    
    const isPositive = percentageChange >= 0

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sales Statistic</h3>
                    <div className="flex items-center mt-1">
                        <span className="text-2xl font-bold text-gray-900 mr-2">${calculatedTotal.toLocaleString()}</span>
                        <span className={`${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} text-xs font-medium px-2 py-0.5 rounded-full`}>
                            {Math.abs(percentageChange)}% {isPositive ? '▲' : '▼'}
                        </span>
                        <span className="text-gray-400 text-xs ml-2">+ ${avgPerDay} Per Day</span>
                    </div>
                </div>
                <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                </select>
            </div>

            <div className="h-[250px] w-full" style={{ width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#4F46E5' }}
                            formatter={(value: number) => [`$${value}`, 'Amount']}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#4F46E5"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorAmount)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

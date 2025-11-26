import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts'
import { SubscriberData } from '@/types/dashboard'

interface SubscriberChartProps {
    data: SubscriberData[]
}

export function SubscriberChart({ data }: SubscriberChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Total Subscriber</h3>
                <div className="flex items-center mt-1">
                    <span className="text-2xl font-bold text-gray-900 mr-2">5,000</span>
                    <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">10% ▼</span>
                    <span className="text-gray-400 text-xs ml-2">- 20 Per Day</span>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
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
            </div>
        </div>
    )
}

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ContentGenerationData } from '@/types/dashboard'

interface GeneratedContentChartProps {
    data: ContentGenerationData[]
}

export function GeneratedContentChart({ data }: GeneratedContentChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
                <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                    <option>Today</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                </select>
            </div>

            <div className="h-[300px] w-full min-h-[300px] min-w-0">
                {data && data.length > 0 && data.some(item => (item.word || 0) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
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
                                tickFormatter={(value) => {
                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                                    return value.toString()
                                }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Tokens']}
                                labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="left"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', paddingLeft: '0px' }}
                            />
                            <Bar 
                                dataKey="word" 
                                name="Tokens Used" 
                                fill="#3B82F6" 
                                radius={[4, 4, 0, 0]} 
                                barSize={12}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <p className="text-sm">No token usage data available</p>
                            <p className="text-xs text-gray-400 mt-1">Data will appear when users generate content with AI</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

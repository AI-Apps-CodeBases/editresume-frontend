import { TopPerformer } from '@/types/dashboard'

interface TopPerformerListProps {
    data: TopPerformer[]
}

export function TopPerformerList({ data }: TopPerformerListProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Performer</h3>
                <button className="text-blue-600 text-sm font-medium hover:underline">View All &gt;</button>
            </div>

            <div className="space-y-5">
                {data.map((performer) => (
                    <div key={performer.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex-shrink-0 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${performer.name}`} alt={performer.name} className="w-full h-full" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 text-sm">{performer.name}</div>
                                <div className="text-gray-500 text-xs">Agent ID: {performer.agentId}</div>
                            </div>
                        </div>
                        <div className="font-bold text-gray-900 text-sm">${performer.revenue}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

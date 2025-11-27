import { useState } from 'react'
import { cn } from '@/lib/utils'

interface UserItem {
    id: string
    name: string
    email: string
    joinDate: string
    isPremium: boolean
}

interface LatestUsersTableProps {
    latestUsers?: UserItem[]
    latestSubscribers?: UserItem[]
}

export function LatestUsersTable({ latestUsers = [], latestSubscribers = [] }: LatestUsersTableProps) {
    const [activeTab, setActiveTab] = useState<'registered' | 'subscribed'>('registered')
    
    const currentData = activeTab === 'registered' ? latestUsers : latestSubscribers
    const count = currentData.length
    
    const getPlanName = (isPremium: boolean) => {
        return isPremium ? 'Premium' : 'Free'
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-4 border-b border-gray-100 w-full">
                    <button
                        onClick={() => setActiveTab('registered')}
                        className={cn(
                            "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center",
                            activeTab === 'registered'
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Latest Registered
                        <span className={cn("ml-2 px-2 py-0.5 rounded-full text-xs", activeTab === 'registered' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>{latestUsers.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('subscribed')}
                        className={cn(
                            "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center",
                            activeTab === 'subscribed'
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Latest Subscribe
                        <span className={cn("ml-2 px-2 py-0.5 rounded-full text-xs", activeTab === 'subscribed' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>{latestSubscribers.length}</span>
                    </button>
                </div>
                <button className="text-blue-600 text-sm font-medium hover:underline whitespace-nowrap ml-4">View All &gt;</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-500 text-sm border-b border-gray-50">
                            <th className="pb-3 font-medium pl-2">Users</th>
                            <th className="pb-3 font-medium">Registered On</th>
                            <th className="pb-3 font-medium">Plan</th>
                            <th className="pb-3 font-medium text-right pr-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {currentData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            currentData.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 pl-2">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex-shrink-0 overflow-hidden">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-full h-full" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-gray-500 text-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 text-gray-500">{user.joinDate}</td>
                                    <td className="py-3 text-gray-500">{getPlanName(user.isPremium)}</td>
                                    <td className="py-3 text-right pr-2">
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

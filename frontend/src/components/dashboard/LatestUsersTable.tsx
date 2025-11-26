import { useState } from 'react'
import { cn } from '@/lib/utils'

interface UserItem {
    id: string
    name: string
    email: string
    date: string
    plan: string
    status: 'Active' | 'Inactive'
    avatar?: string
}

// Mock data for the table
const MOCK_USERS: UserItem[] = [
    { id: '1', name: 'Dianne Russell', email: 'redaniel@gmail.com', date: '27 Mar 2024', plan: 'Free', status: 'Active' },
    { id: '2', name: 'Wade Warren', email: 'xterris@gmail.com', date: '27 Mar 2024', plan: 'Basic', status: 'Active' },
    { id: '3', name: 'Albert Flores', email: 'seannand@mail.ru', date: '27 Mar 2024', plan: 'Standard', status: 'Active' },
    { id: '4', name: 'Bessie Cooper', email: 'igerrin@gmail.com', date: '27 Mar 2024', plan: 'Business', status: 'Active' },
    { id: '5', name: 'Arlene McCoy', email: 'fellora@mail.ru', date: '27 Mar 2024', plan: 'Enterprise', status: 'Active' },
]

export function LatestUsersTable() {
    const [activeTab, setActiveTab] = useState<'registered' | 'subscribed'>('registered')

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
                        <span className={cn("ml-2 px-2 py-0.5 rounded-full text-xs", activeTab === 'registered' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>35</span>
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
                        <span className={cn("ml-2 px-2 py-0.5 rounded-full text-xs", activeTab === 'subscribed' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>35</span>
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
                        {MOCK_USERS.map((user) => (
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
                                <td className="py-3 text-gray-500">{user.date}</td>
                                <td className="py-3 text-gray-500">{user.plan}</td>
                                <td className="py-3 text-right pr-2">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                                        {user.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

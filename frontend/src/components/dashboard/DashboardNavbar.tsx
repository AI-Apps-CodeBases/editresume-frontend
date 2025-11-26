'use client'

import { Menu, Search, Bell, Mail, Settings } from 'lucide-react'

interface DashboardNavbarProps {
    onMenuClick: () => void
}

export function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5 text-gray-600" />
                </button>

                {/* Search */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                    <Settings className="w-5 h-5 text-gray-600" />
                </button>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                    <img
                        src="https://flagcdn.com/w40/us.png"
                        alt="US"
                        className="w-5 h-4 object-cover rounded"
                    />
                </button>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                    <Mail className="w-5 h-5 text-gray-600" />
                </button>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Avatar */}
                <button className="ml-2 flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 transition-colors">
                    <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                        alt="User"
                        className="w-8 h-8 rounded-full"
                    />
                </button>
            </div>
        </header>
    )
}

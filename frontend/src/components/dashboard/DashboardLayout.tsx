'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardNavbar } from '@/components/dashboard/DashboardNavbar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className={cn(
                "transition-all duration-300 ease-in-out",
                sidebarOpen ? "lg:ml-64" : "lg:ml-20"
            )}>
                <DashboardNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                <main className="p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

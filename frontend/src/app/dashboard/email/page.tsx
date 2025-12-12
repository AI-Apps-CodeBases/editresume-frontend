'use client'

import { Mail } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function EmailPage() {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-gray-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Email</h1>
                    </div>
                </div>

                {/* Placeholder Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                    <div className="text-center">
                        <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Management</h2>
                        <p className="text-gray-500 mb-6">
                            Email management features will be available here.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}




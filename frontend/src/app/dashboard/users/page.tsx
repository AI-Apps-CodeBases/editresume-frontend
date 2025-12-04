'use client'

import { useState, useEffect } from 'react'
import { Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { UserDetailsModal } from '@/components/dashboard/UserDetailsModal'
import { useUsersData } from '@/hooks/useUsersData'
import { User } from '@/types/users'

export default function UsersPage() {
    const [entriesPerPage, setEntriesPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [activePage, setActivePage] = useState(1)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    // Use debounced search query to avoid too many API calls
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    
    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
            setActivePage(1) // Reset to first page on search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])
    
    // Reset page when status filter changes
    useEffect(() => {
        setActivePage(1)
    }, [statusFilter])
    
    const { users, totalUsers, currentPage, totalPages, loading } = useUsersData(
        activePage,
        entriesPerPage,
        debouncedSearchQuery,
        statusFilter
    )

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">Loading...</div>
            </DashboardLayout>
        )
    }

    // Calculate display range
    const startIndex = (activePage - 1) * entriesPerPage
    const endIndex = Math.min(startIndex + entriesPerPage, totalUsers)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    {/* Table Controls */}
                    <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Show</span>
                                <select
                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={entriesPerPage}
                                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <input
                                type="text"
                                placeholder="Search"
                                className="border border-gray-200 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            <select
                                className="border border-gray-200 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4" />
                            Add New User
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-3 text-left">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.L</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Join Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user, index) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{startIndex + index + 1}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.joinDate}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.department}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.designation}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Active'
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedUserId(user.id)
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {startIndex + 1} to {endIndex} of {totalUsers} entries
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setActivePage(Math.max(1, activePage - 1))}
                                disabled={activePage === 1}
                            >
                                «
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === activePage
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    onClick={() => setActivePage(page)}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setActivePage(Math.min(totalPages, activePage + 1))}
                                disabled={activePage === totalPages}
                            >
                                »
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Details Modal */}
            <UserDetailsModal
                userId={selectedUserId}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedUserId(null)
                }}
            />
        </DashboardLayout>
    )
}

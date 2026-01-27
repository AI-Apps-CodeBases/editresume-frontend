'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Mail, ChevronRight, CreditCard, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

const menuItems = [
    {
        title: 'Dashboard',
        icon: Home,
        href: '/dashboard',
        hasSubmenu: true
    },
    {
        title: 'Users',
        icon: Users,
        href: '/dashboard/users',
        hasSubmenu: false
    },
    {
        title: 'Email',
        icon: Mail,
        href: '/dashboard/email',
        hasSubmenu: false
    },
    {
        title: 'Engagement',
        icon: Activity,
        href: '/dashboard/engagement',
        hasSubmenu: false
    },
    {
        title: 'Billing',
        icon: CreditCard,
        href: '/dashboard/billing',
        hasSubmenu: false
    }
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out",
                    isOpen ? "w-64" : "w-0 lg:w-20"
                )}
            >
                <div className={cn(
                    "h-full overflow-y-auto overflow-x-hidden",
                    !isOpen && "lg:flex lg:flex-col lg:items-center"
                )}>
                    {/* Logo */}
                    <div className={cn(
                        "h-16 flex items-center border-b border-gray-200",
                        isOpen ? "px-6" : "lg:px-4 lg:justify-center"
                    )}>
                        {isOpen ? (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">W</span>
                                </div>
                                <span className="font-bold text-gray-900">EditResume</span>
                            </div>
                        ) : (
                            <div className="hidden lg:block w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">W</span>
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <nav className={cn("py-4", isOpen ? "px-3" : "lg:px-2")}>
                        {menuItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors group relative",
                                        isActive
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                        !isOpen && "lg:justify-center lg:px-2"
                                    )}
                                    title={!isOpen ? item.title : undefined}
                                >
                                    <Icon className={cn(
                                        "flex-shrink-0",
                                        isActive ? "text-blue-600" : "text-gray-500",
                                        isOpen ? "w-5 h-5" : "w-6 h-6"
                                    )} />
                                    {isOpen && (
                                        <>
                                            <span className="flex-1 text-sm font-medium">{item.title}</span>
                                            {item.hasSubmenu && (
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                        </>
                                    )}

                                    {/* Tooltip for collapsed state */}
                                    {!isOpen && (
                                        <div className="hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                                            {item.title}
                                        </div>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </aside>
        </>
    )
}

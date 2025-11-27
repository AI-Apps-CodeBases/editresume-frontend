import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: string
    change: string
    changeLabel: string
    icon: LucideIcon
    iconBgColor: string
    iconColor: string
    trend: 'up' | 'down'
    trendColor?: string
    className?: string
}

export function MetricCard({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    iconBgColor,
    iconColor,
    trend,
    trendColor,
    className
}: MetricCardProps) {
    return (
        <div className={cn("bg-white p-6 rounded-xl shadow-sm border border-gray-100", className)}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className={cn("p-3 rounded-full", iconBgColor)}>
                    <Icon className={cn("w-6 h-6", iconColor)} />
                </div>
            </div>
            <div className="flex items-center text-sm">
                <span className={cn("font-semibold mr-2", trend === 'up' ? "text-green-500" : "text-red-500", trendColor)}>
                    {trend === 'up' ? '▲' : '▼'} {change}
                </span>
                <span className="text-gray-400">{changeLabel}</span>
            </div>
        </div>
    )
}

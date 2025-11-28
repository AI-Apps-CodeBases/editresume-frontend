type Stat = {
  value: string
  label: string
  trend?: 'up' | 'steady'
  caption?: string
}

interface StatsPanelProps {
  stats: Stat[]
  className?: string
}

export function StatsPanel({ stats, className }: StatsPanelProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-3xl border border-border-subtle bg-white px-4 py-3 text-xs text-text-muted shadow-[0_12px_24px_rgba(15,23,42,0.05)] sm:text-sm ${
        className ?? ''
      }`}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="pill-stat min-w-[160px] flex-1 items-center justify-start gap-3 rounded-pill border border-border-subtle bg-white px-4 py-2 text-left"
        >
          <div className="flex items-baseline gap-2">
            <strong>{stat.value}</strong>
            {stat.trend === 'up' && <span className="text-[11px] text-accent-teal">▲</span>}
            {stat.trend === 'steady' && <span className="text-[11px] text-text-muted">▬</span>}
          </div>
          <div className="flex flex-col text-[11px] uppercase tracking-[0.35em] text-text-muted">
            <span>{stat.label}</span>
            {stat.caption && <span className="normal-case tracking-normal text-[12px] text-text-secondary">{stat.caption}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}



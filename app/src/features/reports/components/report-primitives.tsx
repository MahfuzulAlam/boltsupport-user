import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useReportRange } from '../hooks/use-report-range'
import type { Bucket, Kpi } from '../api/reports'

/**
 * A change against the previous period, coloured by whether it is good news.
 *
 * Direction and goodness are separate: a falling median response time is an improvement and a
 * falling conversation count is not, so an arrow alone would mislead on half the tiles.
 */
export function Delta({ pct, goodDirection }: { pct: number; goodDirection: 'up' | 'down' }) {
  const compare = useReportRange((state) => state.compare)
  if (!compare || pct === 0) return null

  const rising = pct > 0
  const good = rising === (goodDirection === 'up')
  const Icon = rising ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className="inline-flex items-center gap-0.5 font-mono text-[13px]"
      style={{ color: good ? 'var(--success)' : 'var(--danger)' }}
      title={`${rising ? 'Up' : 'Down'} against the previous period`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {Math.abs(pct)}%
    </span>
  )
}

export function KpiTile({ kpi, suffix = '' }: { kpi: Kpi; suffix?: string }) {
  return (
    <div
      className="rounded-lg border p-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <p className="eyebrow mb-1.5">{kpi.label}</p>
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-[24px] leading-none font-medium">
          {kpi.value}
          {suffix}
        </span>
        <Delta pct={kpi.deltaPct} goodDirection={kpi.goodDirection} />
      </p>
    </div>
  )
}

export function ReportSection({
  title,
  children,
  actions,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section
      className="mb-4 rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {actions !== undefined ? <div className="ml-auto">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

/** Every report needs one: a period with no activity is a normal thing to look at. */
export function ReportZeroState({ what }: { what: string }) {
  const days = useReportRange((state) => state.days)
  return (
    <EmptyState
      icon={BarChart3}
      title={`No ${what} in this period`}
      description={`Nothing was recorded in the last ${String(days)} days. Try a wider date range.`}
    />
  )
}

/** A distribution table: count, share, and change. Used by both Email tabs. */
export function BucketTable({ buckets, unit }: { buckets: Bucket[]; unit: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[13px]">
        <thead>
          <tr className="text-left" style={{ color: 'var(--muted-foreground)' }}>
            <th className="pb-2 font-medium">{unit}</th>
            <th className="pb-2 text-right font-medium">#</th>
            <th className="pb-2 text-right font-medium">%</th>
            <th className="w-[80px] pb-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.label} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="py-1.5">{bucket.label}</td>
              <td className="py-1.5 text-right font-mono">{bucket.count}</td>
              <td className="py-1.5 text-right font-mono">{bucket.pct}%</td>
              <td className="py-1.5 text-right">
                {/* More conversations answered fast is good, so up is good in these tables. */}
                <Delta pct={bucket.deltaPct} goodDirection="up" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

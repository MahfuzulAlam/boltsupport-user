import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Csat } from '@/types'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { RingGauge } from './charts'
import { Delta, ReportSection, ReportZeroState } from './report-primitives'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'great', label: 'Great' },
  { key: 'okay', label: 'Okay' },
  { key: 'notGood', label: 'Not good' },
] as const

const RATING_STYLE: Record<Csat, { bg: string; fg: string; label: string }> = {
  great: { bg: 'var(--success-soft)', fg: 'var(--success-strong)', label: 'Great' },
  okay: { bg: 'var(--muted)', fg: 'var(--muted-foreground)', label: 'Okay' },
  notGood: { bg: 'var(--danger-soft)', fg: 'var(--danger-strong)', label: 'Not good' },
}

export function HappinessReport() {
  const days = useReportRange((state) => state.days)
  const [filter, setFilter] = useState<string>('all')

  const report = useQuery({
    queryKey: ['report', 'happiness', days],
    queryFn: ({ signal }) => fetchReport('happiness', days, 'all', signal),
  })

  const data = report.data
  const total = data?.totalRatings ?? 0
  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100))
  const rows = (data?.ratings ?? []).filter(
    (rating) => filter === 'all' || rating.rating === filter,
  )

  return (
    <ReportShell
      title="Happiness"
      description="What customers said when you asked, and how many of them answered."
      band="var(--success)"
      isLoading={report.isPending}
      buildCsv={() => [
        ['Metric', 'Value'],
        ['Happiness score', data?.score ?? 0],
        ['Great', data?.great ?? 0],
        ['Okay', data?.okay ?? 0],
        ['Not good', data?.notGood ?? 0],
        ['Total ratings', total],
        ['Coverage %', data?.coveragePct ?? 0],
        [],
        ['#', 'Customer', 'Agent', 'Date', 'Rating', 'Comment'],
        ...(data?.ratings ?? []).map((rating) => [
          rating.conversationNumber,
          rating.customer,
          rating.agent,
          rating.date,
          RATING_STYLE[rating.rating].label,
          rating.comment ?? '',
        ]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : total === 0 ? (
        <ReportZeroState what="ratings" />
      ) : (
        <>
          <ReportSection title="Ratings">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <RingGauge value={pct(data.great)} label="Great" color="var(--success)" />
                <p className="text-center">
                  <Delta pct={data.deltas.great} goodDirection="up" />
                </p>
              </div>
              <div>
                <RingGauge value={pct(data.okay)} label="Okay" color="var(--muted-foreground)" />
                <p className="text-center">
                  <Delta pct={data.deltas.okay} goodDirection="up" />
                </p>
              </div>
              <div>
                <RingGauge value={pct(data.notGood)} label="Not good" color="var(--danger)" />
                <p className="text-center">
                  {/* Fewer bad ratings is the good direction here. */}
                  <Delta pct={data.deltas.notGood} goodDirection="down" />
                </p>
              </div>
            </div>

            <div
              className="mt-4 rounded-lg border p-3.5 text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="eyebrow mb-1">Happiness score</p>
              <p className="font-mono text-[32px] leading-none font-medium">{data.score}</p>
              <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Percent Great minus percent Not good, based on {total} rating
                {total === 1 ? '' : 's'} from {data.coveragePct}% of customers.
              </p>
            </div>
          </ReportSection>

          <ReportSection
            title="Every rating"
            actions={
              <div className="flex items-center gap-1" role="tablist" aria-label="Rating filter">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.key}
                    onClick={() => {
                      setFilter(item.key)
                    }}
                    className={cn('h-7 rounded-md px-2.5 text-[13px]')}
                    style={
                      filter === item.key
                        ? {
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            fontWeight: 500,
                          }
                        : { color: 'var(--muted-foreground)' }
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: 'var(--muted-foreground)' }}>
                    <th className="w-[70px] pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="w-[90px] pb-2 font-medium">Date</th>
                    <th className="w-[90px] pb-2 font-medium">Rating</th>
                    <th className="pb-2 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((rating) => {
                    const style = RATING_STYLE[rating.rating]
                    return (
                      <tr
                        key={rating.id}
                        className="border-t"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="py-1.5 font-mono">#{rating.conversationNumber}</td>
                        <td className="py-1.5">{rating.customer}</td>
                        <td className="py-1.5">{rating.agent}</td>
                        <td className="py-1.5">{format(new Date(rating.date), 'd MMM')}</td>
                        <td className="py-1.5">
                          <span
                            className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                            style={{ background: style.bg, color: style.fg }}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="py-1.5" style={{ color: 'var(--muted-foreground)' }}>
                          {rating.comment ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </>
      )}
    </ReportShell>
  )
}

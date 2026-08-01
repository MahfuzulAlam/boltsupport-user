import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Toggle } from '@/components/settings-primitives'
import { cn } from '@/lib/utils'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { DonutChart, TrendLineChart } from './charts'
import { BucketTable, KpiTile, ReportSection, ReportZeroState } from './report-primitives'

/**
 * Four bands, fastest to slowest.
 *
 * The ten table buckets are the detail; the donut is the shape. Slicing the first four of ten
 * put almost everything in a single grey "slower" wedge, which showed nothing. Violet is absent
 * by design: response time is not an AI figure.
 */
const DONUT_BANDS = [
  { label: 'Under an hour', from: 0, to: 3, color: 'var(--success-strong)' },
  { label: '1 to 6 hours', from: 3, to: 6, color: 'var(--brand)' },
  { label: '6 to 24 hours', from: 6, to: 8, color: 'var(--warning)' },
  { label: 'Over a day', from: 8, to: 10, color: 'var(--danger-strong)' },
]

export function EmailReport() {
  const days = useReportRange((state) => state.days)
  const [tab, setTab] = useState<'response' | 'resolution'>('response')
  const [officeHours, setOfficeHours] = useState(false)

  const report = useQuery({
    queryKey: ['report', 'email', days],
    queryFn: ({ signal }) => fetchReport('email', days, 'email', signal),
  })

  const data = report.data
  const buckets = tab === 'response' ? data?.responseBuckets : data?.resolutionBuckets
  const empty = data !== undefined && data.kpis[0]?.value === 0

  // Each band carries its own slice bounds rather than a running cursor: a variable mutated
  // across map callbacks during render is exactly what the compiler cannot reason about.
  const donut = DONUT_BANDS.map((band) => ({
    name: band.label,
    value: (buckets ?? []).slice(band.from, band.to).reduce((sum, bucket) => sum + bucket.count, 0),
    color: band.color,
  })).filter((slice) => slice.value > 0)

  return (
    <ReportShell
      title="Email"
      description="How quickly email gets a first reply, and how long it takes to close."
      band="var(--info)"
      isLoading={report.isPending}
      buildCsv={() => [
        ['Metric', 'Value', 'Change vs previous %'],
        ...(data?.kpis ?? []).map((kpi) => [kpi.label, kpi.value, kpi.deltaPct]),
        [],
        ['Response time', 'Count', 'Share %', 'Change vs previous %'],
        ...(data?.responseBuckets ?? []).map((b) => [b.label, b.count, b.pct, b.deltaPct]),
        [],
        ['Resolution time', 'Count', 'Share %', 'Change vs previous %'],
        ...(data?.resolutionBuckets ?? []).map((b) => [b.label, b.count, b.pct, b.deltaPct]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : empty ? (
        <ReportZeroState what="email conversations" />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.kpis.map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} />
            ))}
          </div>

          <ReportSection title="Email volume">
            <TrendLineChart data={data.series} label="Email conversations" />
          </ReportSection>

          <ReportSection
            title="Time to answer"
            actions={
              <div className="flex items-center gap-3">
                <Toggle checked={officeHours} onChange={setOfficeHours} label="Office hours only" />
                <div className="flex items-center gap-1" role="tablist" aria-label="Time measure">
                  {(
                    [
                      { key: 'response' as const, label: 'Response time' },
                      { key: 'resolution' as const, label: 'Resolutions' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.key}
                      onClick={() => {
                        setTab(item.key)
                      }}
                      className={cn('h-7 rounded-md px-2.5 text-[13px]')}
                      style={
                        tab === item.key
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
              </div>
            }
          >
            {officeHours ? (
              <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Counting only time inside your inbox hours, the same clock a business hours SLA
                uses.
              </p>
            ) : null}

            <div className="grid items-center gap-4 lg:grid-cols-[240px_1fr]">
              <DonutChart data={donut} />
              <BucketTable
                buckets={buckets ?? []}
                unit={tab === 'response' ? 'First reply within' : 'Resolved within'}
              />
            </div>
          </ReportSection>
        </>
      )}
    </ReportShell>
  )
}

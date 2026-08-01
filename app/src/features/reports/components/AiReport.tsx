import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { ChannelStackChart, DonutChart } from './charts'
import { ReportSection, ReportZeroState } from './report-primitives'

export function AiReport() {
  const days = useReportRange((state) => state.days)

  const report = useQuery({
    queryKey: ['report', 'ai', days],
    queryFn: ({ signal }) => fetchReport('ai', days, 'all', signal),
  })

  const data = report.data

  return (
    <ReportShell
      title="AI"
      description="What the AI features did, and how often a human took over."
      band="var(--ai)"
      isLoading={report.isPending}
      buildCsv={() => [
        ['Metric', 'Value'],
        ['Conversations handled', data?.handled ?? 0],
        ['Resolution rate %', data?.resolutionRate ?? 0],
        ['Resolved', data?.resolved ?? 0],
        ['Unresolved', data?.unresolved ?? 0],
        ['Human escalation', data?.escalated ?? 0],
        [],
        ...(data?.tiles ?? []).map((tile) => [tile.label, tile.value]),
        [],
        ['Date', 'Email', 'Chat', 'Messaging', 'Social'],
        ...(data?.series ?? []).map((point) => [
          point.date,
          point.email,
          point.chat,
          point.messaging,
          point.social,
        ]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : data.handled === 0 ? (
        <ReportZeroState what="AI activity" />
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ReportSection title="Resolution">
              <p className="mb-2 font-mono text-[28px] leading-none font-medium">
                {data.resolutionRate}%
              </p>
              <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                {data.handled} conversations handled in this period.
              </p>
              <DonutChart
                data={[
                  { name: 'Resolved', value: data.resolved, color: 'var(--success-strong)' },
                  { name: 'Unresolved', value: data.unresolved, color: 'var(--muted-foreground)' },
                  { name: 'Human escalation', value: data.escalated, color: 'var(--warning)' },
                ]}
              />
            </ReportSection>

            <ReportSection title="Happiness with AI answers">
              <p className="mb-2 font-mono text-[28px] leading-none font-medium">
                {data.happiness.score}
                <span className="text-[16px]" style={{ color: 'var(--muted-foreground)' }}>
                  {' '}
                  / 100
                </span>
              </p>
              <DonutChart
                data={[
                  { name: 'Great', value: data.happiness.great, color: 'var(--success-strong)' },
                  { name: 'Okay', value: data.happiness.okay, color: 'var(--muted-foreground)' },
                  {
                    name: 'Not good',
                    value: data.happiness.notGood,
                    color: 'var(--danger-strong)',
                  },
                ]}
              />
            </ReportSection>
          </div>

          <ReportSection title="AI answers over time">
            <ChannelStackChart data={data.series} />
          </ReportSection>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.tiles.map((tile) => (
              <div
                key={tile.key}
                className="rounded-lg border p-3.5"
                style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
              >
                <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3" style={{ color: 'var(--ai)' }} aria-hidden="true" />
                  {tile.label}
                </p>
                <p className="font-mono text-[24px] leading-none font-medium">
                  {tile.value}
                  {tile.suffix}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Acceptance rates come from what agents did with each suggestion.{' '}
            <Link to="/ai" style={{ color: 'var(--brand)' }}>
              AI settings
            </Link>
          </p>
        </>
      )}
    </ReportShell>
  )
}

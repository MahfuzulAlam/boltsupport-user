import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { VolumeBarChart } from './charts'
import { Delta, KpiTile, ReportSection, ReportZeroState } from './report-primitives'

const CHANNEL_TABS = [
  { key: 'all', label: 'All' },
  { key: 'email', label: 'Email' },
  { key: 'chat', label: 'Chat' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'social', label: 'Social' },
] as const

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  chat: 'Live chat',
  messaging: 'WhatsApp and SMS',
  social: 'Instagram and Messenger',
}

export function AllChannelsReport() {
  const days = useReportRange((state) => state.days)
  const [channel, setChannel] = useState<string>('all')

  const report = useQuery({
    queryKey: ['report', 'all-channels', days, channel],
    queryFn: ({ signal }) => fetchReport('all-channels', days, channel, signal),
  })

  const data = report.data
  const empty = data !== undefined && data.kpis[0]?.value === 0

  return (
    <ReportShell
      title="All channels"
      description="Volume and activity across every way customers reach you."
      band="var(--brand)"
      isLoading={report.isPending}
      tabs={
        <div className="ml-auto flex items-center gap-1" role="tablist" aria-label="Channel">
          {CHANNEL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={channel === tab.key}
              onClick={() => {
                setChannel(tab.key)
              }}
              className={cn('h-7 rounded-md px-2.5 text-[13px]')}
              style={
                channel === tab.key
                  ? { background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 500 }
                  : { color: 'var(--muted-foreground)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
      buildCsv={() => [
        ['Metric', 'Value', 'Change vs previous %'],
        ...(data?.kpis ?? []).map((kpi) => [kpi.label, kpi.value, kpi.deltaPct]),
        [],
        ['Channel', 'Conversations', 'Customers'],
        ...(data?.byChannel ?? []).map((row) => [
          CHANNEL_LABELS[row.channel] ?? row.channel,
          row.conversations,
          row.customers,
        ]),
        [],
        ['Tag', 'Count', 'Share %', 'Change vs previous %'],
        ...(data?.tags ?? []).map((tag) => [tag.name, tag.count, tag.pct, tag.deltaPct]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : empty ? (
        <ReportZeroState what="conversations" />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.kpis.map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} />
            ))}
            <div
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <p className="eyebrow mb-1.5">Busiest day</p>
              <p className="text-[18px] font-medium">{data.busiestDay.day}</p>
              <p className="font-mono text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                {data.busiestDay.count} conversations
              </p>
            </div>
          </div>

          <ReportSection title="Volume over time">
            <VolumeBarChart data={data.series} label="Conversations" />
          </ReportSection>

          <ReportSection title="By channel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: 'var(--muted-foreground)' }}>
                    <th className="pb-2 font-medium">Channel</th>
                    <th className="pb-2 text-right font-medium">Conversations</th>
                    <th className="pb-2 text-right font-medium">Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byChannel.map((row) => (
                    <tr
                      key={row.channel}
                      className="border-t"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-1.5">{CHANNEL_LABELS[row.channel] ?? row.channel}</td>
                      <td className="py-1.5 text-right font-mono">{row.conversations}</td>
                      <td className="py-1.5 text-right font-mono">{row.customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportSection title="Tags">
              {data.tags.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  Nothing was tagged in this period.
                </p>
              ) : (
                <table className="w-full text-[13px]">
                  <tbody>
                    {data.tags.map((tag) => (
                      <tr
                        key={tag.name}
                        className="border-t"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="py-1.5">{tag.name}</td>
                        <td className="py-1.5 text-right font-mono">{tag.count}</td>
                        <td className="py-1.5 text-right font-mono">{tag.pct}%</td>
                        <td className="w-[70px] py-1.5 text-right">
                          <Delta pct={tag.deltaPct} goodDirection="up" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ReportSection>

            <ReportSection title="Saved replies">
              <table className="w-full text-[13px]">
                <tbody>
                  {data.savedReplies.map((reply) => (
                    <tr
                      key={reply.name}
                      className="border-t"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-1.5">{reply.name}</td>
                      <td className="py-1.5 text-right font-mono">{reply.count}</td>
                      <td className="w-[70px] py-1.5 text-right">
                        <Delta pct={reply.deltaPct} goodDirection="up" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          </div>
        </>
      )}
    </ReportShell>
  )
}

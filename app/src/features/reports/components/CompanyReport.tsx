import { useQuery } from '@tanstack/react-query'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { CompareAreaChart } from './charts'
import { KpiTile, ReportSection, ReportZeroState } from './report-primitives'

export function CompanyReport() {
  const days = useReportRange((state) => state.days)

  const report = useQuery({
    queryKey: ['report', 'company', days],
    queryFn: ({ signal }) => fetchReport('company', days, 'all', signal),
  })

  const data = report.data
  const empty = data !== undefined && data.kpis[0]?.value === 0

  return (
    <ReportShell
      title="Company"
      description="Team wide volume, and how each person's work landed."
      band="var(--warning)"
      isLoading={report.isPending}
      buildCsv={() => [
        ['Metric', 'Value', 'Change vs previous %'],
        ...(data?.kpis ?? []).map((kpi) => [kpi.label, kpi.value, kpi.deltaPct]),
        [],
        ['Agent', 'Replies', 'Customers helped', 'Happiness score', 'Ratings'],
        ...(data?.team ?? []).map((member) => [
          member.name,
          member.replies,
          member.customersHelped,
          // Blank rather than a prediction. A number nobody gave this person does not belong in
          // a performance export any more than it belongs in the table.
          member.happiness ?? '',
          member.ratingCount,
        ]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : empty ? (
        <ReportZeroState what="activity" />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {data.kpis.map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} />
            ))}
          </div>

          <ReportSection title="Conversations over time">
            <CompareAreaChart data={data.series} label="Conversations" />
          </ReportSection>

          <ReportSection title="Your team">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: 'var(--muted-foreground)' }}>
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 text-right font-medium">Replies</th>
                    <th className="pb-2 text-right font-medium">Customers helped</th>
                    <th className="pb-2 text-right font-medium">Happiness</th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.map((member) => (
                    <tr
                      key={member.userId}
                      className="border-t"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-1.5 font-medium">{member.name}</td>
                      <td className="py-1.5 text-right font-mono">{member.replies}</td>
                      <td className="py-1.5 text-right font-mono">{member.customersHelped}</td>
                      <td className="py-1.5 text-right">
                        {member.happiness === null ? (
                          <span style={{ color: 'var(--muted-foreground)' }}>No ratings yet</span>
                        ) : (
                          <>
                            <span className="font-mono">{member.happiness}</span>
                            <span
                              className="ml-1.5 font-mono text-[12px]"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              from {member.ratingCount}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FR-4.44 in one sentence, on the screen it applies to. */}
            <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Happiness here counts only ratings customers actually gave. Predicted scores never
              appear in this table.
            </p>
          </ReportSection>
        </>
      )}
    </ReportShell>
  )
}

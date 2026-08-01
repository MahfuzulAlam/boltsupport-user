import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import type { Csat } from '@/types'
import { fetchReport } from '../api/reports'
import { useReportRange } from '../hooks/use-report-range'
import { ReportShell } from './ReportShell'
import { ActualVsPredictedChart } from './charts'
import { ReportSection, ReportZeroState } from './report-primitives'

const CSATS: Csat[] = ['great', 'okay', 'notGood']
const CSAT_LABEL: Record<Csat, string> = { great: 'Great', okay: 'Okay', notGood: 'Not good' }

/**
 * Predicted against actual, for the conversations that got both.
 *
 * Without this the accuracy figure is unfalsifiable: a model that always guesses "Great" scores
 * well on a happy month, and only the off-diagonal cells show it. The diagonal is the hits.
 */
function CalibrationGrid({ grid, max }: { grid: Record<string, number>; max: number }) {
  return (
    <table className="text-[13px]">
      <thead>
        <tr>
          <th />
          <th
            colSpan={3}
            className="pb-1 text-center text-[12px] font-medium"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Actual
          </th>
        </tr>
        <tr>
          <th />
          {CSATS.map((actual) => (
            <th key={actual} className="px-2 pb-1 text-[12px] font-medium">
              {CSAT_LABEL[actual]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CSATS.map((predicted) => (
          <tr key={predicted}>
            <th
              className="pr-2 text-right text-[12px] font-medium whitespace-nowrap"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {CSAT_LABEL[predicted]}
            </th>
            {CSATS.map((actual) => {
              const count = grid[`${predicted}-${actual}`] ?? 0
              const hit = predicted === actual
              return (
                <td key={actual} className="p-0.5">
                  <span
                    className="flex size-14 items-center justify-center rounded-md font-mono"
                    style={{
                      background:
                        count === 0
                          ? 'var(--muted)'
                          : hit
                            ? `color-mix(in srgb, var(--success) ${String(
                                20 + (count / Math.max(max, 1)) * 55,
                              )}%, transparent)`
                            : `color-mix(in srgb, var(--danger) ${String(
                                15 + (count / Math.max(max, 1)) * 45,
                              )}%, transparent)`,
                    }}
                    title={`Predicted ${CSAT_LABEL[predicted]}, actually ${CSAT_LABEL[actual]}`}
                  >
                    {count}
                  </span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SatisfactionReport() {
  const days = useReportRange((state) => state.days)

  const report = useQuery({
    queryKey: ['report', 'satisfaction', days],
    queryFn: ({ signal }) => fetchReport('satisfaction', days, 'all', signal),
  })

  const data = report.data
  const max = Math.max(...Object.values(data?.calibration.grid ?? { a: 0 }))

  return (
    <ReportShell
      title="Satisfaction"
      description="Actual ratings against predicted ones, and how well the prediction holds up."
      band="var(--danger)"
      isLoading={report.isPending}
      buildCsv={() => [
        ['Metric', 'Value'],
        ['Actual happiness score', data?.actualScore ?? 0],
        ['Predicted happiness score', data?.predictedScore ?? 0],
        ['Rating coverage %', data?.coveragePct ?? 0],
        ['At risk open conversations', data?.atRisk ?? 0],
        ['Prediction accuracy %', data?.calibration.accuracyPct ?? 0],
        ['Calibration sample size', data?.calibration.sampleSize ?? 0],
        [],
        ['Date', 'Actual', 'Predicted'],
        ...(data?.series ?? []).map((point) => [point.date, point.actual, point.predicted]),
        [],
        ['Driver', 'Impact %'],
        ...(data?.drivers ?? []).map((driver) => [driver.label, driver.impactPct]),
      ]}
    >
      {report.isPending || data === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : data.coveragePct === 0 && data.atRisk === 0 ? (
        <ReportZeroState what="satisfaction data" />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <p className="eyebrow mb-1.5">Actual happiness</p>
              <p className="font-mono text-[24px] leading-none font-medium">{data.actualScore}</p>
            </div>
            <div
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--ai)', background: 'var(--ai-soft)' }}
            >
              {/* AI-5: the violet never travels without the sparkle. This tile is a model
                  output, and it has to read as one next to the actual score beside it. */}
              <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                <Sparkles className="size-3" style={{ color: 'var(--ai)' }} aria-hidden="true" />
                Predicted happiness
              </p>
              <p className="font-mono text-[24px] leading-none font-medium">
                {data.predictedScore}
              </p>
            </div>
            <div
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <p className="eyebrow mb-1.5">Rating coverage</p>
              <p className="font-mono text-[24px] leading-none font-medium">{data.coveragePct}%</p>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                actual ratings cover {data.coveragePct}% of conversations
              </p>
            </div>
            <div
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <p className="eyebrow mb-1.5">At risk, open</p>
              <p className="font-mono text-[24px] leading-none font-medium">{data.atRisk}</p>
              <Link
                to="/inbox/in1/view/v1"
                className="mt-1 inline-block text-[12px]"
                style={{ color: 'var(--brand)' }}
              >
                Open the At risk view
              </Link>
            </div>
          </div>

          <ReportSection title="Actual versus predicted">
            <ActualVsPredictedChart data={data.series} />
            <p className="mt-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Drift between the two lines is the signal. A prediction that tracks the actual score
              is worth acting on; one that does not is worth turning off.
            </p>
          </ReportSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportSection title="Calibration">
              {data.calibration.sampleSize === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  No conversation in this period has both a prediction and a real rating, so there
                  is nothing to check the prediction against yet.
                </p>
              ) : (
                <>
                  <p className="mb-1 font-mono text-[28px] leading-none font-medium">
                    {data.calibration.accuracyPct}%
                  </p>
                  <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    of {data.calibration.sampleSize} predictions matched the rating the customer
                    actually gave.
                  </p>
                  <CalibrationGrid grid={data.calibration.grid} max={max} />
                </>
              )}
            </ReportSection>

            <ReportSection title="What drives a bad rating">
              {data.drivers.map((driver) => (
                <div key={driver.label} className="mb-2.5">
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span>{driver.label}</span>
                    <span className="font-mono">{driver.impactPct}%</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${String(driver.impactPct)}%`, background: 'var(--danger)' }}
                    />
                  </div>
                </div>
              ))}
            </ReportSection>
          </div>
        </>
      )}
    </ReportShell>
  )
}

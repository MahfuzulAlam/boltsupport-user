import { Download, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/Select'
import { Toggle } from '@/components/settings-primitives'
import { RANGE_PRESETS, useReportRange } from '../hooks/use-report-range'
import { downloadCsv, toCsv } from '../lib/csv'

interface ReportShellProps {
  title: string
  description: string
  /** The band colour keys the report, so switching tabs is visible before reading the title. */
  band: string
  children: React.ReactNode
  /** Called when the export runs. Returning rows here keeps the CSV and the screen in step. */
  buildCsv: () => (string | number | null | undefined)[][]
  /** Channel tabs, only on All channels. */
  tabs?: React.ReactNode
  isLoading?: boolean
}

/**
 * The chrome every report shares.
 *
 * One place owns the range, the compare toggle, and the export, so a new report cannot ship
 * without them: FR-7.2 and FR-7.3 apply to all six, and repeating the controls per page is how
 * one of them ends up missing an export.
 */
export function ReportShell({
  title,
  description,
  band,
  children,
  buildCsv,
  tabs,
  isLoading = false,
}: ReportShellProps) {
  const { days, compare, setDays, setCompare } = useReportRange()

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 pt-6 pb-10">
      <div
        className="mb-4 overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div className="h-1.5" style={{ background: band }} aria-hidden="true" />

        <div className="flex flex-wrap items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold tracking-[-0.015em]">{title}</h1>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(days)}
              options={RANGE_PRESETS.map((preset) => ({
                value: String(preset.days),
                label: preset.label,
              }))}
              onChange={(value) => {
                setDays(Number(value))
              }}
              aria-label="Date range"
              className="w-[160px]"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast('Saved reports arrive with the settings screens')
              }}
              aria-label="Save this report"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => {
                downloadCsv(
                  `${title.toLowerCase().replace(/\s+/g, '-')}-${String(days)}d`,
                  toCsv(buildCsv()),
                )
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 border-t px-4 py-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <Toggle checked={compare} onChange={setCompare} label="Compare to previous period" />
          {tabs}
        </div>
      </div>

      {children}
    </div>
  )
}

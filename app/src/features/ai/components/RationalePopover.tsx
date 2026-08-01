import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AiRationale } from '@/types'

interface RationalePopoverProps {
  rationale: AiRationale[]
}

/**
 * The "Why?" behind a suggestion.
 *
 * A confidence number with no explanation is either ignored or trusted blindly, and both are
 * failures. Showing the weighted signals, including the ones arguing against, is what lets an
 * agent disagree for a reason rather than on instinct.
 */
export function RationalePopover({ rationale }: RationalePopoverProps) {
  if (rationale.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[12px] font-medium underline underline-offset-2"
          style={{ color: 'var(--ai)' }}
        >
          Why?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-3">
        <p className="eyebrow mb-2">Signals</p>
        <ul className="flex flex-col gap-1.5">
          {rationale.map((signal) => {
            const positive = signal.weight >= 0
            return (
              <li key={signal.signal} className="flex gap-2 text-[13px]">
                <span
                  aria-hidden="true"
                  className="w-4 shrink-0 text-center font-mono"
                  style={{ color: positive ? 'var(--success)' : 'var(--danger)' }}
                >
                  {positive ? '+' : '−'}
                </span>
                <span className="min-w-0">{signal.signal}</span>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

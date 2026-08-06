import { Pause, TriangleAlert } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import { formatDuration, slaUrgency, type SlaUrgency } from '@/lib/duration'
import type { SlaState } from '@/types'

interface SlaBadgeProps {
  sla: SlaState | undefined
  /** The conversation list needs a compact chip; the header has room for the paused wording. */
  variant?: 'compact' | 'full'
}

const URGENCY_STYLE: Record<SlaUrgency, { bg: string; fg: string }> = {
  comfortable: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  warning: { bg: 'hsl(38 92% 50% / 0.16)', fg: 'var(--warning-strong)' },
  critical: { bg: 'var(--danger-soft)', fg: 'var(--danger-strong)' },
  // Breached inverts to a solid fill: it has to be findable while scanning, not just readable.
  breached: { bg: 'var(--danger)', fg: 'hsl(0 0% 100%)' },
  paused: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
}

/**
 * The live SLA countdown, ticking client side off the deadline (FR-5.5, FR-5.6).
 *
 * The design prototypes hardcoded these strings, so this is the first place the countdown is
 * real. It subscribes to the shared clock rather than owning a timer, because a virtualized
 * folder renders dozens of these at once.
 */
export function SlaBadge({ sla, variant = 'compact' }: SlaBadgeProps) {
  const now = useNow()

  if (sla === undefined || sla.firstResponseDueAt === null) return null

  const dueAt = Date.parse(sla.firstResponseDueAt)
  const remaining = dueAt - now
  const urgency = slaUrgency(remaining, sla.paused)
  const style = URGENCY_STYLE[urgency]
  const absolute = new Date(dueAt).toLocaleString()

  if (urgency === 'paused') {
    return (
      <span
        className="inline-flex h-6 max-w-full items-center gap-1 rounded px-2 font-mono text-[12px] font-medium whitespace-nowrap"
        style={{ background: style.bg, color: style.fg }}
        title={`Paused, waiting on the customer. First reply was due ${absolute}`}
      >
        <Pause className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {variant === 'full' ? 'Paused, waiting on customer' : 'Paused'}
        </span>
      </span>
    )
  }

  const breached = urgency === 'breached'
  const elapsed = formatDuration(remaining)

  /*
   * Breached shows an icon and the time, not the word.
   *
   * It used to read "Breached 2h 23m", which needs about 110px of mono. The SLA column is 82px, so
   * the label wrapped to two lines inside a fixed 24px box and the text spilled out of the red
   * chip, top and bottom. It made the one badge that has to be scannable the one that looked
   * broken.
   *
   * The solid red fill already says breached: it is the only urgency that inverts, which is what
   * makes it findable while scanning. Spending sixty of eighty-two pixels repeating that in words
   * cost the elapsed time, which is the part somebody acts on. The word moves to the accessible
   * name so colour is never the only carrier of the state.
   */
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded px-2 font-mono text-[12px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.fg }}
      aria-label={breached ? `Breached, ${elapsed} overdue` : `First reply due in ${elapsed}`}
      title={breached ? `First reply was due ${absolute}` : `First reply due ${absolute}`}
    >
      {breached ? <TriangleAlert className="size-3 shrink-0" aria-hidden="true" /> : null}
      {elapsed}
    </span>
  )
}

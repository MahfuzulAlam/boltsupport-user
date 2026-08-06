import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import type { SentimentDirection, SentimentDrift } from '@/types'
import { AiSurface } from '@/features/ai/components/AiSurface'

const DIRECTION: Record<
  SentimentDirection,
  { label: string; icon: typeof ArrowRight; color: string; bg: string }
> = {
  declining: {
    label: 'Declining',
    icon: ArrowDownRight,
    color: 'var(--danger-strong)',
    bg: 'var(--danger-soft)',
  },
  stable: {
    label: 'Stable',
    icon: ArrowRight,
    color: 'var(--muted-foreground)',
    bg: 'var(--muted)',
  },
  improving: {
    label: 'Improving',
    icon: ArrowUpRight,
    color: 'var(--success-strong)',
    bg: 'var(--success-soft)',
  },
}

/** Minus one to plus one, mapped onto the height of the strip. */
function heightFor(sentiment: number): number {
  return Math.round(((sentiment + 1) / 2) * 100)
}

function colorFor(sentiment: number): string {
  if (sentiment <= -0.2) return 'var(--danger)'
  if (sentiment >= 0.2) return 'var(--success)'
  return 'var(--muted-foreground)'
}

function signed(value: number): string {
  return `${value > 0 ? '+' : value < 0 ? 'minus ' : ''}${Math.abs(value).toFixed(2)}`
}

/**
 * Sentiment across an account's recent tickets, not within one.
 *
 * The whole reason this is account level is that one furious ticket is not a trend and a support
 * team that treats it as one burns its escalation budget on noise. So the panel leads with the
 * direction the detector computed over two windows, and the per ticket bars underneath exist to
 * let somebody check that call rather than to be read individually.
 *
 * Direction comes from the server. Recomputing it here from whatever bars happen to be loaded is
 * how the same account ends up reading "declining" in the sidebar and "stable" on its profile.
 */
export function SentimentDriftPanel({
  drift,
  inboxId,
}: {
  drift: SentimentDrift
  /** Needed to build a conversation link. Without it the bars are not clickable. */
  inboxId?: string
}) {
  const meta = DIRECTION[drift.direction]
  const Icon = meta.icon
  const delta = drift.current - drift.previous

  // The recent window is what the direction is about, so it gets the visual separation.
  const recentFrom = Math.max(0, drift.points.length - drift.windowSize)

  return (
    <AiSurface title="Sentiment trend">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-medium"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {meta.label}
        </span>
        <span className="font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          {signed(drift.previous)} to {signed(drift.current)}
        </span>
      </div>

      <p className="mb-3 text-[13px]">
        {drift.direction === 'declining'
          ? `Mean sentiment fell ${Math.abs(delta).toFixed(2)} across the last ${String(drift.windowSize)} tickets. That is a run, not one bad conversation.`
          : drift.direction === 'improving'
            ? `Mean sentiment rose ${Math.abs(delta).toFixed(2)} across the last ${String(drift.windowSize)} tickets.`
            : `Mean sentiment is holding across the last ${String(drift.windowSize)} tickets.`}
      </p>

      <ul className="mb-1 flex h-[52px] items-end gap-1">
        {drift.points.map((point, index) => {
          const bar = (
            <span
              className="block w-full rounded-sm"
              style={{
                height: `${String(Math.max(6, heightFor(point.sentiment)))}%`,
                background: colorFor(point.sentiment),
                opacity: index >= recentFrom ? 1 : 0.35,
              }}
            />
          )
          const label = `${point.subject}, sentiment ${signed(point.sentiment)}, ${format(new Date(point.at), 'd MMM')}`

          return (
            <li key={point.conversationId} className="flex h-full flex-1 items-end">
              {inboxId === undefined ? (
                <span className="flex h-full w-full items-end" title={label} aria-label={label}>
                  {bar}
                </span>
              ) : (
                <Link
                  to={`/inbox/${inboxId}/closed/${point.conversationId}`}
                  className="flex h-full w-full items-end"
                  title={label}
                  aria-label={label}
                >
                  {bar}
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        One bar per ticket, oldest first. The solid bars are the window the direction was computed
        over. Updated {formatDistanceToNowStrict(new Date(drift.updatedAt), { addSuffix: true })}.
      </p>
    </AiSurface>
  )
}

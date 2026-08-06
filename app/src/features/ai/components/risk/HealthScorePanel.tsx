import { useState } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts'
import { ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { cn } from '@/lib/utils'
import { HEALTH_BANDS, type AccountHealth, type HealthBand, type HealthSignal } from '@/types'
import { AiSurface } from '@/features/ai/components/AiSurface'

const BAND_STYLE: Record<HealthBand, { fg: string; bg: string }> = {
  healthy: { fg: 'var(--success-strong)', bg: 'var(--success-soft)' },
  watch: { fg: 'var(--warning-strong)', bg: 'var(--warning-soft)' },
  at_risk: { fg: 'var(--danger-strong)', bg: 'var(--danger-soft)' },
}

const SIGNAL_LABEL: Record<HealthSignal['key'], string> = {
  repeat_issues: 'Repeat issues',
  resolution_drift: 'Resolution time drift',
  response_latency: 'Response latency',
  escalation_rate: 'Escalation rate',
  sentiment_trend: 'Sentiment trend',
}

const DIRECTION_ICON = { worse: TrendingUp, better: TrendingDown, flat: Minus }

/** Higher points are worse, so "worse" is the danger colour even though the arrow points up. */
const DIRECTION_COLOR = {
  worse: 'var(--danger)',
  better: 'var(--success)',
  flat: 'var(--muted-foreground)',
}

function SignalRow({ signal, max }: { signal: HealthSignal; max: number }) {
  const Icon = DIRECTION_ICON[signal.direction]
  return (
    <li className="py-2">
      {/*
       * The name gets the row to itself.
       *
       * Sharing it with the measured value truncated "Resolution time drift" to "Resolut..." in a
       * 326px rail, which loses the one word that says which signal this is. The value moves down
       * to sit with the reading it belongs to.
       */}
      <div className="flex items-center gap-2">
        <Icon
          className="size-3.5 shrink-0"
          style={{ color: DIRECTION_COLOR[signal.direction] }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-[13px] font-medium">{SIGNAL_LABEL[signal.key]}</span>
        <span className="shrink-0 font-mono text-[12px] tabular-nums">+{signal.points}</span>
      </div>

      {/* The bar is the contribution, so the breakdown reads as arithmetic rather than as ranking. */}
      <div className="mt-1 ml-[22px] h-1 rounded-full" style={{ background: 'var(--muted)' }}>
        <div
          className="h-1 rounded-full"
          style={{
            width: `${String(Math.round((signal.points / max) * 100))}%`,
            background: DIRECTION_COLOR[signal.direction],
          }}
        />
      </div>

      <p className="mt-1 ml-[22px] text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        <span className="font-mono" style={{ color: 'var(--foreground)' }}>
          {signal.value}
        </span>
        . {signal.detail}
      </p>
    </li>
  )
}

/**
 * Account health, as a score you can argue with.
 *
 * AI-4 forbids a bare score anywhere in this product, and a 0 to 100 number about somebody's
 * account is the most tempting place to break that rule. So the breakdown is not behind a "Why?"
 * popover here, it is the body of the panel: the five sub signals sum to the score, and each says
 * what it measured. The trend sits above them because the same 61 means different things depending
 * on whether it was 31 a month ago or 78.
 */
export function HealthScorePanel({ health }: { health: AccountHealth }) {
  const [open, setOpen] = useState(true)
  const band = BAND_STYLE[health.band]
  const max = Math.max(...health.signals.map((signal) => signal.points), 1)

  const first = health.trend[0]
  const previous = health.trend[health.trend.length - 2]
  const change = previous === undefined ? 0 : health.score - previous.score

  return (
    <AiSurface title="Account health">
      <div className="mb-3 flex items-end gap-3">
        <span
          className="font-mono text-[34px] leading-none font-medium tracking-[-0.02em]"
          style={{ color: band.fg }}
        >
          {health.score}
        </span>
        <span
          className="mb-1 rounded px-1.5 py-0.5 text-[12px] font-medium"
          style={{ background: band.bg, color: band.fg }}
        >
          {HEALTH_BANDS[health.band].label}
        </span>
        <span
          className="mb-1 ml-auto text-[12px]"
          title={format(new Date(health.updatedAt), 'PPpp')}
        >
          <span style={{ color: 'var(--muted-foreground)' }}>
            {change === 0
              ? 'No change'
              : `${change > 0 ? '+' : ''}${String(change)} since last reading`}
          </span>
        </span>
      </div>

      {/* No axis labels: this is a shape, not a chart to read values off. The numbers are below. */}
      <div className="mb-1 h-[56px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={health.trend} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine
              y={HEALTH_BANDS.at_risk.min}
              stroke="var(--danger)"
              strokeDasharray="2 3"
            />
            <ReferenceLine
              y={HEALTH_BANDS.watch.min}
              stroke="var(--warning)"
              strokeDasharray="2 3"
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={band.fg}
              fill={band.bg}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mb-3 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        {first === undefined
          ? null
          : `${String(health.trend.length)} readings since ${format(new Date(first.at), 'd MMM')}. Dotted lines are the Watch and At risk thresholds.`}
      </p>

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current)
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md py-1 text-[13px] font-medium hover:bg-[color:var(--hover)]"
      >
        <ChevronDown
          className={cn('size-3.5 transition-transform', open ? '' : '-rotate-90')}
          aria-hidden="true"
        />
        What is driving this
        <span
          className="ml-auto font-mono text-[12px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {health.signals.length} signals
        </span>
      </button>

      {open ? (
        <ul className="mt-1 divide-y" style={{ borderColor: 'var(--border)' }}>
          {health.signals.map((signal) => (
            <SignalRow key={signal.key} signal={signal} max={max} />
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        Updated {formatDistanceToNowStrict(new Date(health.updatedAt), { addSuffix: true })}.
        Internal only, and never shown to the customer.
      </p>
    </AiSurface>
  )
}

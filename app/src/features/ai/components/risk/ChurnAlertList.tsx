import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { ChurnAlert, ChurnRisk } from '@/types'
import { AiSurface } from '@/features/ai/components/AiSurface'

const RISK: Record<ChurnRisk, { label: string; fg: string; bg: string }> = {
  high: { label: 'High', fg: 'var(--danger-strong)', bg: 'var(--danger-soft)' },
  medium: { label: 'Medium', fg: 'var(--warning-strong)', bg: 'var(--warning-soft)' },
  low: { label: 'Low', fg: 'var(--muted-foreground)', bg: 'var(--muted)' },
}

/**
 * Silent churn alerts.
 *
 * The reason is the alert. There is deliberately no layout slot here for a score on its own,
 * because the thing this detector is for is an account going quiet, and quiet does not announce
 * itself: "3 reopened tickets on billing sync in 18 days, no reply since" tells somebody what to
 * do, and 0.84 does not. Confidence appears only after the sentence, as a qualifier on it.
 *
 * Every reason is a different length and shape by design in the fixtures, so a layout that only
 * works for one of them fails here rather than in front of a customer.
 */
export function ChurnAlertList({
  alerts,
  inboxId,
  onSetState,
  pending = false,
}: {
  alerts: ChurnAlert[]
  inboxId?: string
  onSetState: (id: string, state: ChurnAlert['state']) => void
  pending?: boolean
}) {
  const live = alerts.filter((alert) => alert.state !== 'dismissed')

  return (
    <AiSurface title="Churn risk">
      {live.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Nothing flagged. The detector is watching for reopened tickets, a drop in usage, and long
          silences after a run of activity.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {live.map((alert) => {
            const risk = RISK[alert.risk]
            return (
              <li
                key={alert.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--border)',
                  opacity: alert.state === 'acknowledged' ? 0.72 : 1,
                }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: risk.bg, color: risk.fg }}
                  >
                    {risk.label}
                  </span>
                  {alert.state === 'acknowledged' ? (
                    <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                      Acknowledged
                    </span>
                  ) : null}
                  <span
                    className="ml-auto text-[12px]"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {formatDistanceToNowStrict(new Date(alert.detectedAt), { addSuffix: true })}
                  </span>
                </div>

                {/* The sentence, at full size. Everything else on the row is subordinate to it. */}
                <p className="text-[14px] leading-[1.45]">{alert.reason}</p>

                <p className="mt-1 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  {Math.round(alert.confidence * 100)}% confidence
                  {alert.lastInboundAt === undefined
                    ? '. This customer has never written in.'
                    : `. Last heard from them ${formatDistanceToNowStrict(new Date(alert.lastInboundAt), { addSuffix: true })}.`}
                </p>

                {alert.evidence.length > 0 && inboxId !== undefined ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {alert.evidence.map((item) => (
                      <li key={item.conversationId}>
                        <Link
                          to={`/inbox/${inboxId}/closed/${item.conversationId}`}
                          className="rounded-[10px] px-2 py-0.5 text-[12px]"
                          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                        >
                          {item.subject}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-2.5 flex items-center gap-2">
                  {alert.state === 'open' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        onSetState(alert.id, 'acknowledged')
                      }}
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      onSetState(alert.id, 'dismissed')
                    }}
                  >
                    Not a risk
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AiSurface>
  )
}

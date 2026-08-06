import { ArrowUpRight, Sparkles, TriangleAlert, X } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ProvenanceRail } from '@/components/ProvenanceRail'
import type { RefundThreat } from '@/types'

/**
 * A refund threat, on this conversation, right now.
 *
 * Unlike the three account level detectors this one interrupts. It sits in the thread above the
 * messages rather than in the sidebar, because the cost of noticing it an hour later is the refund,
 * and a badge in a panel is something an agent learns to read past.
 *
 * Two rules pull in opposite directions here and both have to hold. AI-5 reserves the violet rail
 * for AI output, so the rail stays violet: this is a model's finding and it must be legible as one.
 * The urgency lives inside the block instead, in the danger toned icon, heading, and action. Making
 * the rail red would buy one banner some attention at the cost of the only device that tells an
 * agent whether text came from a person or a model.
 *
 * The phrase is the customer's own words, so it renders as quoted plain text. It is untrusted
 * content and never markup, and never anything the model is asked to follow.
 */
export function RefundThreatBanner({
  threat,
  onEscalate,
  onDismiss,
  pending = false,
}: {
  threat: RefundThreat
  onEscalate: () => void
  onDismiss: () => void
  pending?: boolean
}) {
  // Dismissed stays down. Escalated stays up, quieter, so nobody escalates the same thing twice.
  if (threat.state === 'dismissed') return null

  const escalated = threat.state === 'escalated'

  return (
    <section
      data-ai-generated="true"
      data-internal="true"
      role="alert"
      aria-label="Refund threat detected"
      className="mx-[18px] mt-3 flex overflow-hidden rounded-lg border"
      style={{
        borderColor: escalated ? 'var(--border)' : 'var(--danger)',
        background: escalated ? 'var(--card)' : 'var(--danger-soft)',
      }}
    >
      <ProvenanceRail provenance="ai" flush />

      <div className="min-w-0 flex-1 p-3.5">
        <header className="mb-1.5 flex items-center gap-2">
          <TriangleAlert
            className="size-4 shrink-0"
            style={{ color: escalated ? 'var(--muted-foreground)' : 'var(--danger-strong)' }}
            aria-hidden="true"
          />
          <h3
            className="text-[15px] font-semibold"
            style={{ color: escalated ? 'var(--foreground)' : 'var(--danger-strong)' }}
          >
            {escalated ? 'Refund threat, escalated' : 'Refund threat'}
          </h3>

          <span
            className="ml-auto flex items-center gap-1 text-[12px]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Sparkles className="size-3" style={{ color: 'var(--ai)' }} aria-hidden="true" />
            {Math.round(threat.confidence * 100)}% confidence
          </span>
        </header>

        {/* Why it fired, in the customer's words. This is the whole justification for interrupting. */}
        <blockquote
          className="mb-2 border-l-2 pl-2.5 text-[14px] leading-[1.5] italic"
          style={{ borderColor: 'var(--danger)' }}
        >
          {threat.phrase}
        </blockquote>

        <p className="mb-2.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Detected {formatDistanceToNowStrict(new Date(threat.detectedAt), { addSuffix: true })} in
          this conversation. Nothing has been sent to the customer.
        </p>

        {escalated ? (
          <p className="text-[13px]">A lead has this. Carry on replying as normal.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={pending} onClick={onEscalate}>
              <ArrowUpRight className="size-3.5" />
              Escalate to a lead
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={onDismiss}>
              <X className="size-3.5" />
              Not a threat
            </Button>
            <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              Dismissing is recorded, so the detector learns what you do not want flagged.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

import type { Sentiment } from '@/types'
import type { PartialSummary } from '../hooks/use-ai-summary'

interface AiSummaryContentProps {
  summary: PartialSummary
  /** Shows the caret while more is still arriving. */
  streaming?: boolean
}

const SENTIMENT_STYLE: Record<Sentiment, { label: string; bg: string; fg: string }> = {
  positive: { label: 'Positive', bg: 'var(--success-soft)', fg: 'var(--success-strong)' },
  neutral: { label: 'Neutral', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  frustrated: { label: 'Frustrated', bg: 'var(--danger-soft)', fg: 'var(--danger-strong)' },
  angry: { label: 'Angry', bg: 'var(--danger)', fg: 'hsl(0 0% 100%)' },
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (value === undefined || value === '') return null
  return (
    <div
      className="grid grid-cols-[104px_1fr] gap-2.5 border-t py-1.5 text-[14px]"
      style={{ borderColor: 'var(--border)' }}
    >
      <dt style={{ color: 'var(--muted-foreground)' }}>{label}</dt>
      <dd className="text-pretty">{value}</dd>
    </div>
  )
}

/**
 * Structured output, not a wall of text (FR-4.2).
 *
 * The shape is the point: an agent scanning "Blocked on" gets the one fact they need without
 * reading a paragraph, which is what makes the summary faster than the thread it replaces.
 */
export function AiSummaryContent({ summary, streaming = false }: AiSummaryContentProps) {
  return (
    <div>
      <ul className="list-disc pl-4 text-[14px] leading-[1.6]">
        {summary.tldr.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <dl className="mt-1">
        <Row label="Customer wants" value={summary.customerWants} />
        <Row label="Already tried" value={summary.alreadyTried} />
        <Row label="Blocked on" value={summary.blockedOn} />
        <Row label="Next step" value={summary.suggestedNextStep} />
      </dl>

      {summary.sentiment !== undefined ? (
        <div className="mt-2.5 flex items-center gap-2">
          <span
            className="flex h-[22px] items-center rounded px-2 text-[12px] font-semibold"
            style={{
              background: SENTIMENT_STYLE[summary.sentiment].bg,
              color: SENTIMENT_STYLE[summary.sentiment].fg,
            }}
          >
            {SENTIMENT_STYLE[summary.sentiment].label}
          </span>
        </div>
      ) : null}

      {streaming ? (
        <span
          aria-hidden="true"
          className="mt-1 inline-block h-[17px] w-2 align-[-3px]"
          style={{ background: 'var(--ai)', animation: 'shimmer 0.9s steps(2) infinite' }}
        />
      ) : null}
    </div>
  )
}

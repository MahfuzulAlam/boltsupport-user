import { X } from 'lucide-react'
import type { EvalCriterion, EvalVerdict } from '@/types'

export interface CheckResult {
  score: number
  criteria: { key: EvalCriterion; verdict: EvalVerdict; note: string }[]
  unansweredQuestion?: string
  rationale: string
}

interface CheckReplyPanelProps {
  result: CheckResult
  onDismiss: () => void
}

const CRITERION_LABEL: Record<EvalCriterion, string> = {
  accuracy: 'Accuracy',
  completeness: 'Completeness',
  tone: 'Tone match',
  clarity: 'Clarity',
  policy: 'Policy compliance',
}

const VERDICT_COLOR: Record<EvalVerdict, string> = {
  pass: 'var(--success-strong)',
  warn: 'var(--warning)',
  fail: 'var(--danger-strong)',
}

function verdictOf(score: number): string {
  if (score >= 85) return 'Looks good'
  if (score >= 60) return 'Needs review'
  return 'Risky'
}

/**
 * The pre-send check (FR-4.32).
 *
 * Advisory by construction: this panel has no way to disable Send, and says so out loud
 * (FR-4.33). An evaluation that can block is a gate, and a gate turns a coaching tool into
 * something agents route around.
 *
 * The unanswered-question callout sits above the score because it is the highest value catch in
 * the feature (FR-4.35) and a number is easy to skim past.
 */
export function CheckReplyPanel({ result, onDismiss }: CheckReplyPanelProps) {
  const circumference = 2 * Math.PI * 19
  const filled = (result.score / 100) * circumference

  return (
    <div
      className="mt-2 rounded-md border p-3"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      aria-label="Reply check"
    >
      <div className="flex items-start gap-3">
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true" className="shrink-0">
          <circle cx="23" cy="23" r="19" fill="none" stroke="var(--muted)" strokeWidth="5" />
          <circle
            cx="23"
            cy="23"
            r="19"
            fill="none"
            stroke={result.score >= 85 ? 'var(--success)' : 'var(--warning)'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${String(filled)} ${String(circumference)}`}
            transform="rotate(-90 23 23)"
          />
          <text
            x="23"
            y="28"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="14"
            fill="currentColor"
          >
            {result.score}
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{verdictOf(result.score)}</p>
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Advisory only. Send is never blocked by a check.
          </p>
        </div>

        <button
          type="button"
          aria-label="Dismiss the reply check"
          onClick={onDismiss}
          className="flex size-6 items-center justify-center rounded"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {result.unansweredQuestion !== undefined ? (
        <div
          className="mt-3 rounded-md px-2.5 py-2"
          style={{ background: 'var(--note)', border: '1px solid var(--warning)' }}
        >
          <p className="text-[13px] font-semibold">One question is unanswered</p>
          <p
            className="mt-1 pl-2.5 text-[13px]"
            style={{ borderLeft: '2px solid var(--warning)', color: 'var(--muted-foreground)' }}
          >
            “{result.unansweredQuestion}”
          </p>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1.5">
        {result.criteria.map((criterion) => (
          <li key={criterion.key} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden="true"
              className="size-[9px] shrink-0 rounded-full"
              style={{ background: VERDICT_COLOR[criterion.verdict] }}
            />
            <span className="w-[118px] shrink-0 font-medium">{CRITERION_LABEL[criterion.key]}</span>
            <span className="min-w-0 truncate" style={{ color: 'var(--muted-foreground)' }}>
              {criterion.note}
            </span>
            <span className="sr-only">{criterion.verdict}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

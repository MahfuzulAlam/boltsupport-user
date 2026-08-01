import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { apiRequest } from '@/lib/api-client'
import { evaluationSchema, type EvalCriterion } from '@/types'

const CRITERION_LABEL: Record<EvalCriterion, string> = {
  accuracy: 'Accuracy',
  completeness: 'Completeness',
  tone: 'Tone match',
  clarity: 'Clarity',
  policy: 'Policy compliance',
}

function Tile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </p>
      <p className="font-mono text-[26px] leading-tight font-medium tracking-[-0.02em]">{value}</p>
      <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        {caption}
      </p>
    </div>
  )
}

/**
 * The QA dashboard (FR-4.36).
 *
 * The coaching notice is a visible banner rather than fine print (FR-4.38). Whether agents use
 * this feature or resent it turns entirely on believing it is not being used to rank them, so
 * the intent is stated where it cannot be missed.
 */
export function EvaluationPage() {
  const evaluations = useQuery({
    queryKey: ['evaluations'],
    queryFn: ({ signal }) =>
      apiRequest('/evaluations', z.array(evaluationSchema), { ...(signal ? { signal } : {}) }),
  })

  const rows = evaluations.data ?? []
  const average =
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
  const unanswered = rows.filter((row) => row.unansweredQuestion !== undefined).length
  const accuracyWarnings = rows.filter((row) =>
    row.criteria.some((c) => c.key === 'accuracy' && c.verdict !== 'pass'),
  ).length

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-10">
      <PageHeader
        title="Response evaluation"
        description="Sampled replies scored on five criteria, for coaching."
      />

      <div
        role="note"
        className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-[13px]"
        style={{ borderColor: 'var(--info)', background: 'hsl(199 89% 48% / 0.08)' }}
      >
        <Info className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--info)' }} />
        <span>
          <span className="font-medium">
            Quality scores are guidance for coaching, not performance management.
          </span>{' '}
          Review with the agent before acting.
        </span>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <Tile
          label="Average quality score"
          value={String(average)}
          caption="across sampled replies"
        />
        <Tile label="Replies evaluated" value={String(rows.length)} caption="this period" />
        <Tile
          label="Accuracy warnings"
          value={String(accuracyWarnings)}
          caption="claims to check"
        />
        <Tile
          label="Unanswered question rate"
          value={
            rows.length === 0 ? '0%' : `${String(Math.round((unanswered / rows.length) * 100))}%`
          }
          caption="the highest value catch"
        />
      </div>

      <h2 className="mb-2 text-[16px] font-semibold tracking-[-0.01em]">Sampled replies</h2>
      {evaluations.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Nothing has been sampled for this period yet.
        </p>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                <th className="px-3 py-2 text-left font-medium">Conversation</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-left font-medium">Flagged</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((row) => {
                const flagged = row.criteria.filter((c) => c.verdict !== 'pass')
                return (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2 font-mono">{row.conversationId}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.score}</td>
                    <td className="px-3 py-2">
                      {flagged.length === 0 ? (
                        <span style={{ color: 'var(--muted-foreground)' }}>None</span>
                      ) : (
                        flagged.map((c) => CRITERION_LABEL[c.key]).join(', ')
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

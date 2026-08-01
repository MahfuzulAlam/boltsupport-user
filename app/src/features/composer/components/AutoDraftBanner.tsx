import { BookOpen, Sparkles, TriangleAlert } from 'lucide-react'
import type { AiSource } from '@/types'

interface AutoDraftBannerProps {
  lowConfidence: boolean
  injectionDetected: boolean
  sources: AiSource[]
  canAcceptInOneClick: boolean
  onAccept: () => void
  onRegenerate: () => void
  onDiscard: () => void
}

/**
 * The review state around a generated draft.
 *
 * Two pieces of copy here are safety features rather than decoration:
 *
 *  - **"No knowledge sources matched"** (FR-4.15). An unsourced draft looks exactly as
 *    confident as a sourced one, and a confident wrong answer is the most damaging thing this
 *    feature can produce. Saying so is the cheapest possible guard.
 *  - **The low confidence variant** (FR-4.16) turns amber and withholds one click Accept, so
 *    the agent has to read and edit rather than wave it through.
 */
export function AutoDraftBanner({
  lowConfidence,
  injectionDetected,
  sources,
  canAcceptInOneClick,
  onAccept,
  onRegenerate,
  onDiscard,
}: AutoDraftBannerProps) {
  return (
    <div className="mt-2">
      <div
        className="flex flex-wrap items-center gap-2 rounded-md px-2.5 py-2 text-[13px]"
        style={
          lowConfidence
            ? { border: '1px solid var(--warning)', background: 'var(--note)' }
            : { border: '1px solid var(--ai)', background: 'var(--ai-soft)' }
        }
      >
        {lowConfidence ? (
          <TriangleAlert className="size-4 shrink-0" style={{ color: 'var(--warning-strong)' }} />
        ) : (
          <Sparkles className="size-4 shrink-0" style={{ color: 'var(--ai)' }} />
        )}
        <span
          className="flex-1 font-medium"
          style={{ color: lowConfidence ? 'var(--foreground)' : 'var(--ai)' }}
        >
          {lowConfidence
            ? 'Low confidence. This needs a careful human review.'
            : 'AI draft. Review and edit before sending.'}
        </span>
        {lowConfidence ? (
          <span style={{ color: 'var(--muted-foreground)' }}>One click accept is off</span>
        ) : null}
        {injectionDetected ? (
          <span className="w-full text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
            Suspicious instructions in the customer message were ignored.
          </span>
        ) : null}
      </div>

      {sources.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
            Sources
          </span>
          {sources.map((source) => (
            <span
              key={source.id}
              className="flex h-[26px] items-center gap-1.5 rounded-[13px] border px-2.5 text-[12px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <BookOpen className="size-3" aria-hidden="true" />
              {source.title}
            </span>
          ))}
        </div>
      ) : (
        <div
          role="note"
          className="mt-2 rounded-md px-2.5 py-2 text-[13px]"
          style={{ border: '1px solid var(--warning)', background: 'var(--note)' }}
        >
          No knowledge sources matched. Verify any claims before sending.
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={!canAcceptInOneClick}
          title={canAcceptInOneClick ? undefined : 'Edit the draft first, low confidence'}
          className="h-[30px] rounded-md px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Accept draft
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="h-[30px] rounded-md border px-3 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="ml-auto h-[30px] rounded-md px-3 text-[13px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Discard
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import { RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { Conversation } from '@/types'
import { AiSurface } from './AiSurface'
import { AiSummaryContent } from './AiSummaryContent'
import { useAiSummary } from '../hooks/use-ai-summary'

interface AiSummaryPanelProps {
  conversation: Conversation
  aiEnabled: boolean
  messageCount: number
}

/**
 * Pinned at the top of the rail, the first thing an agent sees (FR-4.1).
 *
 * A stale summary stays visible and dimmed rather than disappearing (FR-4.6), because a summary
 * that is four messages out of date still beats reading twenty messages from scratch.
 */
export function AiSummaryPanel({ conversation, aiEnabled, messageCount }: AiSummaryPanelProps) {
  const { summary, partial, status, isLoading, isStale, generate } = useAiSummary({
    conversation,
    enabled: aiEnabled,
  })

  // Auto generate on open once a thread is long enough to be worth summarising (FR-4.3).
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current) return
    if (!aiEnabled || isLoading) return
    if (summary === null && messageCount > 4) {
      autoStarted.current = true
      void generate()
    }
  }, [aiEnabled, isLoading, summary, messageCount, generate])

  if (status === 'unavailable') {
    return (
      <AiSurface title="AI summary">
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          AI features are turned off for this workspace. Everything else on this screen works as
          usual.
        </p>
        <Link
          to="/ai"
          className="mt-2 inline-block text-[13px] font-medium"
          style={{ color: 'var(--brand)' }}
        >
          Open AI settings
        </Link>
      </AiSurface>
    )
  }

  const regenerate = (
    <button
      type="button"
      aria-label="Regenerate summary"
      title="Regenerate summary"
      onClick={() => void generate()}
      className="flex size-[26px] items-center justify-center rounded-md hover:bg-[color:var(--ai-soft)]"
      style={{ color: 'var(--muted-foreground)' }}
    >
      <RefreshCw className={status === 'generating' ? 'size-3.5 animate-spin' : 'size-3.5'} />
    </button>
  )

  if (status === 'generating' && partial !== null) {
    return (
      <AiSurface title="AI summary" actions={regenerate}>
        {partial.tldr.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[92, 78, 86, 44].map((width) => (
              <Skeleton key={width} className="h-3.5" style={{ width: `${String(width)}%` }} />
            ))}
          </div>
        ) : (
          <AiSummaryContent summary={partial} streaming />
        )}
      </AiSurface>
    )
  }

  if (status === 'error') {
    return (
      <AiSurface title="AI summary" actions={regenerate}>
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          The summary could not be generated. The rest of this screen is unaffected.
        </p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => void generate()}>
          Try again
        </Button>
      </AiSurface>
    )
  }

  if (summary === null) {
    return (
      <AiSurface title="AI summary">
        <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {messageCount > 1
            ? 'Get the facts of this thread without reading every message.'
            : 'There is not much to summarise yet.'}
        </p>
        <Button size="sm" onClick={() => void generate()}>
          <Sparkles className="size-4" />
          Summarize this thread
        </Button>
      </AiSurface>
    )
  }

  return (
    <AiSurface title="AI summary" actions={regenerate}>
      {isStale ? (
        <div
          className="mb-2.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]"
          style={{ background: 'var(--note)', border: '1px solid var(--warning)' }}
        >
          <span className="flex-1">New messages since this summary</span>
          <button
            type="button"
            onClick={() => void generate()}
            className="h-6 font-medium"
            style={{ color: 'var(--brand)' }}
          >
            Refresh
          </button>
        </div>
      ) : null}

      {/* Dimmed rather than hidden: out of date still beats nothing. */}
      <div style={{ opacity: isStale ? 0.62 : 1 }}>
        <AiSummaryContent summary={summary} />
      </div>

      <p className="mt-2 font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        Generated {formatDistanceToNowStrict(new Date(summary.generatedAt), { addSuffix: true })}
      </p>

      {summary.injectionDetected ? (
        <p
          className="mt-1.5 flex items-start gap-1.5 text-[12px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Instructions found inside customer content were ignored.
        </p>
      ) : null}
    </AiSurface>
  )
}

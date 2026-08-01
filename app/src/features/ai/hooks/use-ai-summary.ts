import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { aiSummarySchema, type AiSummary, type Conversation, type Sentiment } from '@/types'
import { ApiError, apiRequest } from '@/lib/api-client'

export type SummaryStatus = 'idle' | 'generating' | 'ready' | 'error' | 'unavailable'

/** A summary mid-stream. Every field is optional because they arrive one at a time. */
export interface PartialSummary {
  tldr: string[]
  customerWants?: string
  alreadyTried?: string
  blockedOn?: string
  suggestedNextStep?: string
  sentiment?: Sentiment
}

function summaryQueryKey(conversationId: string) {
  return ['ai', 'summary', conversationId] as const
}

async function fetchSummary(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AiSummary | null> {
  try {
    return await apiRequest(`/ai/summaries/${conversationId}`, aiSummarySchema, {
      ...(signal ? { signal } : {}),
    })
  } catch (error) {
    // No summary yet is a normal state, not a failure.
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

interface UseAiSummaryOptions {
  conversation: Conversation | undefined
  /** When the workspace kill switch is off, everything here reports unavailable (AI-11). */
  enabled: boolean
}

/**
 * The AI summary panel's brain.
 *
 * Two things here are load bearing:
 *
 *  - **Staleness is derived, never polled** (FR-4.5). Comparing the conversation's
 *    `lastMessageId` against the summary's `sourceLastMessageId` means a new message flips the
 *    flag straight from cache, with no request and no timer.
 *  - **Regenerate is cancellable and idempotent.** A second click aborts the first stream with
 *    an AbortController before starting another, so two streams can never write to the same
 *    state and leave an interleaved summary behind.
 */
export function useAiSummary({ conversation, enabled }: UseAiSummaryOptions) {
  const queryClient = useQueryClient()
  const conversationId = conversation?.id ?? ''
  const [partial, setPartial] = useState<PartialSummary | null>(null)
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const stored = useQuery({
    queryKey: summaryQueryKey(conversationId),
    queryFn: ({ signal }) => fetchSummary(conversationId, signal),
    enabled: enabled && conversationId !== '',
    staleTime: Number.POSITIVE_INFINITY,
  })

  const summary = stored.data ?? null

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const generate = useCallback(async () => {
    if (!enabled || conversationId === '') return

    // Abort anything in flight before starting. This is what makes a double click safe.
    cancel()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('generating')
    setPartial({ tldr: [] })

    try {
      const response = await fetch(`/api/ai/summaries/${conversationId}`, {
        method: 'POST',
        signal: controller.signal,
      })
      if (!response.ok || response.body === null) throw new Error('stream failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const draft: PartialSummary = { tldr: [] }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.trim() === '') continue
          const chunk = JSON.parse(line) as { field: string; value: string }
          if (chunk.field === 'tldr') draft.tldr = [...draft.tldr, chunk.value]
          else if (chunk.field === 'sentiment') draft.sentiment = chunk.value as Sentiment
          else Object.assign(draft, { [chunk.field]: chunk.value })
          setPartial({ ...draft, tldr: [...draft.tldr] })
        }
      }

      if (controller.signal.aborted) return

      const completed: AiSummary = {
        id: `sum-${conversationId}`,
        conversationId,
        tldr: draft.tldr,
        customerWants: draft.customerWants ?? '',
        alreadyTried: draft.alreadyTried ?? '',
        blockedOn: draft.blockedOn ?? '',
        suggestedNextStep: draft.suggestedNextStep ?? '',
        sentiment: draft.sentiment ?? 'neutral',
        messageCount: 0,
        sourceLastMessageId: conversation?.lastMessageId ?? '',
        generatedAt: new Date().toISOString(),
        model: 'support-summary-v2',
        injectionDetected: summary?.injectionDetected ?? false,
      }

      queryClient.setQueryData(summaryQueryKey(conversationId), completed)
      setPartial(null)
      setStatus('ready')
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return
      }
      setStatus('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [cancel, conversationId, conversation?.lastMessageId, enabled, queryClient, summary])

  // A stream in flight must not outlive the panel.
  useEffect(() => cancel, [cancel])

  const isStale =
    summary !== null &&
    conversation !== undefined &&
    summary.sourceLastMessageId !== conversation.lastMessageId

  const resolvedStatus: SummaryStatus = !enabled
    ? 'unavailable'
    : status === 'generating'
      ? 'generating'
      : stored.isError
        ? 'error'
        : summary !== null
          ? 'ready'
          : status === 'error'
            ? 'error'
            : 'idle'

  return {
    summary,
    partial,
    status: resolvedStatus,
    isLoading: stored.isPending && enabled,
    isStale,
    generate,
    cancel,
  }
}

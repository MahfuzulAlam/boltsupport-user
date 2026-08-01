import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { getDb } from '@/mocks/db'
import type { Conversation } from '@/types'
import { useAiSummary } from './use-ai-summary'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function conversationFixture(overrides: Partial<Conversation> = {}): Conversation {
  const base = getDb().conversations.find((c) => c.id === 'c1')
  if (base === undefined) throw new Error('seed missing c1')
  return { ...base, ...overrides }
}

describe('summary staleness', () => {
  it('is derived from the message ids, with no extra request', async () => {
    const summary = getDb().summaries[0]
    if (summary === undefined) throw new Error('seed missing a summary')

    // The seeded summary was generated from an earlier message than the conversation now has.
    const conversation = conversationFixture({ lastMessageId: 'a-newer-message' })
    const { result } = renderHook(() => useAiSummary({ conversation, enabled: true }), { wrapper })

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull()
    })
    expect(result.current.isStale).toBe(true)
  })

  it('is not stale when the summary covers the latest message', async () => {
    const summary = getDb().summaries[0]
    if (summary === undefined) throw new Error('seed missing a summary')

    const conversation = conversationFixture({ lastMessageId: summary.sourceLastMessageId })
    const { result } = renderHook(() => useAiSummary({ conversation, enabled: true }), { wrapper })

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull()
    })
    expect(result.current.isStale).toBe(false)
  })

  it('flips to stale from cache alone when a new message arrives', async () => {
    const summary = getDb().summaries[0]
    if (summary === undefined) throw new Error('seed missing a summary')

    let requests = 0
    server.events.on('request:start', () => {
      requests += 1
    })

    const { result, rerender } = renderHook(
      ({ conversation }: { conversation: Conversation }) =>
        useAiSummary({ conversation, enabled: true }),
      {
        wrapper,
        initialProps: {
          conversation: conversationFixture({ lastMessageId: summary.sourceLastMessageId }),
        },
      },
    )

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull()
    })
    expect(result.current.isStale).toBe(false)
    const afterLoad = requests

    // A new message lands. FR-4.5: staleness must follow without polling or refetching.
    rerender({ conversation: conversationFixture({ lastMessageId: 'brand-new-message' }) })

    expect(result.current.isStale).toBe(true)
    expect(requests).toBe(afterLoad)
  })
})

describe('regenerating', () => {
  it('streams the summary in progressively', async () => {
    const conversation = conversationFixture()
    const { result } = renderHook(() => useAiSummary({ conversation, enabled: true }), { wrapper })

    await act(async () => {
      await result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.summary?.tldr.length).toBeGreaterThan(0)
    expect(result.current.summary?.customerWants).not.toBe('')
  })

  it('aborts the first stream when a second starts, so they cannot interleave', async () => {
    let opened = 0
    let aborted = 0
    server.use(
      http.post('/api/ai/summaries/:id', ({ request }) => {
        opened += 1
        request.signal.addEventListener('abort', () => {
          aborted += 1
        })
        const encoder = new TextEncoder()
        return new HttpResponse(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(`${JSON.stringify({ field: 'tldr', value: 'first' })}\n`),
              )
              // Deliberately left open so the second call has something to abort.
            },
          }),
          { headers: { 'Content-Type': 'application/x-ndjson' } },
        )
      }),
    )

    const conversation = conversationFixture()
    const { result } = renderHook(() => useAiSummary({ conversation, enabled: true }), { wrapper })

    act(() => {
      void result.current.generate()
    })
    await waitFor(() => {
      expect(opened).toBe(1)
    })

    act(() => {
      void result.current.generate()
    })

    await waitFor(() => {
      expect(aborted).toBeGreaterThanOrEqual(1)
    })
    expect(opened).toBe(2)
  })
})

describe('the workspace kill switch', () => {
  it('reports unavailable rather than erroring when AI is off', () => {
    const conversation = conversationFixture()
    const { result } = renderHook(() => useAiSummary({ conversation, enabled: false }), { wrapper })

    // AI-11: off produces a calm disabled state, never an error.
    expect(result.current.status).toBe('unavailable')
    expect(result.current.summary).toBeNull()
  })

  it('makes no request at all while disabled', async () => {
    let summaryRequests = 0
    server.use(
      http.get('/api/ai/summaries/:id', () => {
        summaryRequests += 1
        return new HttpResponse(null, { status: 404 })
      }),
    )

    const conversation = conversationFixture()
    renderHook(() => useAiSummary({ conversation, enabled: false }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(summaryRequests).toBe(0)
  })
})

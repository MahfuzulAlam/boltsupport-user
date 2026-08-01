import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { UNDO_WINDOW_MS, useSendMessage } from './use-send-message'
import type { SendPayload } from './use-send-message'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const payload: SendPayload = {
  conversationId: 'c1',
  mode: 'reply',
  bodyHtml: '<p>Ready to go</p>',
  attachments: [],
}

let posted: unknown[] = []

beforeEach(() => {
  posted = []
  server.use(
    http.post('/api/conversations/:id/messages', async ({ request }) => {
      posted.push(await request.json())
      return HttpResponse.json(
        {
          id: 'm-new',
          conversationId: 'c1',
          type: 'reply',
          author: { id: 'u1', name: 'Sam Oyelaran' },
          bodyHtml: '<p>Ready to go</p>',
          createdAt: new Date().toISOString(),
        },
        { status: 201 },
      )
    }),
  )
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  const onRestoreDraft = vi.fn()
  const onSent = vi.fn()
  const hook = renderHook(() => useSendMessage({ onRestoreDraft, onSent }), { wrapper })
  return { ...hook, onRestoreDraft, onSent }
}

describe('undo send', () => {
  it('holds the message for the undo window instead of sending immediately', async () => {
    const { result, onSent } = setup()

    act(() => {
      result.current.send(payload)
    })

    // The UI already says sent, but nothing has left the building. That is what makes Undo a
    // cancellation rather than an apology (FR-3.6).
    expect(onSent).toHaveBeenCalledOnce()
    expect(posted).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 200)
    })

    await waitFor(() => {
      expect(posted).toHaveLength(1)
    })
  })

  it('cancels the send outright when undone, and gives the draft back', async () => {
    const { result, onRestoreDraft } = setup()

    act(() => {
      result.current.send(payload)
    })
    act(() => {
      expect(result.current.undoLast()).toBe(true)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2)
    })

    expect(posted).toHaveLength(0)
    expect(onRestoreDraft).toHaveBeenCalledWith(payload)
  })

  it('reports that there was nothing to undo once the window has closed', async () => {
    const { result } = setup()

    act(() => {
      result.current.send(payload)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 200)
    })

    act(() => {
      expect(result.current.undoLast()).toBe(false)
    })
  })

  it('commits a held message before sending the next, so ordering never surprises', async () => {
    const { result } = setup()

    act(() => {
      result.current.send(payload)
    })
    act(() => {
      result.current.send({ ...payload, bodyHtml: '<p>Second</p>' })
    })

    // The first is flushed straight away rather than waiting out its window behind the second.
    await waitFor(() => {
      expect(posted).toHaveLength(1)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 200)
    })
    await waitFor(() => {
      expect(posted).toHaveLength(2)
    })
  })

  it('commits rather than drops a held message when the composer unmounts', async () => {
    const { result, unmount } = setup()

    act(() => {
      result.current.send(payload)
    })
    unmount()

    // Navigating away must not silently discard a message the agent believes they sent.
    await waitFor(() => {
      expect(posted).toHaveLength(1)
    })
  })

  it('gives the draft back when the send itself fails', async () => {
    server.use(
      http.post('/api/conversations/:id/messages', () => new HttpResponse(null, { status: 500 })),
    )
    const { result, onRestoreDraft } = setup()

    act(() => {
      result.current.send(payload)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 200)
    })

    await waitFor(() => {
      expect(onRestoreDraft).toHaveBeenCalledWith(payload)
    })
  })
})

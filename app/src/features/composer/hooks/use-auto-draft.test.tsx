import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { DEFAULT_DRAFT_OPTIONS, useAutoDraft } from './use-auto-draft'

function setup(threshold = 0.6) {
  const onStream = vi.fn()
  const onDiscard = vi.fn()
  const hook = renderHook(() =>
    useAutoDraft({
      conversationId: 'c1',
      lowConfidenceThreshold: threshold,
      onStream,
      onDiscard,
    }),
  )
  return { ...hook, onStream, onDiscard }
}

describe('Auto Draft', () => {
  it('never sends: no request touches the messages endpoint', async () => {
    const sends: string[] = []
    server.use(
      http.post('/api/conversations/:id/messages', ({ request }) => {
        sends.push(request.url)
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    const { result } = setup()
    await act(async () => {
      await result.current.generate(DEFAULT_DRAFT_OPTIONS, '')
    })
    await waitFor(() => {
      expect(result.current.state).toBe('review')
    })
    act(() => {
      result.current.accept()
    })

    // AI-1: generating and even accepting a draft puts text in the composer and nothing else.
    // There is no code path from this hook to a send.
    expect(sends).toEqual([])
  })

  it('streams the body in progressively', async () => {
    const { result, onStream } = setup()

    await act(async () => {
      await result.current.generate(DEFAULT_DRAFT_OPTIONS, '')
    })

    await waitFor(() => {
      expect(result.current.state).toBe('review')
    })
    // Many partial updates, each longer than the last, rather than one final assignment.
    expect(onStream.mock.calls.length).toBeGreaterThan(5)
    expect(result.current.result?.text.length).toBeGreaterThan(50)
  })

  it('cites its sources when the knowledge base was used', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.generate({ ...DEFAULT_DRAFT_OPTIONS, useKnowledgeBase: true }, '')
    })

    await waitFor(() => {
      expect(result.current.result).not.toBeNull()
    })
    expect(result.current.result?.sources.length).toBeGreaterThan(0)
    expect(result.current.isLowConfidence).toBe(false)
    expect(result.current.canAcceptInOneClick).toBe(true)
  })

  it('returns no sources and low confidence when the knowledge base is off', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.generate({ ...DEFAULT_DRAFT_OPTIONS, useKnowledgeBase: false }, '')
    })

    await waitFor(() => {
      expect(result.current.result).not.toBeNull()
    })
    // FR-4.15 and FR-4.16 together: nothing to check the claims against, so say so and withhold
    // the one click accept.
    expect(result.current.result?.sources).toEqual([])
    expect(result.current.isLowConfidence).toBe(true)
    expect(result.current.canAcceptInOneClick).toBe(false)
  })

  it('reports an injection attempt found in the thread rather than hiding it', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.generate(DEFAULT_DRAFT_OPTIONS, '')
    })

    await waitFor(() => {
      expect(result.current.result).not.toBeNull()
    })
    // Conversation c1 genuinely contains an injection attempt, so AI-3 has something to report.
    expect(result.current.result?.injectionDetected).toBe(true)
  })

  it('flags an untouched draft, without blocking it', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.generate(DEFAULT_DRAFT_OPTIONS, '')
    })
    await waitFor(() => {
      expect(result.current.state).toBe('review')
    })

    expect(result.current.isUnedited).toBe(true)

    act(() => {
      result.current.markEdited()
    })
    // FR-4.17 makes this a notice, never a gate.
    expect(result.current.isUnedited).toBe(false)
  })

  it('restores the previous draft when discarded', async () => {
    const { result, onDiscard } = setup()

    await act(async () => {
      await result.current.generate(DEFAULT_DRAFT_OPTIONS, '<p>my own words</p>')
    })
    await waitFor(() => {
      expect(result.current.state).toBe('review')
    })

    act(() => {
      result.current.discard()
    })

    expect(onDiscard).toHaveBeenCalledWith('<p>my own words</p>')
    expect(result.current.state).toBe('idle')
  })
})

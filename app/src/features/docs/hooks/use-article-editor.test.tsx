import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { useArticleEditor } from './use-article-editor'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the article editor', () => {
  it('saves once after typing settles, not once per keystroke', async () => {
    let patches = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') patches += 1
    })

    const { result } = renderHook(() => useArticleEditor('a1'), { wrapper })
    await waitFor(() => {
      expect(result.current.article).toBeDefined()
    })

    act(() => {
      result.current.update({ title: 'R' })
    })
    act(() => {
      result.current.update({ title: 'Re' })
    })
    act(() => {
      result.current.update({ title: 'Ref' })
    })

    expect(result.current.saveState).toBe('unsaved')
    expect(result.current.hasUnsaved).toBe(true)
    // The edit is visible immediately; only the request waits.
    expect(result.current.article?.title).toBe('Ref')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    await waitFor(() => {
      expect(result.current.saveState).toBe('saved')
    })
    expect(patches).toBe(1)
    expect(result.current.hasUnsaved).toBe(false)
  })

  it('keeps the edit when the save fails', async () => {
    server.use(http.patch('/api/articles/:id', () => new HttpResponse(null, { status: 500 })))

    const { result } = renderHook(() => useArticleEditor('a1'), { wrapper })
    await waitFor(() => {
      expect(result.current.article).toBeDefined()
    })

    act(() => {
      result.current.update({ title: 'Written but not saved' })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    // Discarding what someone typed because the network blipped is the worst thing an editor
    // can do, so a failed save leaves the text alone and says so.
    await waitFor(() => {
      expect(result.current.saveState).toBe('unsaved')
    })
    expect(result.current.article?.title).toBe('Written but not saved')
    expect(result.current.hasUnsaved).toBe(true)
  })
})

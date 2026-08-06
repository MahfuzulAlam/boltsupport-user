import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { server } from '@/mocks/server'
import { ApiError, apiRequest } from './api-client'
import { fetchConversations } from '@/features/inbox'

describe('the zod boundary', () => {
  it('parses a well formed response and returns typed data', async () => {
    const page = await fetchConversations({ limit: 5 })

    expect(page.items).toHaveLength(5)
    expect(page.total).toBeGreaterThan(5)
    expect(page.nextCursor).toBe('5')
    // Parsed, not merely cast: the shape came back through the schema.
    const first = page.items[0]
    expect(first?.number).toBeTypeOf('number')
    expect(first?.subject).toBeTypeOf('string')
  })

  it('rejects a malformed response as a schema error instead of trusting it', async () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string(), subject: z.string() })),
      total: z.number(),
    })

    const error = await apiRequest('/dev/malformed-conversations', schema).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.kind).toBe('schema')
    // Field paths are safe to surface; the offending values are not.
    expect(apiError.issues).toContain('total')
    expect(apiError.userMessage).toMatch(/cannot trust/i)
  })

  it('never puts response values in the error, only field paths', async () => {
    const schema = z.object({ secret: z.number() })
    server.use(
      http.get('/api/leaky', () => HttpResponse.json({ secret: 'sk-live-should-never-be-logged' })),
    )

    const error = (await apiRequest('/leaky', schema).catch((e: unknown) => e)) as ApiError

    const serialised = JSON.stringify({
      message: error.message,
      issues: error.issues,
      userMessage: error.userMessage,
    })
    expect(serialised).not.toContain('sk-live-should-never-be-logged')
  })

  it('reports a 404 as an http error with its status', async () => {
    const error = (await apiRequest('/conversations/does-not-exist', z.object({})).catch(
      (e: unknown) => e,
    )) as ApiError

    expect(error.kind).toBe('http')
    expect(error.status).toBe(404)
  })

  it('lets an abort propagate untouched so cancellation still works', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await fetchConversations({}, controller.signal).catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as Error).name).toBe('AbortError')
  })
})

describe('what a failure tells you', () => {
  /*
   * Every 4xx used to read "returned 409" regardless of what the server said, so the one sentence
   * that explains how to fix the request was parsed, discarded, and replaced with a status code.
   */
  it('prefers the server\'s own explanation', async () => {
    server.use(
      http.post('/api/things', () =>
        HttpResponse.json({ message: 'That address is already invited' }, { status: 409 }),
      ),
    )

    const error = await apiRequest('/things', z.unknown(), { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).serverMessage).toBe('That address is already invited')
    expect((error as ApiError).userMessage).toBe('That address is already invited')
    expect((error as ApiError).status).toBe(409)
  })

  it('falls back cleanly when the body is not JSON', async () => {
    server.use(http.post('/api/things', () => new HttpResponse('gateway timeout', { status: 504 })))

    const error = await apiRequest('/things', z.unknown(), { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )

    // No server sentence to show, so the generic line stands rather than leaking a status code
    // into the interface.
    expect((error as ApiError).serverMessage).toBeUndefined()
    expect((error as ApiError).userMessage).toBe('The request failed. Try again in a moment.')
  })
})


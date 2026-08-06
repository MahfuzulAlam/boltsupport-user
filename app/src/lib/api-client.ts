import type { z } from 'zod'

/**
 * The single HTTP boundary.
 *
 * NFR-2.7 requires every response to be parsed with zod before it reaches application state,
 * and a schema mismatch to surface a typed error rather than being trusted. That rule only
 * holds if there is one place responses can enter, which is this file. Feature `api/` modules
 * call these helpers and pass their schema; nothing else calls fetch.
 *
 * NFR-2.10 forbids logging message bodies, tokens, or PII, so failures carry a status and a
 * short reason, never a successful response body, and never the values that failed validation.
 * The one thing read from a failed response is its `message` field, which the server authors for
 * display; nothing else in an error envelope is touched.
 */

export type ApiErrorKind = 'network' | 'http' | 'schema'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  /** Field paths that failed validation. Safe to show; carries no values. */
  readonly issues: string[] | undefined
  /** What the server said, when it said anything. Present only on `http` errors. */
  readonly serverMessage: string | undefined

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: {
      status?: number
      issues?: string[]
      serverMessage?: string
      cause?: unknown
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.issues = options.issues
    this.serverMessage = options.serverMessage
  }

  /** What an error boundary or inline retry should show. States what happened and what to do. */
  get userMessage(): string {
    switch (this.kind) {
      case 'network':
        return 'We could not reach the server. Check your connection and try again.'
      case 'http':
        // The server's explanation beats a generic apology whenever there is one, because it is
        // the only version that tells somebody what to change.
        if (this.serverMessage !== undefined) return this.serverMessage
        return this.status === 404
          ? 'That is no longer here. It may have been deleted or moved.'
          : 'The request failed. Try again in a moment.'
      case 'schema':
        return 'The server sent something unexpected, so we stopped rather than showing you data we cannot trust.'
    }
  }
}

const BASE_URL = '/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  searchParams?: Record<string, string | number | readonly string[] | undefined>
}

function buildUrl(path: string, searchParams: RequestOptions['searchParams']): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue
    // Narrowed off the union rather than with Array.isArray, which widens the element to `any`.
    if (typeof value !== 'string' && typeof value !== 'number') {
      // Repeated rather than comma joined, so a value containing a comma survives the round trip
      // and an empty selection drops out of the URL entirely.
      for (const item of value) url.searchParams.append(key, item)
      continue
    }
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Fetch, then parse. The return type comes from the schema, so a caller cannot accidentally
 * treat an unvalidated shape as validated.
 */
export async function apiRequest<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  options: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  const { method = 'GET', body, signal, searchParams } = options

  let response: Response
  try {
    response = await fetch(buildUrl(path, searchParams), {
      method,
      signal,
      // The session is an httpOnly cookie. No Authorization header is ever built here.
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    // An aborted request is a caller decision, not a failure. Let it propagate untouched so
    // TanStack Query and AbortController based cancellation behave normally.
    //
    // Matched by name rather than `instanceof DOMException`: browsers throw a DOMException but
    // undici throws a plain Error, so the constructor check silently misclassified every
    // cancelled request in Node as a network failure.
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError('network', `Request to ${path} failed`, { cause })
  }

  if (!response.ok) {
    /*
     * The server's own words, when it has any.
     *
     * A 409 on an invite means "that address is already here", and until this read the body was
     * discarded and every failure became "returned 409". The one thing a person needs in order to
     * fix the request was the thing being thrown away. Parsed defensively, since an error response
     * is exactly where a body is most likely to be missing or not JSON at all.
     */
    let detail: string | undefined
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const { message } = body
        if (typeof message === 'string' && message.trim() !== '') detail = message
      }
    } catch {
      detail = undefined
    }

    throw new ApiError(
      'http',
      detail ?? `Request to ${path} returned ${String(response.status)}`,
      { status: response.status, ...(detail === undefined ? {} : { serverMessage: detail }) },
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (cause) {
    throw new ApiError('schema', `Response from ${path} was not valid JSON`, { cause })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    // Paths only. The values that failed may be message bodies or PII.
    const issues = parsed.error.issues.map((issue) => issue.path.join('.') || '(root)')
    throw new ApiError('schema', `Response from ${path} did not match its schema`, { issues })
  }

  return parsed.data
}

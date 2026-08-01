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
 * short reason and never the response body.
 */

export type ApiErrorKind = 'network' | 'http' | 'schema'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  /** Field paths that failed validation. Safe to show; carries no values. */
  readonly issues: string[] | undefined

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; issues?: string[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.issues = options.issues
  }

  /** What an error boundary or inline retry should show. States what happened and what to do. */
  get userMessage(): string {
    switch (this.kind) {
      case 'network':
        return 'We could not reach the server. Check your connection and try again.'
      case 'http':
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
  searchParams?: Record<string, string | number | undefined>
}

function buildUrl(path: string, searchParams: RequestOptions['searchParams']): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
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
    throw new ApiError('http', `Request to ${path} returned ${String(response.status)}`, {
      status: response.status,
    })
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

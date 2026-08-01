import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'

/**
 * Retrying a request that failed because the response did not match its schema, or because the
 * resource is genuinely gone, just delays the error the user needs to see. Only transient
 * failures are worth a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === 'schema') return false
    if (error.kind === 'http' && error.status !== undefined && error.status < 500) return false
  }
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // The queue is long lived and agents keep it open all day; refetching on every window
        // focus would fight the 100ms interaction budget for no benefit.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  })
}

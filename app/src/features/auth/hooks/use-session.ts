import { useQuery } from '@tanstack/react-query'
import { fetchSession } from '../api/session'

export const sessionQueryKey = ['session'] as const

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => fetchSession(signal),
    // The signed in user does not change while the tab is open, and every screen reads it.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

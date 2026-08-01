import { useQuery } from '@tanstack/react-query'
import { fetchInboxes } from '../api/conversations'

export const inboxesQueryKey = ['inboxes'] as const

export function useInboxes() {
  return useQuery({
    queryKey: inboxesQueryKey,
    queryFn: ({ signal }) => fetchInboxes(signal),
    staleTime: 30_000,
  })
}

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Conversation, Folder } from '@/types'
import { fetchConversations } from '../api/conversations'

export type ListSort = 'newest' | 'oldest' | 'waiting' | 'sla'

export interface ConversationListQuery {
  inboxId: string
  folder: Folder
  sort: ListSort
  search?: string
}

export function conversationListKey(query: ConversationListQuery) {
  return ['conversations', 'list', query] as const
}

/**
 * The queue, paged.
 *
 * Infinite scroll rather than pagination because triage is a continuous scan, and a page break
 * forces a decision the agent should not have to make. `flat` is memoised so the virtualizer
 * gets a stable array identity between unrelated re-renders.
 */
export function useConversationList(query: ConversationListQuery) {
  const result = useInfiniteQuery({
    queryKey: conversationListKey(query),
    queryFn: ({ pageParam, signal }) =>
      fetchConversations(
        {
          inboxId: query.inboxId,
          folder: query.folder,
          sort: query.sort,
          ...(query.search !== undefined && query.search !== '' ? { search: query.search } : {}),
          ...(pageParam !== undefined ? { cursor: pageParam } : {}),
          limit: 40,
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const conversations: Conversation[] = useMemo(
    () => result.data?.pages.flatMap((page) => page.items) ?? [],
    [result.data],
  )

  return {
    ...result,
    conversations,
    total: result.data?.pages[0]?.total ?? 0,
  }
}

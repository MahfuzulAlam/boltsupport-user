import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Conversation, ConvStatus, Folder, Priority } from '@/types'
import { fetchConversations } from '../api/conversations'

export type ListSort = 'newest' | 'oldest' | 'waiting' | 'sla'

/**
 * What the toolbar filter narrows by.
 *
 * Held as sorted arrays rather than Sets because it goes straight into the query key: two agents
 * who tick the same two tags in a different order should share a cache entry, not fetch twice.
 */
export interface ListFilter {
  status: ConvStatus[]
  priority: Priority[]
  /** User ids, plus the literal `unassigned`. */
  assigneeId: string[]
  tagId: string[]
}

export const EMPTY_FILTER: ListFilter = {
  status: [],
  priority: [],
  assigneeId: [],
  tagId: [],
}

export function filterCount(filter: ListFilter): number {
  return (
    filter.status.length + filter.priority.length + filter.assigneeId.length + filter.tagId.length
  )
}

export interface ConversationListQuery {
  inboxId: string
  folder: Folder
  sort: ListSort
  search?: string
  filter?: ListFilter
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
          ...(query.filter ?? {}),
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

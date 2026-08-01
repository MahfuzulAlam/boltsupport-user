import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Conversation, ConvStatus } from '@/types'
import { patchConversation } from '../api/conversations'
import type { ConversationPage } from '../api/conversations'

interface InfiniteConversations {
  pages: ConversationPage[]
  pageParams: unknown[]
}

/** Applies a change to every cached list page without refetching. */
function patchCaches(
  queryClient: QueryClient,
  ids: string[],
  change: (conversation: Conversation) => Conversation,
): void {
  const targets = new Set(ids)
  queryClient.setQueriesData<InfiniteConversations>(
    { queryKey: ['conversations', 'list'] },
    (old) => {
      if (old === undefined) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (targets.has(item.id) ? change(item) : item)),
        })),
      }
    },
  )
}

export interface BulkPatch {
  ids: string[]
  patch: { assigneeId?: string | null; status?: ConvStatus }
  /** What the toast says, and what Undo reverts to. */
  describe: (count: number) => string
}

/**
 * Optimistic bulk mutation with undo.
 *
 * NFR-1.5 requires optimistic mutations with rollback, and the speed principle says undo beats a
 * confirmation dialog. The snapshot taken in `onMutate` serves both: `onError` restores it on
 * failure, and the Undo action restores it on request.
 */
export function useBulkPatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, patch }: BulkPatch) => {
      await Promise.all(ids.map((id) => patchConversation(id, patch)))
    },

    onMutate: async ({ ids, patch }: BulkPatch) => {
      // Stop in-flight refetches from landing on top of the optimistic state.
      await queryClient.cancelQueries({ queryKey: ['conversations', 'list'] })

      const snapshot = queryClient.getQueriesData<InfiniteConversations>({
        queryKey: ['conversations', 'list'],
      })

      const previous = new Map<string, Conversation>()
      for (const [, data] of snapshot) {
        for (const page of data?.pages ?? []) {
          for (const item of page.items) {
            if (ids.includes(item.id)) previous.set(item.id, item)
          }
        }
      }

      patchCaches(queryClient, ids, (conversation) => ({ ...conversation, ...patch }))
      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous === undefined) return
      const restore = context.previous
      patchCaches(queryClient, [...restore.keys()], (c) => restore.get(c.id) ?? c)
      toast.error('That change did not stick', {
        description: 'We put the conversations back the way they were.',
      })
    },

    onSuccess: (_data, variables, context) => {
      const previous = context.previous
      toast(variables.describe(variables.ids.length), {
        action: {
          label: 'Undo',
          onClick: () => {
            const restore = [...previous.values()]
            patchCaches(queryClient, [...previous.keys()], (c) => previous.get(c.id) ?? c)
            void Promise.all(
              restore.map((conversation) =>
                patchConversation(conversation.id, {
                  assigneeId: conversation.assigneeId,
                  status: conversation.status,
                }),
              ),
            ).then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
          },
        },
      })
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Folder counts on the dashboard and sidebar move with the conversations.
      void queryClient.invalidateQueries({ queryKey: ['inboxes'] })
    },
  })
}

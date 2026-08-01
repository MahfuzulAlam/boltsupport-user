import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ConvStatus, Folder } from '@/types'
import {
  deleteConversation,
  fetchConversations,
  patchConversation,
  restoreConversation,
} from '@/features/inbox'
import { conversationKey } from './use-conversation'

/**
 * The conversations either side of this one, in the folder the agent came from.
 *
 * Triaging is a sequence, not a set of visits, so J and K have to keep working once a thread is
 * open. One page is fetched rather than the whole folder: past a hundred the agent is filtering,
 * not stepping.
 */
export function useConversationSiblings(inboxId: string, folder: string, conversationId: string) {
  const siblings = useQuery({
    queryKey: ['conversation-siblings', inboxId, folder],
    queryFn: ({ signal }) =>
      fetchConversations({ inboxId, folder: folder as Folder, limit: 100 }, signal),
    staleTime: 30_000,
  })

  const items = siblings.data?.items ?? []
  const index = items.findIndex((item) => item.id === conversationId)

  return {
    previous: index > 0 ? (items[index - 1] ?? null) : null,
    next: index >= 0 && index < items.length - 1 ? (items[index + 1] ?? null) : null,
  }
}

interface ActionOptions {
  conversationId: string
  inboxId: string
  folder: string
}

/**
 * The actions in the conversation menu that change the record rather than the view.
 *
 * Every one of them is reversible from its own toast. Spam and Delete both take a conversation
 * off the screen the agent is looking at, which is exactly when a mistake is hardest to notice
 * and hardest to undo by hand.
 */
export function useConversationActions({ conversationId, inboxId, folder }: ActionOptions) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: conversationKey(conversationId) })
    void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    void queryClient.invalidateQueries({ queryKey: ['conversation-siblings'] })
    void queryClient.invalidateQueries({ queryKey: ['inboxes'] })
  }

  const follow = useMutation({
    mutationFn: (followerIds: string[]) => patchConversation(conversationId, { followerIds }),
    onMutate: async (followerIds) => {
      await queryClient.cancelQueries({ queryKey: conversationKey(conversationId) })
      const previous = queryClient.getQueryData(conversationKey(conversationId))
      queryClient.setQueryData(conversationKey(conversationId), (old: unknown) =>
        old === undefined ? old : { ...(old as object), followerIds },
      )
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(conversationKey(conversationId), context.previous)
      }
      toast.error('That did not stick', { description: 'We put the followers back.' })
    },
    onSettled: refresh,
  })

  const move = useMutation({
    mutationFn: ({ toInboxId }: { toInboxId: string; toName: string; fromInboxId: string }) =>
      patchConversation(conversationId, { inboxId: toInboxId }),
    onSuccess: (_data, variables) => {
      refresh()
      // Follow the conversation to where it went. Leaving the agent on a URL for an inbox the
      // thread is no longer in is how a move reads as a disappearance.
      void navigate(`/inbox/${variables.toInboxId}/${folder}/${conversationId}`, { replace: true })
      toast(`Moved to ${variables.toName}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            move.mutate({
              toInboxId: variables.fromInboxId,
              toName: 'the previous inbox',
              fromInboxId: variables.toInboxId,
            })
          },
        },
      })
    },
    onError: () => {
      toast.error('We could not move that conversation', { description: 'Try again in a moment.' })
    },
  })

  const setStatus = useMutation({
    mutationFn: ({ status }: { status: ConvStatus; previous: ConvStatus }) =>
      patchConversation(conversationId, { status }),
    onSuccess: (_data, variables) => {
      refresh()
      if (variables.status === 'spam') {
        void navigate(`/inbox/${inboxId}/${folder}`)
        toast('Marked as spam', {
          action: {
            label: 'Undo',
            onClick: () => {
              setStatus.mutate({ status: variables.previous, previous: 'spam' })
            },
          },
        })
      }
    },
    onError: () => {
      toast.error('That change did not stick', { description: 'Try again in a moment.' })
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteConversation(conversationId),
    onSuccess: () => {
      refresh()
      void navigate(`/inbox/${inboxId}/${folder}`)
      toast('Conversation deleted', {
        description: 'It is out of every folder and every count.',
        action: {
          label: 'Undo',
          onClick: () => {
            restore.mutate()
          },
        },
      })
    },
    onError: () => {
      toast.error('We could not delete that conversation', { description: 'Nothing was removed.' })
    },
  })

  const restore = useMutation({
    mutationFn: () => restoreConversation(conversationId),
    onSuccess: () => {
      refresh()
      void navigate(`/inbox/${inboxId}/${folder}/${conversationId}`)
      toast('Conversation restored')
    },
    onError: () => {
      toast.error('We could not bring that back', { description: 'It may have been purged.' })
    },
  })

  return { follow, move, setStatus, remove }
}

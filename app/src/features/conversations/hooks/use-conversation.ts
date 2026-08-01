import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ConvStatus, Priority } from '@/types'
import { patchConversation } from '@/features/inbox'
import { fetchContact, fetchConversation, fetchMessages } from '../api/conversation'

export function conversationKey(id: string) {
  return ['conversation', id] as const
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKey(id),
    queryFn: ({ signal }) => fetchConversation(id, signal),
  })
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId, 'messages'],
    queryFn: ({ signal }) => fetchMessages(conversationId, signal),
  })
}

export function useContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: ({ signal }) => fetchContact(contactId ?? '', signal),
    enabled: contactId !== undefined,
  })
}

export interface ConversationEdit {
  subject?: string
  status?: ConvStatus
  priority?: Priority
  assigneeId?: string | null
}

/**
 * Optimistic edits to the open conversation.
 *
 * The header controls change state the agent is looking at, so waiting on a round trip to
 * redraw a status pill would be felt immediately against the 100ms budget.
 */
export function useEditConversation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (edit: ConversationEdit) => patchConversation(id, edit),

    onMutate: async (edit) => {
      await queryClient.cancelQueries({ queryKey: conversationKey(id) })
      const previous = queryClient.getQueryData(conversationKey(id))
      queryClient.setQueryData(conversationKey(id), (old: unknown) =>
        old === undefined ? old : { ...(old as object), ...edit },
      )
      return { previous }
    },

    onError: (_error, _edit, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(conversationKey(id), context.previous)
      }
      toast.error('That change did not stick', {
        description: 'We put the conversation back the way it was.',
      })
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKey(id) })
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['inboxes'] })
    },
  })
}

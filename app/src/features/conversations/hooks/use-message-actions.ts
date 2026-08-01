import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Message } from '@/types'
import { patchMessage, translateMessage, type MessagePatch } from '../api/messages'

function messagesKey(conversationId: string) {
  return ['conversation', conversationId, 'messages'] as const
}

/**
 * Edits and hides, applied optimistically.
 *
 * Both actions exist for the same job: a customer pastes a password or a card number into a
 * thread and it has to stop being visible now, not after a round trip. Hiding is reversible from
 * the toast, and editing stamps `editedAt` so the change is on the record rather than pretending
 * the original never existed.
 */
export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, patch }: { messageId: string; patch: MessagePatch }) =>
      patchMessage(conversationId, messageId, patch),

    onMutate: async ({ messageId, patch }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey(conversationId) })
      const previous = queryClient.getQueryData<Message[]>(messagesKey(conversationId))

      queryClient.setQueryData<Message[]>(messagesKey(conversationId), (old) =>
        old?.map((message) =>
          message.id === messageId && 'bodyHtml' in message ? { ...message, ...patch } : message,
        ),
      )
      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(messagesKey(conversationId), context.previous)
      }
      toast.error('That change did not stick', {
        description: 'We put the message back the way it was.',
      })
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) })
    },
  })
}

/**
 * Translates one message for the agent reading it.
 *
 * The result is held in component state rather than written into the query cache, because it is
 * not what the customer sent: caching it as message data is how a translation ends up quoted in a
 * reply as though the customer wrote it.
 */
export function useTranslateMessage() {
  return useMutation({
    mutationFn: ({ messageId, targetLanguage }: { messageId: string; targetLanguage: string }) =>
      translateMessage(messageId, targetLanguage),

    onError: () => {
      toast.error('We could not translate that message', {
        description: 'The original is still here. Try again in a moment.',
      })
    },
  })
}

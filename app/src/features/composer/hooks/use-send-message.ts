import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiRequest } from '@/lib/api-client'
import { messageSchema } from '@/types'
import { shortcutDisplay } from '@/lib/shortcuts'
import type { ComposerMode } from './use-composer-draft'
import type { PendingAttachment } from '../components/AttachmentList'

/** How long a sent message can still be pulled back (FR-3.6). */
export const UNDO_WINDOW_MS = 6000

export interface SendPayload {
  conversationId: string
  mode: ComposerMode
  bodyHtml: string
  attachments: PendingAttachment[]
  /** Set in forward mode. The address the message actually went to. */
  forwardedTo?: string
}

interface UseSendMessageOptions {
  /** Puts the draft back in the editor when a send is undone. */
  onRestoreDraft: (payload: SendPayload) => void
  onSent: () => void
}

/**
 * Send with a real undo window.
 *
 * The message is not written to the server the moment Send is pressed. It is held for six
 * seconds while the UI shows it as sent, and only committed when the window closes. That is
 * what makes Undo honest: nothing has left the building yet, so undoing is a cancellation
 * rather than an apology.
 *
 * A second send during an open window commits the first immediately, so messages can never
 * arrive out of order.
 */
export function useSendMessage({ onRestoreDraft, onSent }: UseSendMessageOptions) {
  const queryClient = useQueryClient()
  const pending = useRef<{ timer: number; payload: SendPayload } | null>(null)

  const commit = useCallback(
    async (payload: SendPayload) => {
      try {
        await apiRequest(`/conversations/${payload.conversationId}/messages`, messageSchema, {
          method: 'POST',
          body: {
            /*
             * A forward is stored as a reply.
             *
             * It is an outbound message on this thread and belongs on the agent rail with the
             * others; what makes it different is where it went, and that is carried by
             * `forwardedTo` rather than by a fourth provenance treatment nobody would learn.
             */
            type: payload.mode === 'forward' ? 'reply' : payload.mode,
            bodyHtml: payload.bodyHtml,
            ...(payload.forwardedTo === undefined ? {} : { forwardedTo: payload.forwardedTo }),
            ...(payload.attachments.length > 0
              ? {
                  attachments: payload.attachments.map((attachment) => ({
                    id: attachment.id,
                    name: attachment.name,
                    size: attachment.size,
                    mime: attachment.type,
                    url: `blob:${attachment.id}`,
                  })),
                }
              : {}),
          },
        })
      } catch {
        toast.error('That message did not send', {
          description: 'Your draft has been put back so you can try again.',
        })
        onRestoreDraft(payload)
      } finally {
        pending.current = null
        void queryClient.invalidateQueries({ queryKey: ['conversation', payload.conversationId] })
        void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    },
    [queryClient, onRestoreDraft],
  )

  const flushPending = useCallback(() => {
    const current = pending.current
    if (current === null) return
    window.clearTimeout(current.timer)
    pending.current = null
    void commit(current.payload)
  }, [commit])

  const send = useCallback(
    (payload: SendPayload) => {
      // Anything already waiting goes first, so ordering is never surprising.
      flushPending()

      const timer = window.setTimeout(() => {
        void commit(payload)
      }, UNDO_WINDOW_MS)
      pending.current = { timer, payload }
      onSent()

      toast(payload.mode === 'note' ? 'Note added' : 'Message sent', {
        duration: UNDO_WINDOW_MS,
        description: `Undo with ${shortcutDisplay('undoSend')}`,
        action: {
          label: 'Undo',
          onClick: () => {
            const current = pending.current
            if (current === null) return
            window.clearTimeout(current.timer)
            pending.current = null
            onRestoreDraft(current.payload)
            toast('Message pulled back. Nothing was sent.')
          },
        },
      })
    },
    [commit, flushPending, onRestoreDraft, onSent],
  )

  /** Z, while the window is open. */
  const undoLast = useCallback(() => {
    const current = pending.current
    if (current === null) return false
    window.clearTimeout(current.timer)
    pending.current = null
    onRestoreDraft(current.payload)
    toast('Message pulled back. Nothing was sent.')
    return true
  }, [onRestoreDraft])

  // Leaving the screen must not silently drop a message the agent believes was sent.
  useEffect(() => {
    return () => {
      const current = pending.current
      if (current !== null) {
        window.clearTimeout(current.timer)
        pending.current = null
        void commit(current.payload)
      }
    }
  }, [commit])

  return { send, undoLast, hasPending: () => pending.current !== null }
}

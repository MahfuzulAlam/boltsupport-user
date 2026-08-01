import { z } from 'zod'
import { messageSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

export interface MessagePatch {
  bodyHtml?: string
  hidden?: boolean
}

export function patchMessage(conversationId: string, messageId: string, patch: MessagePatch) {
  return apiRequest(`/conversations/${conversationId}/messages/${messageId}`, messageSchema, {
    method: 'PATCH',
    body: patch,
  })
}

/**
 * A translation is a reading aid, not a revision.
 *
 * It comes back as its own record rather than as a patch to the message, because overwriting the
 * body would destroy the original an agent may need to quote, and because AI output that replaces
 * human text in place is exactly the confusion the provenance rail exists to prevent.
 */
export const translationSchema = z.object({
  messageId: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  bodyHtml: z.string(),
  confidence: z.number().min(0).max(1),
  injectionDetected: z.boolean(),
})
export type Translation = z.infer<typeof translationSchema>

export function translateMessage(messageId: string, targetLanguage: string, signal?: AbortSignal) {
  return apiRequest(`/ai/messages/${messageId}/translate`, translationSchema, {
    method: 'POST',
    body: { targetLanguage },
    ...(signal ? { signal } : {}),
  })
}

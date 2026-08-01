import { z } from 'zod'
import { contactSchema, conversationSchema, messageSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

export function fetchConversation(id: string, signal?: AbortSignal) {
  return apiRequest(`/conversations/${id}`, conversationSchema, { ...(signal ? { signal } : {}) })
}

export function fetchMessages(conversationId: string, signal?: AbortSignal) {
  return apiRequest(`/conversations/${conversationId}/messages`, z.array(messageSchema), {
    ...(signal ? { signal } : {}),
  })
}

export function fetchContact(id: string, signal?: AbortSignal) {
  return apiRequest(`/contacts/${id}`, contactSchema, { ...(signal ? { signal } : {}) })
}

/** Other threads from the same customer, for the sidebar history panel. */
export function fetchContactConversations(contactId: string, signal?: AbortSignal) {
  return apiRequest(
    '/conversations',
    z.object({
      items: z.array(conversationSchema),
      total: z.number(),
      nextCursor: z.string().nullable(),
    }),
    { ...(signal ? { signal } : {}), searchParams: { contactId, limit: 6 } },
  )
}

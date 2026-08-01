import { z } from 'zod'
import { contactSchema, conversationSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

const contactPageSchema = z.object({
  items: z.array(contactSchema),
  total: z.number(),
  nextCursor: z.string().nullable(),
})

export function fetchContacts(search: string, signal?: AbortSignal) {
  return apiRequest('/contacts', contactPageSchema, {
    ...(signal ? { signal } : {}),
    searchParams: search === '' ? {} : { q: search },
  })
}

export function fetchContact(id: string, signal?: AbortSignal) {
  return apiRequest(`/contacts/${id}`, contactSchema, { ...(signal ? { signal } : {}) })
}

export function fetchContactHistory(contactId: string, signal?: AbortSignal) {
  return apiRequest(
    '/conversations',
    z.object({
      items: z.array(conversationSchema),
      total: z.number(),
      nextCursor: z.string().nullable(),
    }),
    { ...(signal ? { signal } : {}), searchParams: { contactId, limit: 50 } },
  )
}

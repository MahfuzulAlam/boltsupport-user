import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const searchHitSchema = z.object({
  kind: z.enum(['conversation', 'contact', 'article']),
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
  inboxId: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  updatedAt: z.string().optional(),
})
export type SearchHit = z.infer<typeof searchHitSchema>

export function fetchSearch(query: string, signal?: AbortSignal) {
  return apiRequest(`/search?q=${encodeURIComponent(query)}`, z.array(searchHitSchema), {
    ...(signal ? { signal } : {}),
  })
}

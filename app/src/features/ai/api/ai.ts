import { z } from 'zod'
import { aiAgentSchema, aiSettingsSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

/** The two figures on each inbox card's AI strip, keyed by inbox id. */
export const aiInboxStatsSchema = z.record(
  z.string(),
  z.object({
    resolved: z.number().int().nonnegative(),
    draftsSuggested: z.number().int().nonnegative(),
  }),
)
export type AiInboxStats = z.infer<typeof aiInboxStatsSchema>

export function fetchAiSettings(signal?: AbortSignal) {
  return apiRequest('/ai/settings', aiSettingsSchema, { ...(signal ? { signal } : {}) })
}

export function fetchAiAgent(signal?: AbortSignal) {
  return apiRequest('/ai/agent', aiAgentSchema, { ...(signal ? { signal } : {}) })
}

export function fetchAiInboxStats(signal?: AbortSignal) {
  return apiRequest('/ai/inbox-stats', aiInboxStatsSchema, { ...(signal ? { signal } : {}) })
}

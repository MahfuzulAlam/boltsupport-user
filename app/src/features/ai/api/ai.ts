import { z } from 'zod'
import {
  aiAgentSchema,
  aiSettingsSchema,
  knowledgeBaseSchema,
  type KnowledgeBase,
  type KnowledgeKind,
} from '@/types'
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

/*
 * The workspace knowledge layer.
 *
 * Read by every AI feature, so it lives beside the settings rather than inside the agent, which
 * is where the first version of it lived and where nothing else could reach it.
 */

export function fetchKnowledge(signal?: AbortSignal) {
  return apiRequest('/ai/knowledge', z.array(knowledgeBaseSchema), {
    ...(signal ? { signal } : {}),
  })
}

export function createKnowledge(input: {
  kind: KnowledgeKind
  label: string
  description?: string
  url?: string
}) {
  return apiRequest('/ai/knowledge', knowledgeBaseSchema, { method: 'POST', body: input })
}

export function patchKnowledge(id: string, patch: Partial<KnowledgeBase>) {
  return apiRequest(`/ai/knowledge/${id}`, knowledgeBaseSchema, { method: 'PATCH', body: patch })
}

export function deleteKnowledge(id: string) {
  return apiRequest(`/ai/knowledge/${id}`, z.unknown(), { method: 'DELETE' })
}

/** Turn resolved conversations into draft answers, never approved ones. */
export function harvestConversations(id: string, conversationIds: string[]) {
  return apiRequest(`/ai/knowledge/${id}/harvest`, knowledgeBaseSchema, {
    method: 'POST',
    body: { conversationIds },
  })
}

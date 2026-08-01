import { z } from 'zod'
import { aiAgentSchema, knowledgeSourceSchema } from '@/types'
import type { AiAgent, KnowledgeSource } from '@/types'
import { apiRequest } from '@/lib/api-client'

export type AgentPatch = Partial<Pick<AiAgent, 'name' | 'color' | 'identity' | 'status'>> & {
  guardrails?: Partial<AiAgent['guardrails']>
  deployment?: AiAgent['deployment']
}

export function patchAgent(patch: AgentPatch) {
  return apiRequest('/ai/agent', aiAgentSchema, { method: 'PATCH', body: patch })
}

export interface NewSource {
  type: KnowledgeSource['type']
  label: string
  url?: string
}

export function addAgentSource(source: NewSource) {
  return apiRequest('/ai/agent/sources', knowledgeSourceSchema, { method: 'POST', body: source })
}

export function removeAgentSource(id: string) {
  return apiRequest(`/ai/agent/sources/${id}`, aiAgentSchema, { method: 'DELETE' })
}

export function resyncAgentSource(id: string) {
  return apiRequest(`/ai/agent/sources/${id}/resync`, knowledgeSourceSchema, { method: 'POST' })
}

export const agentAnswerSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  /** Empty when nothing matched, which the console has to say out loud (AI-8). */
  sources: z.array(z.object({ id: z.string(), label: z.string() })),
  /** True when the agent would hand this to a human instead of answering. */
  escalated: z.boolean(),
  escalationReason: z.string().optional(),
})
export type AgentAnswer = z.infer<typeof agentAnswerSchema>

/** The test console. Available before and after launch (FR-4.51). */
export function askAgent(question: string) {
  return apiRequest('/ai/agent/ask', agentAnswerSchema, {
    method: 'POST',
    body: { question },
  })
}

import { z } from 'zod'
import { routingStrategySchema, slaPolicySchema, workflowSchema } from '@/types'
import type { SlaPolicy, Workflow } from '@/types'
import { apiRequest } from '@/lib/api-client'

export const routingConfigSchema = z.object({
  strategy: routingStrategySchema,
  rotation: z.array(
    z.object({
      userId: z.string(),
      maxConcurrent: z.number().int().positive(),
      available: z.boolean(),
    }),
  ),
})
export type RoutingConfig = z.infer<typeof routingConfigSchema>

export function fetchWorkflows(inboxId: string, signal?: AbortSignal) {
  return apiRequest(`/automation/workflows?inboxId=${inboxId}`, z.array(workflowSchema), {
    ...(signal ? { signal } : {}),
  })
}

export type WorkflowDraft = Omit<Workflow, 'id'>

export function createWorkflow(draft: WorkflowDraft) {
  return apiRequest('/automation/workflows', workflowSchema, { method: 'POST', body: draft })
}

export function patchWorkflow(id: string, patch: Partial<Workflow>) {
  return apiRequest(`/automation/workflows/${id}`, workflowSchema, { method: 'PATCH', body: patch })
}

export function fetchSlaPolicies(signal?: AbortSignal) {
  return apiRequest('/automation/slas', z.array(slaPolicySchema), { ...(signal ? { signal } : {}) })
}

export type SlaPolicyDraft = Omit<SlaPolicy, 'id'>

export function createSlaPolicy(draft: SlaPolicyDraft) {
  return apiRequest('/automation/slas', slaPolicySchema, { method: 'POST', body: draft })
}

export function patchSlaPolicy(id: string, patch: Partial<SlaPolicy>) {
  return apiRequest(`/automation/slas/${id}`, slaPolicySchema, { method: 'PATCH', body: patch })
}

export function fetchRouting(signal?: AbortSignal) {
  return apiRequest('/automation/routing', routingConfigSchema, { ...(signal ? { signal } : {}) })
}

export function patchRouting(patch: Partial<RoutingConfig>) {
  return apiRequest('/automation/routing', routingConfigSchema, { method: 'PATCH', body: patch })
}

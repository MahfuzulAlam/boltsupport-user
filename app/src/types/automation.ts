import { z } from 'zod'
import { idSchema } from './common'
import { prioritySchema } from './enums'

/**
 * Conditions and actions are shared by workflows, SLA policies, saved views, and every AI
 * settings page. One structure, one builder component, one mental model for the operator.
 */

export const conditionFieldSchema = z.enum([
  'subject',
  'body',
  'from',
  'to',
  'tag',
  'status',
  'priority',
  'channel',
  'predicted_satisfaction',
  'ai_confidence',
  'custom_field',
])
export type ConditionField = z.infer<typeof conditionFieldSchema>

export const conditionOperatorSchema = z.enum([
  'is',
  'is_not',
  'contains',
  'starts_with',
  'greater_than',
])
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>

export const conditionSchema = z.object({
  id: idSchema,
  field: conditionFieldSchema,
  operator: conditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.array(z.string())]),
})
export type Condition = z.infer<typeof conditionSchema>

/** Match ALL or Match ANY. Every rule set is expressed with these two words and no others. */
export const matchModeSchema = z.enum(['all', 'any'])
export type MatchMode = z.infer<typeof matchModeSchema>

/**
 * A nested group, one level deep and no deeper.
 *
 * "Automation builders that require boolean logic expertise" is a stated frustration of the lead
 * persona, so the editor never becomes a parenthesis tree: a group holds conditions, never more
 * groups, and the type is what enforces that rather than a runtime check.
 */
export const conditionGroupSchema = z.object({
  id: idSchema,
  match: matchModeSchema,
  conditions: z.array(conditionSchema),
})
export type ConditionGroup = z.infer<typeof conditionGroupSchema>

export const actionTypeSchema = z.enum([
  'assign',
  'tag',
  'untag',
  'status',
  'priority',
  'move',
  'reply',
  'note',
  'snooze',
  'ai_summary',
  /** Creates a draft for a human to review. It never sends (AI-1). */
  'ai_draft',
])
export type ActionType = z.infer<typeof actionTypeSchema>

export const actionSchema = z.object({
  id: idSchema,
  type: actionTypeSchema,
  value: z.string().optional(),
})
export type Action = z.infer<typeof actionSchema>

export const workflowSchema = z.object({
  id: idSchema,
  inboxId: idSchema,
  name: z.string().min(1),
  kind: z.enum(['automatic', 'manual']),
  match: matchModeSchema,
  conditions: z.array(conditionSchema),
  groups: z.array(conditionGroupSchema).optional(),
  actions: z.array(actionSchema),
  active: z.boolean(),
})
export type Workflow = z.infer<typeof workflowSchema>

export const slaTargetSchema = z.object({
  priority: prioritySchema,
  firstResponseMins: z.number().int().positive(),
  resolutionMins: z.number().int().positive(),
})
export type SlaTarget = z.infer<typeof slaTargetSchema>

export const slaPolicySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  match: matchModeSchema,
  conditions: z.array(conditionSchema),
  groups: z.array(conditionGroupSchema).optional(),
  /** Business hours stops the clock outside shift; calendar never stops (FR-5.3). */
  clock: z.enum(['business', 'calendar']),
  pauseOnCustomer: z.boolean(),
  targets: z.array(slaTargetSchema),
  active: z.boolean(),
})
export type SlaPolicy = z.infer<typeof slaPolicySchema>

export const viewSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  scope: z.enum(['private', 'shared']),
  match: matchModeSchema,
  conditions: z.array(conditionSchema),
  groups: z.array(conditionGroupSchema).optional(),
  count: z.number().int().nonnegative(),
  /** Set on the two AI powered views that ship by default. */
  system: z.enum(['at_risk', 'ai_pending']).optional(),
})
export type View = z.infer<typeof viewSchema>

export const routingStrategySchema = z.enum([
  'round_robin',
  'load_balanced',
  'ai_assisted',
  'manual',
])
export type RoutingStrategy = z.infer<typeof routingStrategySchema>

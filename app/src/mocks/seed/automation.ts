import type { RoutingStrategy, SlaPolicy, Workflow } from '@/types'

export const slaPolicies: SlaPolicy[] = [
  {
    id: 's1',
    name: 'Enterprise SLA',
    match: 'all',
    conditions: [{ id: 'sc1', field: 'tag', operator: 'is', value: 't6' }],
    // Business hours is the default because it is the setting people get wrong: a four hour
    // target on a 4pm ticket is due tomorrow morning, not at midnight.
    clock: 'business',
    pauseOnCustomer: true,
    targets: [
      { priority: 'urgent', firstResponseMins: 15, resolutionMins: 240 },
      { priority: 'high', firstResponseMins: 60, resolutionMins: 1440 },
      { priority: 'normal', firstResponseMins: 240, resolutionMins: 4320 },
      { priority: 'low', firstResponseMins: 480, resolutionMins: 4320 },
    ],
    active: true,
  },
  {
    id: 's2',
    name: 'Standard',
    match: 'any',
    conditions: [{ id: 'sc2', field: 'status', operator: 'is_not', value: 'closed' }],
    clock: 'business',
    pauseOnCustomer: true,
    targets: [
      { priority: 'urgent', firstResponseMins: 60, resolutionMins: 480 },
      { priority: 'high', firstResponseMins: 240, resolutionMins: 2880 },
      { priority: 'normal', firstResponseMins: 480, resolutionMins: 5760 },
      { priority: 'low', firstResponseMins: 1440, resolutionMins: 7200 },
    ],
    active: true,
  },
]

export const workflows: Workflow[] = [
  {
    id: 'w1',
    inboxId: 'in1',
    name: 'Route refund requests to Billing',
    kind: 'automatic',
    match: 'any',
    conditions: [
      { id: 'wc1', field: 'subject', operator: 'contains', value: 'refund' },
      { id: 'wc2', field: 'subject', operator: 'contains', value: 'chargeback' },
    ],
    actions: [
      { id: 'wa1', type: 'tag', value: 't2' },
      { id: 'wa2', type: 'assign', value: 'u2' },
      // Creates a draft for a human to review. It never sends.
      { id: 'wa3', type: 'ai_draft' },
    ],
    active: true,
  },
  {
    id: 'w2',
    inboxId: 'in1',
    name: 'Flag angry enterprise threads',
    kind: 'automatic',
    match: 'all',
    conditions: [
      { id: 'wc3', field: 'tag', operator: 'is', value: 't6' },
      { id: 'wc4', field: 'predicted_satisfaction', operator: 'is', value: 'notGood' },
    ],
    actions: [
      { id: 'wa4', type: 'priority', value: 'high' },
      { id: 'wa5', type: 'ai_summary' },
    ],
    active: true,
  },
  {
    id: 'w3',
    inboxId: 'in1',
    name: 'Three step escalation',
    kind: 'manual',
    match: 'all',
    conditions: [],
    actions: [
      { id: 'wa6', type: 'priority', value: 'urgent' },
      { id: 'wa7', type: 'assign', value: 'u1' },
      { id: 'wa8', type: 'note', value: 'Escalated by workflow. Confirm the customer was told.' },
    ],
    active: false,
  },
]

export interface RoutingConfig {
  strategy: RoutingStrategy
  rotation: { userId: string; maxConcurrent: number; available: boolean }[]
}

export const routing: RoutingConfig = {
  strategy: 'ai_assisted',
  rotation: [
    { userId: 'u1', maxConcurrent: 12, available: true },
    { userId: 'u2', maxConcurrent: 10, available: true },
    { userId: 'u3', maxConcurrent: 8, available: true },
    { userId: 'u4', maxConcurrent: 12, available: false },
  ],
}

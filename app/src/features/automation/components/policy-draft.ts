import type { SlaPolicy } from '@/types'
import { newCondition } from './condition-fields'

export type PolicyDraft = Omit<SlaPolicy, 'id'>

export type EscalationAction = 'notify' | 'reassign' | 'tag'

/**
 * The starting point for a new policy.
 *
 * Pre-filled with sane targets rather than blank rows: a lead should be able to accept these and
 * be done, and seeing four realistic numbers teaches the shape of the form faster than an empty
 * table does.
 */
export function emptyPolicy(): PolicyDraft {
  return {
    name: '',
    match: 'all',
    conditions: [newCondition()],
    groups: [],
    clock: 'business',
    pauseOnCustomer: true,
    targets: [
      { priority: 'urgent', firstResponseMins: 15, resolutionMins: 240 },
      { priority: 'high', firstResponseMins: 60, resolutionMins: 1440 },
      { priority: 'normal', firstResponseMins: 240, resolutionMins: 4320 },
      { priority: 'low', firstResponseMins: 480, resolutionMins: 4320 },
    ],
    active: true,
  }
}

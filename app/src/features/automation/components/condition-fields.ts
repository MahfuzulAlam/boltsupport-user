import type { Condition, ConditionField, ConditionOperator, MatchMode } from '@/types'

export const FIELD_LABELS: Record<ConditionField, string> = {
  subject: 'Subject',
  body: 'Body',
  from: 'From',
  to: 'To',
  tag: 'Tag',
  status: 'Status',
  priority: 'Priority',
  channel: 'Channel',
  predicted_satisfaction: 'Predicted satisfaction',
  ai_confidence: 'AI confidence',
  custom_field: 'Custom field',
}

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  is: 'is',
  is_not: 'is not',
  contains: 'contains',
  starts_with: 'starts with',
  greater_than: 'greater than',
}

/**
 * Which operators a field can take.
 *
 * Offering "contains" on a status, or "greater than" on a subject line, produces a rule that
 * silently matches nothing. Narrowing the list is cheaper than explaining the result later.
 */
const TEXT_OPERATORS: ConditionOperator[] = ['is', 'is_not', 'contains', 'starts_with']
const ENUM_OPERATORS: ConditionOperator[] = ['is', 'is_not']
const NUMBER_OPERATORS: ConditionOperator[] = ['greater_than', 'is', 'is_not']

export function operatorsFor(field: ConditionField): ConditionOperator[] {
  switch (field) {
    case 'subject':
    case 'body':
    case 'from':
    case 'to':
    case 'custom_field':
      return TEXT_OPERATORS
    case 'ai_confidence':
      return NUMBER_OPERATORS
    default:
      return ENUM_OPERATORS
  }
}

export type ValueKind = 'text' | 'number' | 'tag' | 'status' | 'priority' | 'channel' | 'csat'

export function valueKindFor(field: ConditionField): ValueKind {
  switch (field) {
    case 'tag':
      return 'tag'
    case 'status':
      return 'status'
    case 'priority':
      return 'priority'
    case 'channel':
      return 'channel'
    case 'predicted_satisfaction':
      return 'csat'
    case 'ai_confidence':
      return 'number'
    default:
      return 'text'
  }
}

/**
 * The negative OR trap.
 *
 * "is not X OR is not Y" is true for everything except the impossible case of being both, so a
 * rule built this way fires on almost every conversation. It is the single most common mistake
 * in rule builders, and it is invisible until the workflow has already tagged the whole inbox.
 */
export function hasNegativeOrTrap(match: MatchMode, conditions: Condition[]): boolean {
  if (match !== 'any') return false
  return conditions.filter((condition) => condition.operator === 'is_not').length >= 2
}

let counter = 0

/** Ids only have to be unique within an unsaved draft; the server assigns the real ones. */
export function newConditionId(): string {
  counter += 1
  return `draft-c${String(counter)}`
}

export function newCondition(): Condition {
  return { id: newConditionId(), field: 'subject', operator: 'contains', value: '' }
}

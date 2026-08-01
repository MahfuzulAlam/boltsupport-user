import type { Action, Condition, ConditionGroup, MatchMode, Tag, User } from '@/types'
import { FIELD_LABELS, OPERATOR_LABELS } from './condition-fields'
import { ACTION_LABELS } from './action-labels'
import { enumLabel } from './value-labels'

export interface RuleVocabulary {
  tags: Tag[]
  users: User[]
  inboxes: { id: string; name: string }[]
}

/**
 * Ids and enum keys are meaningless to a human reading a rule back, so resolve both.
 *
 * Without the enum lookup a rule reads "Predicted satisfaction is notGood", which is the shape
 * of the data rather than the language of the product.
 */
function readableValue(value: unknown, vocabulary: RuleVocabulary): string {
  const raw = String(value)
  const tag = vocabulary.tags.find((item) => item.id === raw)
  if (tag !== undefined) return tag.name
  const user = vocabulary.users.find((item) => item.id === raw)
  if (user !== undefined) return user.name
  const inbox = vocabulary.inboxes.find((item) => item.id === raw)
  if (inbox !== undefined) return inbox.name
  return enumLabel(raw) ?? (raw === '' ? '(empty)' : raw)
}

/** Joins a recap without doubling a full stop the author already typed. */
export function endSentence(text: string): string {
  return /[.!?]$/.test(text.trim()) ? text : `${text}.`
}

export function describeCondition(condition: Condition, vocabulary: RuleVocabulary): string {
  return `${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]} ${readableValue(
    condition.value,
    vocabulary,
  )}`
}

export function describeAction(action: Action, vocabulary: RuleVocabulary): string {
  const label = ACTION_LABELS[action.type]
  return action.value === undefined ? label : `${label} ${readableValue(action.value, vocabulary)}`
}

/**
 * The rule, in a sentence.
 *
 * A summary step that just repeats the form is not a summary. Reading the rule back as prose is
 * what catches "I meant ALL" before it runs across the whole inbox.
 */
export function describeRule(
  match: MatchMode,
  conditions: Condition[],
  groups: ConditionGroup[],
  vocabulary: RuleVocabulary,
): string {
  if (conditions.length === 0 && groups.length === 0) return 'every conversation'

  const parts = conditions.map((condition) => describeCondition(condition, vocabulary))
  for (const group of groups) {
    const inner = group.conditions
      .map((condition) => describeCondition(condition, vocabulary))
      .join(group.match === 'all' ? ' and ' : ' or ')
    parts.push(`(${inner})`)
  }

  return parts.join(match === 'all' ? ' and ' : ' or ')
}

import type { ActionType } from '@/types'

/**
 * What each action is called, in one place.
 *
 * The wizard's picker, the summary sentence, and the workflow list all read from here, so a rule
 * you built and a rule you are auditing use the same words.
 */
export const ACTION_LABELS: Record<ActionType, string> = {
  assign: 'Assign to',
  tag: 'Add tag',
  untag: 'Remove tag',
  status: 'Set status',
  priority: 'Set priority',
  move: 'Move to inbox',
  reply: 'Send saved reply',
  note: 'Add note',
  snooze: 'Snooze',
  ai_summary: 'Generate AI summary',
  /** Creates a draft for a human to review. It never sends (AI-1). */
  ai_draft: 'Request AI draft',
}

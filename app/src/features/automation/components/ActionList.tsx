import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Select, type SelectOption } from '@/components/Select'
import { Input } from '@/components/ui/input'
import type { Action, ActionType, SavedReply, Tag, User } from '@/types'
import { newAction } from '../hooks/use-workflow-draft'
import { ACTION_LABELS } from './action-labels'
import { PRIORITY_OPTIONS, SNOOZE_OPTIONS, STATUS_OPTIONS } from './value-labels'

const AI_ACTIONS = new Set<ActionType>(['ai_summary', 'ai_draft'])

const ACTION_OPTIONS: SelectOption[] = Object.entries(ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface ActionListProps {
  actions: Action[]
  tags: Tag[]
  users: User[]
  inboxes: { id: string; name: string }[]
  savedReplies: SavedReply[]
  onChange: (next: Action[]) => void
}

function valueOptionsFor(
  type: ActionType,
  props: Pick<ActionListProps, 'tags' | 'users' | 'inboxes' | 'savedReplies'>,
): SelectOption[] | null {
  switch (type) {
    case 'assign':
      return props.users.map((user) => ({ value: user.id, label: user.name }))
    case 'tag':
    case 'untag':
      return props.tags.map((tag) => ({ value: tag.id, label: tag.name }))
    case 'move':
      return props.inboxes.map((inbox) => ({ value: inbox.id, label: inbox.name }))
    case 'reply':
      return props.savedReplies.map((reply) => ({ value: reply.id, label: reply.name }))
    case 'status':
      return STATUS_OPTIONS
    case 'priority':
      return PRIORITY_OPTIONS
    case 'snooze':
      return SNOOZE_OPTIONS
    default:
      return null
  }
}

/**
 * The ordered action list.
 *
 * Order is explicit and moved with buttons rather than dragged: actions run top to bottom, a
 * keyboard user has to be able to reorder them too, and a drag library is a lot of bundle for
 * a list that is rarely longer than four rows.
 */
export function ActionList({
  actions,
  tags,
  users,
  inboxes,
  savedReplies,
  onChange,
}: ActionListProps) {
  const move = (index: number, delta: number) => {
    const next = [...actions]
    const target = index + delta
    const a = next[index]
    const b = next[target]
    if (a === undefined || b === undefined) return
    next[index] = b
    next[target] = a
    onChange(next)
  }

  const patch = (id: string, changes: Partial<Action>) => {
    onChange(actions.map((action) => (action.id === id ? { ...action, ...changes } : action)))
  }

  return (
    <div>
      <ol className="flex flex-col gap-2">
        {actions.map((action, index) => {
          const options = valueOptionsFor(action.type, { tags, users, inboxes, savedReplies })
          const isAi = AI_ACTIONS.has(action.type)
          return (
            <li key={action.id} className="flex flex-wrap items-center gap-2">
              <span
                className="w-5 shrink-0 text-right font-mono text-[12px]"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {index + 1}
              </span>

              <Select
                value={action.type}
                options={ACTION_OPTIONS}
                onChange={(raw) => {
                  const type = raw as ActionType
                  // Same rule as the condition rows: commit the default the picker shows, or
                  // the summary reads "Set priority" with nothing after it.
                  const first = valueOptionsFor(type, { tags, users, inboxes, savedReplies })?.[0]
                  patch(action.id, {
                    type,
                    ...(first ? { value: first.value } : { value: undefined }),
                  })
                }}
                aria-label={`Action ${String(index + 1)} type`}
                className="w-[200px]"
              />

              {options !== null ? (
                <Select
                  value={action.value ?? options[0]?.value ?? ''}
                  options={options}
                  onChange={(value) => {
                    patch(action.id, { value })
                  }}
                  aria-label={`Action ${String(index + 1)} value`}
                  className="w-[190px]"
                />
              ) : action.type === 'note' ? (
                <Input
                  value={action.value ?? ''}
                  onChange={(event) => {
                    patch(action.id, { value: event.target.value })
                  }}
                  placeholder="Note text"
                  aria-label={`Action ${String(index + 1)} value`}
                  className="h-9 w-[280px]"
                />
              ) : null}

              {isAi ? (
                <span
                  className="inline-flex h-6 items-center gap-1 rounded-[12px] px-2 text-[12px] font-medium"
                  style={{ background: 'var(--ai-soft)', color: 'var(--ai)' }}
                >
                  <Sparkles className="size-3" aria-hidden="true" />
                  {action.type === 'ai_draft' ? 'Draft only, never sent' : 'Internal'}
                </span>
              ) : null}

              <div className="ml-auto flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    move(index, -1)
                  }}
                  disabled={index === 0}
                  aria-label={`Move action ${String(index + 1)} up`}
                  className="flex size-8 items-center justify-center rounded-md disabled:opacity-30"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    move(index, 1)
                  }}
                  disabled={index === actions.length - 1}
                  aria-label={`Move action ${String(index + 1)} down`}
                  className="flex size-8 items-center justify-center rounded-md disabled:opacity-30"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(actions.filter((item) => item.id !== action.id))
                  }}
                  aria-label={`Remove action ${String(index + 1)}`}
                  className="flex size-8 items-center justify-center rounded-md"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={() => {
          const first = tags[0]
          onChange([...actions, { ...newAction('tag'), ...(first ? { value: first.id } : {}) }])
        }}
        className="mt-3 flex h-8 items-center gap-1.5 text-[13px]"
        style={{ color: 'var(--brand)' }}
      >
        <Plus className="size-3.5" />
        Add action
      </button>
    </div>
  )
}

import { AlertTriangle, Plus } from 'lucide-react'
import { Select } from '@/components/Select'
import type { Condition, ConditionGroup, MatchMode, Tag } from '@/types'
import { ConditionRow } from './ConditionRow'
import { hasNegativeOrTrap, newCondition, newConditionId } from './condition-fields'

export interface ConditionSet {
  match: MatchMode
  conditions: Condition[]
  groups: ConditionGroup[]
}

interface ConditionGroupBuilderProps {
  value: ConditionSet
  tags: Tag[]
  onChange: (next: ConditionSet) => void
  /** Workflows say "conversation", SLAs say "policy". The noun changes, the mechanics do not. */
  subject?: string
  /**
   * Whether the set may be emptied.
   *
   * An SLA policy with no conditions would silently apply to everything, so it stays false
   * there. A manual workflow legitimately has none: it runs when someone picks it.
   */
  allowEmpty?: boolean
}

const MATCH_OPTIONS = [
  { value: 'all', label: 'ALL' },
  { value: 'any', label: 'ANY' },
]

function NegativeOrWarning() {
  return (
    <div
      className="mt-2 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
      style={{
        borderColor: 'var(--warning)',
        background: 'hsl(38 92% 50% / 0.10)',
        color: 'var(--warning-strong)',
      }}
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Two “is not” conditions joined by ANY match almost everything, because anything that fails
        one still passes the other. Switch to ALL, or use a single condition.
      </span>
    </div>
  )
}

/**
 * The rule editor, shared by workflows, SLA policies, saved views, and the AI settings pages.
 *
 * It is one component on purpose: an operator who learns Match ALL/ANY once should not meet a
 * different rule interface in each corner of the product. Nesting stops at one level, and the
 * warning about negative ORs is inline rather than on save, because by then the rule has run.
 */
export function ConditionGroupBuilder({
  value,
  tags,
  onChange,
  subject = 'conversation',
  allowEmpty = false,
}: ConditionGroupBuilderProps) {
  const setConditions = (conditions: Condition[]) => {
    onChange({ ...value, conditions })
  }

  const setGroup = (groupId: string, next: ConditionGroup | null) => {
    onChange({
      ...value,
      groups:
        next === null
          ? value.groups.filter((group) => group.id !== groupId)
          : value.groups.map((group) => (group.id === groupId ? next : group)),
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[13px]">
        <span>Match</span>
        <Select
          value={value.match}
          options={MATCH_OPTIONS}
          onChange={(match) => {
            onChange({ ...value, match: match as MatchMode })
          }}
          aria-label="Match mode"
          className="w-[100px]"
        />
        <span style={{ color: 'var(--muted-foreground)' }}>of the following for a {subject}</span>
      </div>

      <div className="flex flex-col gap-2">
        {value.conditions.map((condition) => (
          <ConditionRow
            key={condition.id}
            condition={condition}
            tags={tags}
            canRemove={allowEmpty || value.conditions.length > 1 || value.groups.length > 0}
            onChange={(next) => {
              setConditions(value.conditions.map((c) => (c.id === condition.id ? next : c)))
            }}
            onRemove={() => {
              setConditions(value.conditions.filter((c) => c.id !== condition.id))
            }}
          />
        ))}
      </div>

      {hasNegativeOrTrap(value.match, value.conditions) ? <NegativeOrWarning /> : null}

      {value.groups.map((group) => (
        <fieldset
          key={group.id}
          className="mt-3 rounded-md border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <legend className="px-1 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
            Nested group
          </legend>
          <div className="mb-2 flex items-center gap-2 text-[13px]">
            <span>Match</span>
            <Select
              value={group.match}
              options={MATCH_OPTIONS}
              onChange={(match) => {
                setGroup(group.id, { ...group, match: match as MatchMode })
              }}
              aria-label="Nested match mode"
              className="w-[100px]"
            />
            <button
              type="button"
              onClick={() => {
                setGroup(group.id, null)
              }}
              className="ml-auto text-[13px]"
              style={{ color: 'var(--danger-strong)' }}
            >
              Remove group
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {group.conditions.map((condition) => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                tags={tags}
                canRemove={group.conditions.length > 1}
                onChange={(next) => {
                  setGroup(group.id, {
                    ...group,
                    conditions: group.conditions.map((c) => (c.id === condition.id ? next : c)),
                  })
                }}
                onRemove={() => {
                  setGroup(group.id, {
                    ...group,
                    conditions: group.conditions.filter((c) => c.id !== condition.id),
                  })
                }}
              />
            ))}
          </div>

          {hasNegativeOrTrap(group.match, group.conditions) ? <NegativeOrWarning /> : null}

          <button
            type="button"
            onClick={() => {
              setGroup(group.id, { ...group, conditions: [...group.conditions, newCondition()] })
            }}
            className="mt-2 flex h-8 items-center gap-1.5 text-[13px]"
            style={{ color: 'var(--brand)' }}
          >
            <Plus className="size-3.5" />
            Add condition
          </button>
        </fieldset>
      ))}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setConditions([...value.conditions, newCondition()])
          }}
          className="flex h-8 items-center gap-1.5 text-[13px]"
          style={{ color: 'var(--brand)' }}
        >
          <Plus className="size-3.5" />
          Add condition
        </button>

        {/* One level only. Offering a second would turn this into a parenthesis editor. */}
        {value.groups.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              onChange({
                ...value,
                groups: [{ id: newConditionId(), match: 'any', conditions: [newCondition()] }],
              })
            }}
            className="flex h-8 items-center gap-1.5 text-[13px]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Plus className="size-3.5" />
            Add group
          </button>
        ) : null}
      </div>
    </div>
  )
}

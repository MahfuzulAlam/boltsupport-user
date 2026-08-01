import { Trash2 } from 'lucide-react'
import { Select, type SelectOption } from '@/components/Select'
import { Input } from '@/components/ui/input'
import type { Condition, ConditionField, ConditionOperator, Tag } from '@/types'
import { FIELD_LABELS, OPERATOR_LABELS, operatorsFor, valueKindFor } from './condition-fields'
import { CHANNEL_OPTIONS, CSAT_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from './value-labels'

const FIELD_OPTIONS: SelectOption[] = Object.entries(FIELD_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface ConditionRowProps {
  condition: Condition
  tags: Tag[]
  onChange: (next: Condition) => void
  onRemove: () => void
  /** Removal is blocked on the last row: an empty rule set matches everything. */
  canRemove: boolean
}

function optionsFor(field: ConditionField, tags: Tag[]): SelectOption[] | null {
  switch (valueKindFor(field)) {
    case 'tag':
      return tags.map((tag) => ({ value: tag.id, label: tag.name }))
    case 'status':
      return STATUS_OPTIONS
    case 'priority':
      return PRIORITY_OPTIONS
    case 'channel':
      return CHANNEL_OPTIONS
    case 'csat':
      return CSAT_OPTIONS
    default:
      return null
  }
}

export function ConditionRow({
  condition,
  tags,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps) {
  const operators = operatorsFor(condition.field)
  const kind = valueKindFor(condition.field)
  const value = String(condition.value)
  const enumOptions = optionsFor(condition.field, tags)

  const setField = (raw: string) => {
    const field = raw as ConditionField
    const allowed = operatorsFor(field)
    // Changing the field can strand an operator it does not support, so fall back to the first.
    const operator = allowed.includes(condition.operator)
      ? condition.operator
      : (allowed[0] ?? 'is')
    // A picker showing its first option while the rule stores an empty string is a rule that
    // saves something other than what it displays. Commit the default rather than showing one.
    onChange({
      ...condition,
      field,
      operator,
      value: optionsFor(field, tags)?.[0]?.value ?? '',
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={condition.field}
        options={FIELD_OPTIONS}
        onChange={setField}
        aria-label="Condition field"
        className="w-[190px]"
      />
      <Select
        value={condition.operator}
        options={operators.map((operator) => ({
          value: operator,
          label: OPERATOR_LABELS[operator],
        }))}
        onChange={(raw) => {
          onChange({ ...condition, operator: raw as ConditionOperator })
        }}
        aria-label="Condition operator"
        className="w-[130px]"
      />

      {enumOptions !== null ? (
        <Select
          value={value}
          options={enumOptions}
          onChange={(next) => {
            onChange({ ...condition, value: next })
          }}
          aria-label="Condition value"
          className="w-[180px]"
        />
      ) : (
        <Input
          value={value}
          type={kind === 'number' ? 'number' : 'text'}
          onChange={(event) => {
            onChange({ ...condition, value: event.target.value })
          }}
          placeholder={kind === 'number' ? '0.75' : 'Value'}
          aria-label="Condition value"
          className="h-9 w-[180px]"
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove condition"
        title={canRemove ? 'Remove condition' : 'A rule needs at least one condition'}
        className="flex size-9 items-center justify-center rounded-md disabled:opacity-30"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/Select'
import { SettingsSection, StickySaveBar, Toggle } from '@/components/settings-primitives'
import { cn } from '@/lib/utils'
import type { Priority, Tag } from '@/types'
import { ConditionGroupBuilder, type ConditionSet } from './ConditionGroupBuilder'
import type { EscalationAction, PolicyDraft } from './policy-draft'

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' },
  { key: 'normal', label: 'Normal' },
  { key: 'low', label: 'Low' },
]

const UNIT_OPTIONS = [
  { value: '1', label: 'minutes' },
  { value: '60', label: 'hours' },
  { value: '1440', label: 'days' },
]

/** Renders a stored minute count back as the largest whole unit it divides into. */
function splitMinutes(mins: number): { amount: number; unit: string } {
  if (mins % 1440 === 0) return { amount: mins / 1440, unit: '1440' }
  if (mins % 60 === 0) return { amount: mins / 60, unit: '60' }
  return { amount: mins, unit: '1' }
}

function TargetInput({
  minutes,
  onChange,
  label,
}: {
  minutes: number
  onChange: (next: number) => void
  label: string
}) {
  const { amount, unit } = splitMinutes(minutes)
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={1}
        value={amount}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (next > 0) onChange(next * Number(unit))
        }}
        className="h-9 w-[76px]"
      />
      <Select
        value={unit}
        options={UNIT_OPTIONS}
        onChange={(nextUnit) => {
          onChange(amount * Number(nextUnit))
        }}
        aria-label={`${label} unit`}
        className="w-[110px]"
      />
    </div>
  )
}

interface SlaPolicyEditorProps {
  initial: PolicyDraft
  tags: Tag[]
  saving: boolean
  onSave: (draft: PolicyDraft) => void
  onCancel: () => void
}

/**
 * The policy form.
 *
 * The clock toggle gets the most explanation on the page because it is the setting people get
 * wrong: a four hour target means two different deadlines depending on which one is selected,
 * and the difference only shows up as a surprise breach the next morning.
 */
export function SlaPolicyEditor({ initial, tags, saving, onSave, onCancel }: SlaPolicyEditorProps) {
  const [draft, setDraft] = useState<PolicyDraft>(initial)
  const [escalations, setEscalations] = useState<EscalationAction[]>(['notify'])
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const patch = (next: Partial<PolicyDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const setTarget = (
    priority: Priority,
    field: 'firstResponseMins' | 'resolutionMins',
    v: number,
  ) => {
    patch({
      targets: draft.targets.map((target) =>
        target.priority === priority ? { ...target, [field]: v } : target,
      ),
    })
  }

  const conditionSet: ConditionSet = {
    match: draft.match,
    conditions: draft.conditions,
    groups: draft.groups ?? [],
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto pb-4">
        <SettingsSection title="Policy">
          <Label htmlFor="policy-name" className="mb-1.5 block text-[13px]">
            Name
          </Label>
          <Input
            id="policy-name"
            value={draft.name}
            onChange={(event) => {
              patch({ name: event.target.value })
            }}
            placeholder="Enterprise SLA"
            className="max-w-[420px]"
          />
        </SettingsSection>

        <SettingsSection
          title="Applies to"
          description="Conversations matching these conditions are held to the targets below."
        >
          <ConditionGroupBuilder
            value={conditionSet}
            tags={tags}
            subject="conversation"
            onChange={(set) => {
              patch({ match: set.match, conditions: set.conditions, groups: set.groups })
            }}
          />
        </SettingsSection>

        <SettingsSection title="Targets" description="First response and resolution, per priority.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="text-left text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  <th className="w-[110px] pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">First response</th>
                  <th className="pb-2 font-medium">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {PRIORITIES.map(({ key, label }) => {
                  const target = draft.targets.find((t) => t.priority === key)
                  if (target === undefined) return null
                  return (
                    <tr key={key}>
                      <td className="py-1.5 text-[13px] font-medium">{label}</td>
                      <td className="py-1.5">
                        <TargetInput
                          minutes={target.firstResponseMins}
                          label={`${label} first response`}
                          onChange={(v) => {
                            setTarget(key, 'firstResponseMins', v)
                          }}
                        />
                      </td>
                      <td className="py-1.5">
                        <TargetInput
                          minutes={target.resolutionMins}
                          label={`${label} resolution`}
                          onChange={(v) => {
                            setTarget(key, 'resolutionMins', v)
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SettingsSection>

        <SettingsSection title="Clock">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: 'business' as const,
                  title: 'Business hours',
                  body: 'The clock stops outside your inbox hours. A four hour target on a 4pm ticket is due tomorrow morning, not at midnight.',
                },
                {
                  value: 'calendar' as const,
                  title: 'Calendar, 24/7',
                  body: 'The clock never stops. Use this when someone is on call around the clock.',
                },
              ] as const
            ).map((option) => {
              const selected = draft.clock === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    patch({ clock: option.value })
                  }}
                  className={cn('rounded-lg border p-3 text-left', selected && 'ring-1')}
                  style={{
                    borderColor: selected ? 'var(--brand)' : 'var(--border)',
                    background: selected ? 'var(--brand-soft)' : 'var(--card)',
                    ...(selected ? { boxShadow: '0 0 0 1px var(--brand)' } : {}),
                  }}
                >
                  <p className="mb-1 text-[14px] font-medium">{option.title}</p>
                  <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    {option.body}
                  </p>
                </button>
              )
            })}
          </div>

          <Toggle
            checked={draft.pauseOnCustomer}
            onChange={(pauseOnCustomer) => {
              patch({ pauseOnCustomer })
            }}
            label="Pause the SLA while waiting on the customer"
            description="Time spent waiting for a reply does not count against your target."
          />
        </SettingsSection>

        <SettingsSection
          title="Escalation"
          description="What happens as a conversation approaches its target, and when it passes it."
        >
          {(
            [
              { key: 'notify' as const, label: 'Notify a teammate' },
              { key: 'reassign' as const, label: 'Reassign to the inbox lead' },
              { key: 'tag' as const, label: 'Add a tag' },
            ] as const
          ).map((option) => (
            <Toggle
              key={option.key}
              checked={escalations.includes(option.key)}
              onChange={(on) => {
                setEscalations((current) =>
                  on ? [...current, option.key] : current.filter((item) => item !== option.key),
                )
              }}
              label={option.label}
            />
          ))}
        </SettingsSection>
      </div>

      <StickySaveBar
        dirty={dirty && draft.name.trim() !== ''}
        note={draft.name.trim() === '' ? 'A policy needs a name.' : ''}
        onDiscard={() => {
          setDraft(initial)
          onCancel()
        }}
        onSave={() => {
          if (!saving) onSave(draft)
        }}
      />
    </div>
  )
}

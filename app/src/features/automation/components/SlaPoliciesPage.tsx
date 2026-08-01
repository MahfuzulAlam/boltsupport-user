import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/settings-primitives'
import { formatDuration } from '@/lib/duration'
import type { SlaPolicy } from '@/types'
import { createSlaPolicy, fetchSlaPolicies, patchSlaPolicy } from '../api/automation'
import { useRuleVocabulary } from '../hooks/use-rule-vocabulary'
import { describeRule } from './describe-rule'
import { SlaZeroState } from './SlaZeroState'
import { SlaPolicyEditor } from './SlaPolicyEditor'
import { emptyPolicy, type PolicyDraft } from './policy-draft'

/** Targets read as "15m / 4h", the two numbers a lead actually compares between policies. */
function targetSummary(policy: SlaPolicy): string {
  const urgent = policy.targets.find((target) => target.priority === 'urgent')
  if (urgent === undefined) return '—'
  return `Urgent ${formatDuration(urgent.firstResponseMins * 60_000)} / ${formatDuration(
    urgent.resolutionMins * 60_000,
  )}`
}

export function SlaPoliciesPage() {
  const queryClient = useQueryClient()
  const { tags, vocabulary } = useRuleVocabulary()
  const [editing, setEditing] = useState<PolicyDraft | null>(null)

  const policies = useQuery({
    queryKey: ['sla-policies'],
    queryFn: ({ signal }) => fetchSlaPolicies(signal),
  })

  const create = useMutation({
    mutationFn: (draft: PolicyDraft) => createSlaPolicy(draft),
    onSuccess: (policy) => {
      void queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
      setEditing(null)
      toast(`“${policy.name}” is live`, { description: 'New conversations are held to it now.' })
    },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => patchSlaPolicy(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
    },
  })

  const rows = policies.data ?? []

  if (editing !== null) {
    return (
      <div className="flex h-full w-full flex-col pt-6">
        <PageHeader title="New SLA policy" />
        <SlaPolicyEditor
          initial={editing}
          tags={tags}
          saving={create.isPending}
          onSave={(draft) => {
            create.mutate(draft)
          }}
          onCancel={() => {
            setEditing(null)
          }}
        />
      </div>
    )
  }

  if (policies.isPending) {
    return (
      <div className="w-full pt-6">
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="w-full pt-10 pb-10">
        <SlaZeroState
          onCreate={() => {
            setEditing(emptyPolicy())
          }}
        />
      </div>
    )
  }

  return (
    <div className="w-full pt-6 pb-10">
      <PageHeader
        title="SLA policies"
        description="Response and resolution goals, with a live countdown wherever a conversation appears."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(emptyPolicy())
            }}
          >
            New policy
          </Button>
        }
      />

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div
          className="flex h-9 items-center gap-3 border-b px-3 text-[13px]"
          style={{
            background: 'var(--muted)',
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <span className="w-[180px] shrink-0">Policy</span>
          <span className="min-w-0 flex-1">Applies to</span>
          <span className="w-[170px] shrink-0">Targets</span>
          <span className="w-[70px] shrink-0 text-right">Active</span>
        </div>

        {rows.map((policy) => (
          <div
            key={policy.id}
            className="flex items-center gap-3 border-b px-3 py-2 text-[13px] last:border-b-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="w-[180px] shrink-0 truncate font-medium">{policy.name}</span>
            <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>
              {policy.match === 'all' ? 'ALL' : 'ANY'} of{' '}
              {describeRule(policy.match, policy.conditions, policy.groups ?? [], vocabulary)}
            </span>
            <span className="w-[170px] shrink-0 font-mono">{targetSummary(policy)}</span>
            <span className="flex w-[70px] shrink-0 justify-end">
              <Toggle
                checked={policy.active}
                onChange={(active) => {
                  toggle.mutate({ id: policy.id, active })
                }}
                label={`${policy.name} active`}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Workflow as WorkflowIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/settings-primitives'
import type { Workflow } from '@/types'
import { fetchWorkflows, patchWorkflow } from '../api/automation'
import { useRuleVocabulary } from '../hooks/use-rule-vocabulary'
import { describeAction, describeRule, endSentence } from './describe-rule'

export function WorkflowsPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()
  const { vocabulary } = useRuleVocabulary()

  const workflows = useQuery({
    queryKey: ['workflows', inboxId],
    queryFn: ({ signal }) => fetchWorkflows(inboxId, signal),
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => patchWorkflow(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })

  const rows: Workflow[] = workflows.data ?? []

  return (
    <div className="w-full pt-6 pb-10">
      <PageHeader
        title="Workflows"
        description="Rules that act on conversations, automatically or on demand."
        actions={
          <Button asChild size="sm">
            <Link to={`/inbox/${inboxId}/settings/workflows/new`}>New workflow</Link>
          </Button>
        }
      />

      {workflows.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Automate the triage you are doing by hand: tag it, route it, set its priority."
          action={
            <Button asChild>
              <Link to={`/inbox/${inboxId}/settings/workflows/new`}>New workflow</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((workflow) => (
            <article
              key={workflow.id}
              className="rounded-lg border p-3.5"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold">{workflow.name}</h2>
                <span
                  className="rounded px-1.5 py-0.5 text-[12px] font-medium capitalize"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  {workflow.kind}
                </span>
                <div className="ml-auto">
                  <Toggle
                    checked={workflow.active}
                    onChange={(active) => {
                      toggle.mutate({ id: workflow.id, active })
                    }}
                    label={workflow.active ? 'On' : 'Off'}
                  />
                </div>
              </div>

              {/* The same sentence the wizard shows on its summary step, so a rule reads the
                  same way whether you are building it or auditing it later. */}
              <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                {workflow.conditions.length === 0 && (workflow.groups ?? []).length === 0
                  ? 'Runs on demand. '
                  : `Matches ${workflow.match === 'all' ? 'ALL' : 'ANY'} of ${describeRule(
                      workflow.match,
                      workflow.conditions,
                      workflow.groups ?? [],
                      vocabulary,
                    )}. `}
                Then{' '}
                {endSentence(
                  workflow.actions.map((a) => describeAction(a, vocabulary)).join(', then '),
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

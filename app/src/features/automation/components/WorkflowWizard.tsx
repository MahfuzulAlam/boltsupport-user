import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/Select'
import { cn } from '@/lib/utils'
import { createWorkflow } from '../api/automation'
import { stepError, useWorkflowDraft, type WizardStep } from '../hooks/use-workflow-draft'
import { useRuleVocabulary } from '../hooks/use-rule-vocabulary'
import { ConditionGroupBuilder } from './ConditionGroupBuilder'
import { ActionList } from './ActionList'
import { describeAction, describeRule, endSentence } from './describe-rule'

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Choose type' },
  { step: 2, label: 'Conditions' },
  { step: 3, label: 'Actions' },
  { step: 4, label: 'Summary' },
]

const KIND_EXPLAINER: Record<'automatic' | 'manual', string> = {
  automatic:
    'Automatic workflows run on their own whenever a conversation matches your conditions. For example: tag every email containing “refund” and assign it to Billing.',
  manual:
    'Manual workflows sit in the conversation menu and run only when someone picks them. For example: a three step escalation an agent applies once they have decided a thread needs it.',
}

function StepIndicator({
  current,
  onJump,
}: {
  current: WizardStep
  onJump: (s: WizardStep) => void
}) {
  return (
    <ol className="mb-6 flex items-center gap-1">
      {STEPS.map(({ step, label }, index) => {
        const done = step < current
        const active = step === current
        return (
          <li key={step} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (step < current) onJump(step)
              }}
              disabled={step > current}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px]',
                step > current && 'cursor-default',
              )}
              style={{
                background: active ? 'var(--brand-soft)' : 'transparent',
                color: active
                  ? 'var(--brand)'
                  : done
                    ? 'var(--foreground)'
                    : 'var(--muted-foreground)',
                fontWeight: active ? 500 : 400,
              }}
            >
              <span
                className="flex size-5 items-center justify-center rounded-full font-mono text-[11px]"
                style={{
                  background: done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--muted)',
                  color: done || active ? 'hsl(0 0% 100%)' : 'var(--muted-foreground)',
                }}
              >
                {done ? <Check className="size-3" aria-hidden="true" /> : step}
              </span>
              {label}
            </button>
            {index < STEPS.length - 1 ? (
              <span
                className="h-px w-4"
                style={{ background: 'var(--border)' }}
                aria-hidden="true"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The four step workflow builder.
 *
 * Each step validates before it lets you past, so the summary is never the first place you learn
 * something is missing. The summary itself reads the rule back as a sentence, because that is
 * what catches an ANY that should have been an ALL.
 */
export function WorkflowWizard() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draft = useWorkflowDraft()
  const { tags, users, inboxes, savedReplies, vocabulary } = useRuleVocabulary()

  // A wizard that reopens on step 3 of an abandoned rule is disorienting.
  const reset = draft.reset
  useEffect(() => reset, [reset])

  const create = useMutation({
    mutationFn: () =>
      createWorkflow({
        inboxId,
        name: draft.name.trim(),
        kind: draft.kind,
        match: draft.match,
        conditions: draft.conditions,
        groups: draft.groups,
        actions: draft.actions,
        active: draft.active,
      }),
    onSuccess: (workflow) => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast(`“${workflow.name}” created`, {
        description: workflow.active ? 'It is running now.' : 'Saved as a draft.',
      })
      void navigate(`/inbox/${inboxId}/settings/workflows`)
    },
  })

  const error = stepError(draft, draft.step)
  const next = () => {
    if (error !== null) return
    draft.setStep(Math.min(draft.step + 1, 4) as WizardStep)
  }

  const noConditions = draft.conditions.length === 0 && draft.groups.length === 0
  const noActions = draft.actions.length === 0

  return (
    <div className="w-full max-w-[820px] pt-6 pb-10">
      <PageHeader
        title="New workflow"
        description={`Automation for the ${
          inboxes.find((i) => i.id === inboxId)?.name ?? 'this'
        } inbox.`}
      />

      <StepIndicator current={draft.step} onJump={draft.setStep} />

      {draft.step === 1 ? (
        <section>
          <Label htmlFor="workflow-name" className="mb-1.5 block text-[13px]">
            Name
          </Label>
          <Input
            id="workflow-name"
            value={draft.name}
            onChange={(event) => {
              draft.update({ name: event.target.value })
            }}
            placeholder="Route refund requests to Billing"
            className="mb-4 max-w-[420px]"
          />

          <Label htmlFor="workflow-kind" className="mb-1.5 block text-[13px]">
            Type
          </Label>
          <Select
            value={draft.kind}
            options={[
              { value: 'automatic', label: 'Automatic' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={(kind) => {
              draft.update({ kind: kind as 'automatic' | 'manual' })
            }}
            aria-label="Workflow type"
            className="mb-4 max-w-[420px]"
          />

          <p
            className="rounded-md border p-3 text-[13px]"
            style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
          >
            {KIND_EXPLAINER[draft.kind]}
          </p>
        </section>
      ) : null}

      {draft.step === 2 ? (
        <section>
          <ConditionGroupBuilder
            value={{ match: draft.match, conditions: draft.conditions, groups: draft.groups }}
            tags={tags}
            allowEmpty={draft.kind === 'manual'}
            onChange={(set) => {
              draft.update({ match: set.match, conditions: set.conditions, groups: set.groups })
            }}
          />
          {draft.kind === 'manual' ? (
            <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              A manual workflow can skip conditions entirely. Anything you add here limits which
              conversations offer it in the menu.
            </p>
          ) : null}
        </section>
      ) : null}

      {draft.step === 3 ? (
        <section>
          <ActionList
            actions={draft.actions}
            tags={tags}
            users={users}
            inboxes={inboxes}
            savedReplies={savedReplies}
            onChange={(actions) => {
              draft.update({ actions })
            }}
          />
          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Actions run top to bottom.
          </p>
        </section>
      ) : null}

      {draft.step === 4 ? (
        <section>
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <p className="text-[15px] leading-[1.6]" aria-label="Rule summary">
              <span style={{ color: 'var(--muted-foreground)' }}>When a conversation matches </span>
              <strong>{draft.match === 'all' ? 'ALL' : 'ANY'}</strong>
              <span style={{ color: 'var(--muted-foreground)' }}> of: </span>
              {describeRule(draft.match, draft.conditions, draft.groups, vocabulary)}
              <span style={{ color: 'var(--muted-foreground)' }}>, then: </span>
              {endSentence(
                draft.actions.length === 0
                  ? 'do nothing'
                  : draft.actions
                      .map((action) => describeAction(action, vocabulary))
                      .join(', then '),
              )}
            </p>

            <div className="mt-3 flex gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  draft.setStep(2)
                }}
                style={{ color: 'var(--brand)' }}
              >
                Edit conditions
              </button>
              <button
                type="button"
                onClick={() => {
                  draft.setStep(3)
                }}
                style={{ color: 'var(--brand)' }}
              >
                Edit actions
              </button>
            </div>
          </div>

          {noConditions || noActions ? (
            <div
              className="mt-3 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
              style={{
                borderColor: 'var(--warning)',
                background: 'hsl(38 92% 50% / 0.10)',
                color: 'var(--warning-strong)',
              }}
              role="status"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {noConditions
                  ? 'With no conditions this runs on every conversation in the inbox. '
                  : ''}
                {noActions ? 'With no actions it will not do anything.' : ''}
              </span>
            </div>
          ) : null}

          <label className="mt-4 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => {
                draft.update({ active: event.target.checked })
              }}
            />
            Turn this on as soon as it is created
          </label>
        </section>
      ) : null}

      {error !== null && draft.step !== 4 ? (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--danger-strong)' }} role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-2">
        {draft.step > 1 ? (
          <Button
            variant="outline"
            onClick={() => {
              draft.setStep(Math.max(draft.step - 1, 1) as WizardStep)
            }}
          >
            Back
          </Button>
        ) : null}

        {draft.step < 4 ? (
          <Button onClick={next} disabled={error !== null}>
            Next step
          </Button>
        ) : (
          <Button
            disabled={create.isPending || noActions}
            onClick={() => {
              create.mutate()
            }}
          >
            Create workflow
          </Button>
        )}

        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            void navigate(`/inbox/${inboxId}/settings/workflows`)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

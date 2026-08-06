import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import {
  GuardrailWarning,
  SettingsSection,
  StickySaveBar,
  ThresholdSlider,
  Toggle,
} from '@/components/settings-primitives'
import { fetchUsers } from '@/features/inbox'
import { useAiSettingsForm } from '@/features/ai/hooks/use-ai-settings-form'
import { InstructionsField } from '@/features/ai/components/InstructionsField'
import { KnowledgeUsage } from '@/features/ai/components/KnowledgeUsage'
import { NumberField, RiskSettingsShell } from './RiskSettingsShell'

/* ------------------------------------------------------------- silent churn */

export function SilentChurnSettingsPage() {
  const form = useAiSettingsForm()
  if (form.settings === null) return <RiskSettingsShell title="Silent churn" />

  const churn = form.settings.silentChurn
  const patch = (next: Partial<typeof churn>) => {
    form.update({ silentChurn: { ...churn, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Silent churn"
          description="Accounts drifting away without complaining. Every alert says why in a sentence."
        />

        <SettingsSection title="Silent churn">
          <Toggle
            checked={churn.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Watch for accounts going quiet"
            description="Alerts appear on the customer profile and in the conversation sidebar."
          />
        </SettingsSection>

        <SettingsSection
          title="What to look for"
          description="The detector needs a pattern, not a single quiet week. These decide what counts as one."
        >
          <NumberField
            id="quiet-days"
            label="Silence before it starts looking"
            hint="Days since the customer last wrote in. Below this, quiet is just a quiet week."
            suffix="days"
            value={churn.quietDays}
            min={3}
            max={120}
            onChange={(quietDays) => {
              patch({ quietDays })
            }}
          />

          <div className="mt-4">
            <NumberField
              id="reopen-threshold"
              label="Reopens that count as a pattern"
              hint="Fewer than this in the window is bad luck rather than a signal."
              suffix="reopens"
              value={churn.reopenThreshold}
              min={2}
              max={10}
              onChange={(reopenThreshold) => {
                patch({ reopenThreshold })
              }}
            />
          </div>

          <div className="mt-4">
            <ThresholdSlider
              value={churn.minConfidence}
              onChange={(minConfidence) => {
                patch({ minConfidence })
              }}
              helper={(percent) =>
                `Alerts below ${String(percent)}% confidence are not raised. Every alert that is raised still has to explain itself in a sentence.`
              }
            />
          </div>

          {churn.minConfidence < 0.4 ? (
            <div className="mt-3">
              <GuardrailWarning>
                Below about 40% this raises more alerts than anybody reads, and a list nobody reads
                is the same as no detector at all.
              </GuardrailWarning>
            </div>
          ) : null}
        </SettingsSection>

        <InstructionsField
          title="How to write the reason"
          description="Guidance for this detector only. The reason is the alert, so this is the most useful field on the page."
          examples={[
            'Say what happened and over what period, not how worried to be.',
            '"Three reopens on billing sync in 18 days" beats "elevated churn risk".',
            'Name the product area if you can. It tells somebody who should pick it up.',
          ]}
          value={churn.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="silentChurn" />
      </div>

      <StickySaveBar
        dirty={form.dirty}
        note={form.dirty ? 'You have unsaved changes' : 'Everything is saved'}
        onDiscard={form.discard}
        onSave={form.save}
      />
    </div>
  )
}

/* ------------------------------------------------------------ refund threat */

export function RefundThreatSettingsPage() {
  const form = useAiSettingsForm()
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })

  if (form.settings === null) return <RiskSettingsShell title="Refund threat" />

  const refund = form.settings.refundThreat
  const patch = (next: Partial<typeof refund>) => {
    form.update({ refundThreat: { ...refund, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Refund threat"
          description="A banner on the conversation the moment a customer threatens to ask for their money back."
        />

        <SettingsSection title="Refund threat">
          <Toggle
            checked={refund.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Watch conversations in real time"
            description="This is the only risk detector that interrupts. It renders as a banner in the thread, not a badge."
          />
        </SettingsSection>

        <SettingsSection
          title="When it fires"
          description="This one interrupts, so it has to be right. A banner that cries wolf gets ignored, and then the real one is ignored too."
        >
          <ThresholdSlider
            value={refund.minConfidence}
            onChange={(minConfidence) => {
              patch({ minConfidence })
            }}
            helper={(percent) =>
              `Below ${String(percent)}% confidence no banner appears at all. The detection is still recorded for calibration.`
            }
          />

          {refund.minConfidence < 0.6 ? (
            <div className="mt-3">
              <GuardrailWarning>
                Below about 60% this will fire on customers asking how refunds work. Agents learn to
                dismiss the banner without reading it, which is worse than not having it.
              </GuardrailWarning>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="What Escalate does"
          description="The banner has one action. This decides where it goes."
        >
          <label htmlFor="escalate-to" className="text-[14px] font-medium">
            Escalate to
          </label>
          <div className="mt-2 mb-4">
            <Select
              value={refund.escalateToUserId ?? ''}
              onChange={(value) => {
                patch({ escalateToUserId: value === '' ? null : value })
              }}
              options={[
                { value: '', label: 'Whoever leads the inbox' },
                ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
              ]}
              aria-label="Escalate to"
            />
          </div>

          <Toggle
            checked={refund.postInternalNote}
            onChange={(postInternalNote) => {
              patch({ postInternalNote })
            }}
            label="Post an internal note on the conversation"
            description="So the thread carries its own record of why it was escalated. The note is internal and never reaches the customer."
          />
        </SettingsSection>

        <InstructionsField
          title="What counts as a threat"
          description="Guidance for this detector only. The difference between a question and a threat is the whole job here."
          examples={[
            'A customer asking how refunds work is not threatening one.',
            'Fire on intent to leave or to reverse a charge, not on the word refund.',
            'Mentioning a chargeback or their bank is always a threat, whatever the tone.',
          ]}
          value={refund.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="refundThreat" />
      </div>

      <StickySaveBar
        dirty={form.dirty}
        note={form.dirty ? 'You have unsaved changes' : 'Everything is saved'}
        onDiscard={form.discard}
        onSave={form.save}
      />
    </div>
  )
}

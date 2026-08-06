import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import {
  GuardrailWarning,
  SettingsSection,
  StickySaveBar,
  Toggle,
} from '@/components/settings-primitives'
import { HEALTH_BANDS } from '@/types'
import { useAiSettingsForm } from '@/features/ai/hooks/use-ai-settings-form'
import { InstructionsField } from '@/features/ai/components/InstructionsField'
import { KnowledgeUsage } from '@/features/ai/components/KnowledgeUsage'
import { NumberField, RiskSettingsShell } from './RiskSettingsShell'

/* ------------------------------------------------------------- health score */

const SIGNAL_ROWS = [
  {
    key: 'repeatIssues' as const,
    label: 'Repeat issues',
    hint: 'The same topic coming back, weighted higher when the earlier ticket was reopened.',
  },
  {
    key: 'resolutionDrift' as const,
    label: 'Resolution time drift',
    hint: "Time to resolve against this account's own baseline, not the workspace average.",
  },
  {
    key: 'responseLatency' as const,
    label: 'Response latency',
    hint: 'First reply times against the SLA target on their plan.',
  },
  {
    key: 'escalationRate' as const,
    label: 'Escalation rate',
    hint: 'How often their conversations need a lead.',
  },
  {
    key: 'sentimentTrend' as const,
    label: 'Sentiment trend',
    hint: 'Feeds in the direction from the sentiment detector, if that one is on.',
  },
]

export function HealthScoreSettingsPage() {
  const form = useAiSettingsForm()
  if (form.settings === null) return <RiskSettingsShell title="Health score" />

  const health = form.settings.healthScore
  const patch = (next: Partial<typeof health>) => {
    form.update({ healthScore: { ...health, ...next } })
  }
  const on = Object.values(health.signals).filter(Boolean).length

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Health score"
          description="A 0 to 100 risk score per account, with the sub signals that produced it."
        />

        <SettingsSection title="Health score">
          <Toggle
            checked={health.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Score accounts"
            description="The score and its breakdown appear on the customer profile and in the conversation sidebar."
          />
        </SettingsSection>

        <SettingsSection
          title="Sub signals"
          description="Each contributes points, and the points sum to the score. Turning one off removes its points, not just its row."
        >
          <div className="flex flex-col gap-3">
            {SIGNAL_ROWS.map((row) => (
              <Toggle
                key={row.key}
                checked={health.signals[row.key]}
                onChange={(value) => {
                  patch({ signals: { ...health.signals, [row.key]: value } })
                }}
                label={row.label}
                description={row.hint}
              />
            ))}
          </div>

          {on === 0 ? (
            <div className="mt-3">
              <GuardrailWarning>
                Every signal is off, so every account scores zero and reads as healthy. That is
                worse than switching the feature off, because it looks like an answer.
              </GuardrailWarning>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="Bands"
          description="Three bands rather than a gradient, because nobody can act on the difference between 61 and 64."
        >
          <NumberField
            id="watch-at"
            label={`${HEALTH_BANDS.watch.label} band starts at`}
            hint="Below this an account reads as healthy."
            value={health.watchAt}
            min={1}
            max={health.atRiskAt - 1}
            onChange={(watchAt) => {
              patch({ watchAt })
            }}
          />
          <div className="mt-4">
            <NumberField
              id="at-risk-at"
              label={`${HEALTH_BANDS.at_risk.label} band starts at`}
              hint="At or above this the account is flagged everywhere it appears."
              value={health.atRiskAt}
              min={health.watchAt + 1}
              max={100}
              onChange={(atRiskAt) => {
                patch({ atRiskAt })
              }}
            />
          </div>
          <div className="mt-4">
            <NumberField
              id="trend-days"
              label="Trend covers"
              hint="How far back the trend line runs. A current score with no history cannot tell you whether it is improving."
              suffix="days"
              value={health.trendDays}
              min={14}
              max={365}
              onChange={(trendDays) => {
                patch({ trendDays })
              }}
            />
          </div>
        </SettingsSection>

        <InstructionsField
          title="Scoring guidance"
          description="Guidance for scoring only. This is where the context a number cannot carry gets written down."
          examples={[
            'A trial account with a lot of setup questions is not unhealthy, it is new.',
            'Weight repeat issues on the same topic above a spread of unrelated ones.',
            'Enterprise accounts run slower by design. Do not read that as drift.',
          ]}
          value={health.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="healthScore" />
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

/* ---------------------------------------------------------- sentiment drift */

export function SentimentDriftSettingsPage() {
  const form = useAiSettingsForm()
  if (form.settings === null) return <RiskSettingsShell title="Sentiment drift" />

  const drift = form.settings.sentimentDrift
  const patch = (next: Partial<typeof drift>) => {
    form.update({ sentimentDrift: { ...drift, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Sentiment drift"
          description="Sentiment across an account's recent tickets, so one bad conversation does not read as a decline."
        />

        <SettingsSection title="Sentiment drift">
          <Toggle
            checked={drift.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Track sentiment per account"
            description="Per ticket sentiment is scored either way. This decides whether the account level trend is computed."
          />
        </SettingsSection>

        <SettingsSection
          title="Window"
          description="The trend compares two windows. Too few tickets in each and one bad day swings the mean."
        >
          <NumberField
            id="window-size"
            label="Tickets per window"
            hint="Five is usually enough that a single angry ticket cannot move the direction on its own."
            suffix="tickets"
            value={drift.windowSize}
            min={2}
            max={20}
            onChange={(windowSize) => {
              patch({ windowSize })
            }}
          />

          <div className="mt-4">
            <label htmlFor="min-drop" className="text-[14px] font-medium">
              Call it declining after a drop of
            </label>
            <p className="mt-0.5 mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Sentiment runs from minus one to plus one, so a drop of 0.25 is a quarter of the way
              from neutral to angry.
            </p>
            <Select
              value={String(drift.minDrop)}
              onChange={(value) => {
                patch({ minDrop: Number(value) })
              }}
              options={[
                { value: '0.15', label: '0.15, sensitive' },
                { value: '0.25', label: '0.25, balanced' },
                { value: '0.4', label: '0.4, only clear declines' },
              ]}
              aria-label="Call it declining after a drop of"
            />
          </div>

          <div className="mt-4">
            <Toggle
              checked={drift.alertOnDecline}
              onChange={(alertOnDecline) => {
                patch({ alertOnDecline })
              }}
              label="Alert when an account turns declining"
              description="Off, the trend is still shown. On, crossing into declining is announced once."
            />
          </div>
        </SettingsSection>

        <InstructionsField
          title="What counts as a decline"
          description="Guidance for the trend only. It changes what the detector reads as a run rather than noise."
          examples={[
            'One angry ticket after a good year is not a decline.',
            'Ignore tone in a language the customer does not normally write in.',
            'A terse reply from an engineer is not the same as an unhappy one.',
          ]}
          value={drift.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="sentimentDrift" />
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

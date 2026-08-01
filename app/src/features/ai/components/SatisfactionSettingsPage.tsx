import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import {
  GuardrailWarning,
  SettingsSection,
  StickySaveBar,
  Toggle,
} from '@/components/settings-primitives'
import { cn } from '@/lib/utils'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'

const AUDIENCES = [
  {
    value: 'everyone' as const,
    title: 'Everyone in the workspace',
    body: 'Agents see the dot on their own conversations and can act on it themselves.',
  },
  {
    value: 'leads' as const,
    title: 'Leads only',
    body: 'Useful where a predicted score next to someone’s name would read as a verdict on them.',
  },
]

export function SatisfactionSettingsPage() {
  const form = useAiSettingsForm()
  const settings = form.settings

  if (settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Predicted satisfaction" />
      </div>
    )
  }

  const satisfaction = settings.satisfaction
  const patch = (next: Partial<typeof satisfaction>) => {
    form.update({ satisfaction: { ...satisfaction, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Predicted satisfaction"
          description="Spot a conversation heading for a bad rating while you can still turn it around."
        />

        <SettingsSection title="Prediction">
          <Toggle
            checked={satisfaction.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Predict how a conversation will be rated"
            description="Shown as a small dot in the list and a panel on the conversation."
          />
        </SettingsSection>

        <SettingsSection
          title="Who can see it"
          description="A prediction is a triage aid. It is not a score anybody earned."
        >
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Visible to">
            {AUDIENCES.map((option) => {
              const selected = satisfaction.visibleTo === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!satisfaction.enabled}
                  onClick={() => {
                    patch({ visibleTo: option.value })
                  }}
                  className={cn('rounded-lg border p-3 text-left disabled:opacity-45')}
                  style={{
                    borderColor: selected ? 'var(--brand)' : 'var(--border)',
                    background: selected ? 'var(--brand-soft)' : 'var(--card)',
                  }}
                >
                  <p className="mb-0.5 text-[14px] font-medium">{option.title}</p>
                  <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    {option.body}
                  </p>
                </button>
              )
            })}
          </div>
        </SettingsSection>

        <SettingsSection title="Where it never appears">
          {/* FR-4.42 and FR-4.44 stated where someone configuring the feature will read them. */}
          <GuardrailWarning>
            Predictions are internal. They are never shown to a customer, never included in a reply,
            and never counted in the Company report team table, which uses only ratings customers
            actually gave.
          </GuardrailWarning>

          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            How well the prediction holds up is on the{' '}
            <Link to="/reports/satisfaction" style={{ color: 'var(--brand)' }}>
              Satisfaction report
            </Link>
            , with a confusion grid so the accuracy figure can be checked rather than trusted.
          </p>
        </SettingsSection>
      </div>

      <StickySaveBar dirty={form.dirty} note="" onDiscard={form.discard} onSave={form.save} />
    </div>
  )
}

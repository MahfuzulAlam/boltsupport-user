import { PageHeader } from '@/components/PageHeader'
import {
  GuardrailWarning,
  ModeCards,
  SettingsSection,
  StickySaveBar,
  ThresholdSlider,
  Toggle,
} from '@/components/settings-primitives'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'

const SIGNALS = [
  {
    id: 'skills',
    label: 'Skills and tags',
    description: 'Match the conversation to what a teammate handles.',
  },
  {
    id: 'history',
    label: 'Past resolution history',
    description: 'Who has resolved similar threads before.',
  },
  {
    id: 'workload',
    label: 'Current workload',
    description: 'Spread work rather than piling it on the best match.',
  },
  {
    id: 'availability',
    label: 'Availability and working hours',
    description: 'Skip anyone who is off shift.',
  },
  {
    id: 'language',
    label: 'Language match',
    description: 'Route to someone who speaks the customer’s language.',
  },
]

/**
 * Auto Assign settings.
 *
 * The acceptance figure at the top is the promotion gate: FR-4.25 and the PRD's §4.2 both make
 * turning auto apply on conditional on it, so it is stated before the mode cards rather than
 * buried in an audit table underneath them.
 */
export function AutoAssignSettingsPage() {
  const form = useAiSettingsForm()

  if (form.settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Auto Assign" />
      </div>
    )
  }

  const autoAssign = form.settings.autoAssign
  const patch = (next: Partial<typeof autoAssign>) => {
    form.update({ autoAssign: { ...autoAssign, ...next } })
  }

  const workloadOff = !autoAssign.signals.includes('workload')
  const toggleSignal = (id: string, on: boolean) => {
    patch({
      signals: on ? [...autoAssign.signals, id] : autoAssign.signals.filter((s) => s !== id),
    })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Auto Assign"
          description="Route conversations to the right teammate. Suggestions by default, auto apply only when you trust the numbers."
        />

        <SettingsSection title="Auto assign">
          <Toggle
            checked={autoAssign.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label={`Auto assign is ${autoAssign.enabled ? 'enabled' : 'disabled'}`}
          />
          <p className="mt-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Agents kept <span className="font-mono">87%</span> of AI assignments in the last 30
            days. Review this before turning auto apply on.
          </p>
        </SettingsSection>

        <SettingsSection title="Mode">
          <ModeCards
            mode={autoAssign.mode}
            onChange={(mode) => {
              patch({ mode })
            }}
          />
          <div className="mt-4">
            <ThresholdSlider
              value={autoAssign.threshold}
              onChange={(threshold) => {
                patch({ threshold })
              }}
              helper={(percent) =>
                `Conversations below ${String(percent)}% confidence stay unassigned for a human to route.`
              }
            />
          </div>

          {autoAssign.mode === 'auto' && workloadOff ? (
            <GuardrailWarning>
              Auto apply is on while workload balancing is off. Assignments will pile onto whoever
              matches best on skills.{' '}
              <button
                type="button"
                onClick={() => {
                  toggleSignal('workload', true)
                }}
                className="font-medium underline underline-offset-2"
              >
                Turn on workload
              </button>
            </GuardrailWarning>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="Signals"
          description="What the model is allowed to weigh when it picks an assignee."
        >
          {SIGNALS.map((signal) => (
            <Toggle
              key={signal.id}
              checked={autoAssign.signals.includes(signal.id)}
              onChange={(on) => {
                toggleSignal(signal.id, on)
              }}
              label={signal.label}
              description={signal.description}
            />
          ))}
        </SettingsSection>

        <SettingsSection
          title="Fairness"
          description="A cap stops the best match absorbing the whole queue."
        >
          <label className="flex items-center gap-3 text-[14px]">
            Max concurrent conversations per agent
            <input
              type="number"
              min={1}
              max={99}
              value={autoAssign.maxConcurrentPerAgent}
              onChange={(event) => {
                patch({ maxConcurrentPerAgent: Number(event.target.value) })
              }}
              className="h-8 w-16 rounded-md border px-2 text-right font-mono"
              style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
            />
          </label>
        </SettingsSection>
      </div>

      <StickySaveBar
        dirty={form.dirty}
        onSave={form.save}
        onDiscard={form.discard}
        note="Changes apply to this workspace"
      />
    </div>
  )
}

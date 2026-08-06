import { PageHeader } from '@/components/PageHeader'
import { SettingsSection, StickySaveBar, Toggle } from '@/components/settings-primitives'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'
import { InstructionsField } from './InstructionsField'
import { KnowledgeUsage } from './KnowledgeUsage'

/**
 * Summary settings.
 *
 * The feature had no settings page at all: the hub's Summary card pointed at Evaluation, so
 * clicking it took you somewhere plausible enough that nobody noticed for a while.
 *
 * The one decision worth thinking about here is `autoGenerate`. A summary that appears by itself
 * is read before the thread, which is exactly the point and exactly the risk, so it is off by
 * default and gated on a thread being long enough that reading it is genuinely slower.
 */
export function SummarySettingsPage() {
  const form = useAiSettingsForm()

  if (form.settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Summary" />
      </div>
    )
  }

  const summary = form.settings.summary
  const patch = (next: Partial<typeof summary>) => {
    form.update({ summary: { ...summary, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Summary"
          description="Condenses a thread so somebody can pick it up without reading all of it."
        />

        <SettingsSection title="Summary">
          <Toggle
            checked={summary.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Offer summaries"
            description="The panel appears on every conversation with a button to generate one."
          />
        </SettingsSection>

        <SettingsSection
          title="When it runs"
          description="A summary read instead of the thread is the point of the feature and the risk of it."
        >
          <Toggle
            checked={summary.autoGenerate}
            onChange={(autoGenerate) => {
              patch({ autoGenerate })
            }}
            label="Generate without being asked"
            description="Off, the panel waits for a click. On, a long thread arrives already summarised."
          />

          <div className="mt-4">
            <label htmlFor="min-messages" className="text-[14px] font-medium">
              Only for threads longer than
            </label>
            <p className="mt-0.5 mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Below this, reading the thread is quicker than reading about it.
            </p>
            <div className="flex items-center gap-2">
              <input
                id="min-messages"
                type="number"
                min={2}
                max={40}
                value={summary.minMessages}
                disabled={!summary.autoGenerate}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10)
                  if (!Number.isNaN(parsed))
                    patch({ minMessages: Math.min(40, Math.max(2, parsed)) })
                }}
                className="h-9 w-[88px] rounded-md border px-2.5 text-[14px] outline-none disabled:opacity-50"
                style={{ borderColor: 'var(--input)', background: 'var(--background)' }}
              />
              <span className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
                messages
              </span>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Shape" description="What a summary contains, and how long it runs.">
          <div className="mb-4 flex flex-col gap-2">
            {[
              {
                value: 'brief' as const,
                label: 'Brief',
                hint: 'Three or four bullets. Enough to answer "what is this".',
              },
              {
                value: 'detailed' as const,
                label: 'Detailed',
                hint: 'Bullets plus what the customer wants, what they already tried, and what is blocking it.',
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3"
                style={{
                  borderColor: summary.style === option.value ? 'var(--brand)' : 'var(--border)',
                }}
              >
                <input
                  type="radio"
                  name="summary-style"
                  aria-label={option.label}
                  checked={summary.style === option.value}
                  onChange={() => {
                    patch({ style: option.value })
                  }}
                  className="mt-0.5 size-4 accent-[color:var(--brand)]"
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{option.label}</span>
                  <span className="block text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <Toggle
            checked={summary.includeNextStep}
            onChange={(includeNextStep) => {
              patch({ includeNextStep })
            }}
            label="Suggest a next step"
            description="A line proposing what to do. It is a suggestion in a panel, never an action."
          />
        </SettingsSection>

        <InstructionsField
          description="Guidance for summaries only. Added to the workspace guidance, not instead of it."
          examples={[
            'Lead with what the customer is asking for, not with how long the thread is.',
            'If they have already tried something, say what, so nobody suggests it again.',
            'Never repeat an order number or card detail in the summary.',
          ]}
          value={summary.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="summary" />
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

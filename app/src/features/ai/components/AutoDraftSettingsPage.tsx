import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import {
  GuardrailWarning,
  SettingsSection,
  StickySaveBar,
  ThresholdSlider,
  Toggle,
} from '@/components/settings-primitives'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'

const TONES = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'formal', label: 'Formal' },
]

/**
 * Auto Draft settings.
 *
 * There is no "send automatically" control on this page, and there cannot be one: AI-1 puts a
 * human between every AI-written word and a customer, and the absence of the switch is how that
 * is enforced rather than a warning next to it.
 */
export function AutoDraftSettingsPage() {
  const form = useAiSettingsForm()
  const settings = form.settings

  if (settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Auto Draft" />
      </div>
    )
  }

  const autoDraft = settings.autoDraft
  const patch = (next: Partial<typeof autoDraft>) => {
    form.update({ autoDraft: { ...autoDraft, ...next } })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Auto Draft"
          description="Writes a reply for you to edit. Nothing it produces reaches a customer on its own."
        />

        <SettingsSection title="Auto draft">
          <Toggle
            checked={autoDraft.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Offer AI drafts in the composer"
            description="Invoked from the toolbar, the slash menu, or the palette. Never automatic."
          />
        </SettingsSection>

        <SettingsSection
          title="Voice"
          description="The starting point. An agent can override it per draft."
        >
          <Select
            value={autoDraft.defaultTone}
            options={TONES}
            onChange={(defaultTone) => {
              patch({ defaultTone: defaultTone as typeof autoDraft.defaultTone })
            }}
            aria-label="Default tone"
            className="mb-3 max-w-[240px]"
          />

          <Toggle
            checked={autoDraft.useKnowledgeBase}
            onChange={(useKnowledgeBase) => {
              patch({ useKnowledgeBase })
            }}
            label="Draw on published docs"
            description="Answers cite the article they came from. Drafts stay unsourced without this."
          />
        </SettingsSection>

        <SettingsSection
          title="Low confidence"
          description="Below this, one click Accept is disabled so the draft has to be read."
        >
          <ThresholdSlider
            value={autoDraft.lowConfidenceThreshold}
            onChange={(lowConfidenceThreshold) => {
              patch({ lowConfidenceThreshold })
            }}
            helper={(percent) =>
              `Under ${String(percent)}% the draft still appears, but it must be edited before it can be accepted.`
            }
          />

          <GuardrailWarning>
            There is no setting here that sends a draft automatically, and there will not be one.
            Every reply leaves because a person pressed Send.
          </GuardrailWarning>
        </SettingsSection>
      </div>

      <StickySaveBar dirty={form.dirty} note="" onDiscard={form.discard} onSave={form.save} />
    </div>
  )
}

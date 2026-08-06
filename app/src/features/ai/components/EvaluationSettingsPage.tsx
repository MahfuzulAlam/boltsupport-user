import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import {
  GuardrailWarning,
  SettingsSection,
  StickySaveBar,
  ThresholdSlider,
  Toggle,
} from '@/components/settings-primitives'
import type { EvalCriterion } from '@/types'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'
import { InstructionsField } from './InstructionsField'
import { KnowledgeUsage } from './KnowledgeUsage'

const CRITERIA: { key: EvalCriterion; label: string; hint: string }[] = [
  {
    key: 'accuracy',
    label: 'Accuracy',
    hint: 'Does the reply match what the knowledge sources actually say.',
  },
  {
    key: 'completeness',
    label: 'Completeness',
    hint: 'Was every question in the thread answered, including the one buried in paragraph three.',
  },
  { key: 'tone', label: 'Tone match', hint: 'Does it read the way your workspace writes.' },
  { key: 'clarity', label: 'Clarity', hint: 'Jargon, wall of text, buried instruction.' },
  {
    key: 'policy',
    label: 'Policy compliance',
    hint: 'Promises, refunds, dates, and anything else your instructions rule out.',
  },
]

/**
 * Check reply settings.
 *
 * /ai/evaluation was the QA dashboard and nothing else, so the one AI feature that inspects an
 * agent's own writing was the one with no way to configure it. The dashboard moved to its own
 * route and this took its place, which also makes the rail consistent: every item under AI is now
 * the settings for that feature.
 *
 * AI-6 is the line that cannot move: evaluation never blocks Send. `warnBeforeSend` decides
 * whether it speaks first, not whether it can stop you.
 */
export function EvaluationSettingsPage() {
  const form = useAiSettingsForm()

  if (form.settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Check reply" />
      </div>
    )
  }

  const evaluation = form.settings.evaluation
  const patch = (next: Partial<typeof evaluation>) => {
    form.update({ evaluation: { ...evaluation, ...next } })
  }

  const enabledCount = CRITERIA.filter((criterion) => evaluation.criteria[criterion.key]).length

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Check reply"
          description="Scores a reply before it goes out. It never blocks Send."
        />

        <SettingsSection title="Check reply">
          <Toggle
            checked={evaluation.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label="Offer a check before sending"
            description="An agent can run it on demand from the composer."
          />
        </SettingsSection>

        <SettingsSection
          title="Criteria"
          description="What each check looks at. Turning one off removes it from the score, not just from the display."
        >
          <div className="flex flex-col gap-3">
            {CRITERIA.map((criterion) => (
              <Toggle
                key={criterion.key}
                checked={evaluation.criteria[criterion.key]}
                onChange={(on) => {
                  patch({ criteria: { ...evaluation.criteria, [criterion.key]: on } })
                }}
                label={criterion.label}
                description={criterion.hint}
              />
            ))}
          </div>

          {enabledCount === 0 ? (
            <div className="mt-3">
              <GuardrailWarning>
                Every criterion is off, so a check has nothing to report. That is the same as
                switching the feature off, but harder to notice.
              </GuardrailWarning>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="When it speaks up"
          description="Sampling drives the coaching dashboard. Warning before send is separate, and per reply."
        >
          <Toggle
            checked={evaluation.warnBeforeSend}
            onChange={(warnBeforeSend) => {
              patch({ warnBeforeSend })
            }}
            label="Warn before sending a reply that scores badly"
            description="A notice above Send. Send stays enabled either way (AI-6)."
          />

          <div className="mt-4">
            <ThresholdSlider
              value={evaluation.samplingRate}
              onChange={(samplingRate) => {
                patch({ samplingRate })
              }}
              helper={(percent) =>
                `${String(percent)}% of sent replies are scored for the coaching dashboard.`
              }
            />
          </div>
        </SettingsSection>

        <InstructionsField
          title="What to flag"
          description="Guidance for checking only. This is where your policies become something a check can test."
          examples={[
            'Flag any reply that commits us to a date, a refund, or a custom build.',
            'Do not flag a short reply if the question was short.',
            'Treat an unanswered question as more serious than an awkward sentence.',
          ]}
          value={evaluation.instructions}
          onChange={(instructions) => {
            patch({ instructions })
          }}
          workspace={form.settings.workspaceInstructions}
        />

        <KnowledgeUsage feature="evaluation" />

        <Link
          to="/ai/evaluation/results"
          className="mb-4 flex items-center gap-1.5 rounded-lg border p-3.5 text-[14px]"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Coaching dashboard</span>
            <span className="block text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Scores across sampled replies, for coaching rather than ranking.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0" style={{ color: 'var(--brand)' }} />
        </Link>
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

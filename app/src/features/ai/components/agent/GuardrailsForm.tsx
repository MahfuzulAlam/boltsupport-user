import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ThresholdSlider, Toggle } from '@/components/settings-primitives'
import type { AiAgent } from '@/types'

export type Guardrails = AiAgent['guardrails']

interface GuardrailsFormProps {
  value: Guardrails
  onChange: (next: Guardrails) => void
  /** The wizard shows the switches only; the console adds topics and the threshold. */
  full?: boolean
}

/**
 * What the agent will not do.
 *
 * Every control here narrows the agent rather than widening it, which is the honest framing:
 * FR-4.50 puts answering and escalating inside its remit and everything else outside, so there
 * is nothing here that grants a new capability.
 */
export function GuardrailsForm({ value, onChange, full = false }: GuardrailsFormProps) {
  const [topic, setTopic] = useState('')

  const patch = (next: Partial<Guardrails>) => {
    onChange({ ...value, ...next })
  }

  const addTopic = () => {
    const trimmed = topic.trim()
    if (trimmed === '' || value.avoidTopics.includes(trimmed)) return
    patch({ avoidTopics: [...value.avoidTopics, trimmed] })
    setTopic('')
  }

  return (
    <div>
      <Toggle
        checked={value.escalateOnLowConfidence}
        onChange={(escalateOnLowConfidence) => {
          patch({ escalateOnLowConfidence })
        }}
        label="Escalate to a human when confidence is low"
        description="A guess that reads confidently is worse than a handover."
      />
      <Toggle
        checked={value.escalateOnRepeat}
        onChange={(escalateOnRepeat) => {
          patch({ escalateOnRepeat })
        }}
        label="Escalate when the customer asks twice"
        description="Asking again means the first answer did not land, whatever the model scored it."
      />
      <Toggle
        checked={value.businessHoursOnly}
        onChange={(businessHoursOnly) => {
          patch({ businessHoursOnly })
        }}
        label="Only respond during business hours"
        description="Outside hours the conversation waits in the inbox instead."
      />

      {full ? (
        <>
          <p className="mt-2 mb-1.5 text-[13px] font-medium">Topics to avoid</p>
          <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            The agent hands these straight to a person without attempting an answer.
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {value.avoidTopics.map((item) => (
              <span
                key={item}
                className="inline-flex h-7 items-center gap-1.5 rounded-[14px] px-2.5 text-[13px]"
                style={{ background: 'var(--muted)' }}
              >
                {item}
                <button
                  type="button"
                  onClick={() => {
                    patch({ avoidTopics: value.avoidTopics.filter((t) => t !== item) })
                  }}
                  aria-label={`Remove ${item}`}
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-2">
            <Input
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addTopic()
                }
              }}
              placeholder="Add a topic"
              aria-label="Add a topic to avoid"
              className="h-9 max-w-[260px]"
            />
          </div>

          <ThresholdSlider
            value={value.confidenceThreshold}
            onChange={(confidenceThreshold) => {
              patch({ confidenceThreshold })
            }}
            helper={(percent) =>
              `Below ${String(percent)}% the agent hands over instead of answering.`
            }
          />
        </>
      ) : (
        <p className="mt-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Business hours come from{' '}
          <Link to="/inbox/in1/settings/inbox-hours" style={{ color: 'var(--brand)' }}>
            inbox hours
          </Link>
          .
        </p>
      )}
    </div>
  )
}

import { Info } from 'lucide-react'
import { INSTRUCTIONS_MAX } from '@/types'
import { SettingsSection } from '@/components/settings-primitives'

interface InstructionsFieldProps {
  /** What this feature does, in the second person, to finish the sentence in the placeholder. */
  title?: string
  description: string
  /** Two or three real examples. Concrete beats abstract here by a wide margin. */
  examples: string[]
  value: string
  onChange: (value: string) => void
  /** The workspace wide guidance this is added to, shown so nobody repeats it. */
  workspace?: string
}

/**
 * The custom instructions field, one per feature.
 *
 * Every AI feature has one, and they are deliberately not one shared prompt: the sentence that
 * makes tagging correct ("a chargeback is never billing") is dead weight in a summary and would
 * cost accuracy if the two shared a field. Examples are part of the control rather than the docs,
 * because the difference between guidance that works and guidance that does nothing is whether it
 * is specific, and an empty box does not teach anybody that.
 */
export function InstructionsField({
  title = 'Custom instructions',
  description,
  examples,
  value,
  onChange,
  workspace,
}: InstructionsFieldProps) {
  const remaining = INSTRUCTIONS_MAX - value.length

  return (
    <SettingsSection title={title} description={description}>
      {workspace !== undefined && workspace.trim() !== '' ? (
        <div
          className="mb-3 flex gap-2 rounded-lg border p-2.5 text-[13px]"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <Info
            className="mt-0.5 size-3.5 shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="mb-0.5 font-medium">Workspace guidance already applies</p>
            <p style={{ color: 'var(--muted-foreground)' }}>{workspace}</p>
          </div>
        </div>
      ) : null}

      <textarea
        value={value}
        maxLength={INSTRUCTIONS_MAX}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        rows={5}
        aria-label={title}
        placeholder="Write it the way you would tell a new teammate on their first day."
        className="w-full rounded-md border px-3 py-2 text-[14px] leading-[1.55] outline-none"
        style={{ borderColor: 'var(--input)', background: 'var(--background)' }}
      />

      <div className="mt-1.5 flex items-start justify-between gap-4">
        <div className="min-w-0 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          <p className="mb-1">For example:</p>
          <ul className="flex flex-col gap-0.5">
            {examples.map((example) => (
              <li key={example} className="flex gap-1.5">
                <span aria-hidden="true">&middot;</span>
                <span className="min-w-0">{example}</span>
              </li>
            ))}
          </ul>
        </div>

        <span
          className="shrink-0 font-mono text-[12px]"
          style={{ color: remaining < 100 ? 'var(--warning-strong)' : 'var(--muted-foreground)' }}
        >
          {remaining}
        </span>
      </div>
    </SettingsSection>
  )
}

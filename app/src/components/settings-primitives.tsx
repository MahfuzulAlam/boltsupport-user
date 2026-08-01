import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="mb-4 rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
      {description !== undefined ? (
        <p className="mt-1 mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </section>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          onChange(!checked)
        }}
        className="relative mt-0.5 h-5 w-[34px] shrink-0 rounded-[10px] disabled:opacity-45"
        style={{ background: checked ? 'var(--brand)' : 'var(--muted)' }}
      >
        <span
          className="absolute top-[3px] size-3.5 rounded-full transition-[left] duration-150"
          style={{ left: checked ? 17 : 3, background: 'hsl(0 0% 100%)' }}
        />
      </button>
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{label}</p>
        {description !== undefined ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Mode as two cards rather than a dropdown.
 *
 * Suggest only versus auto apply is the single most consequential choice on these pages, and a
 * dropdown makes it look like a preference. Cards with their consequences spelled out make it
 * read like the decision it is.
 */
export function ModeCards({
  mode,
  onChange,
  autoDisabled,
  autoDisabledReason,
}: {
  mode: 'suggest' | 'auto'
  onChange: (mode: 'suggest' | 'auto') => void
  autoDisabled?: boolean
  autoDisabledReason?: string
}) {
  const options = [
    {
      value: 'suggest' as const,
      title: 'Suggest only',
      body: 'The AI proposes, a human accepts. Safest, and the default.',
      disabled: false,
    },
    {
      value: 'auto' as const,
      title: 'Auto apply above a threshold',
      body: 'Applied automatically when confident. Every action is logged with Undo.',
      disabled: autoDisabled === true,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          aria-pressed={mode === option.value}
          onClick={() => {
            onChange(option.value)
          }}
          className={cn('rounded-lg border-2 p-3 text-left', option.disabled && 'opacity-50')}
          title={option.disabled ? autoDisabledReason : undefined}
          style={{
            borderColor: mode === option.value ? 'var(--brand)' : 'var(--border)',
            background: mode === option.value ? 'var(--brand-soft)' : 'transparent',
          }}
        >
          <p className="text-[14px] font-semibold">{option.title}</p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {option.body}
          </p>
        </button>
      ))}
    </div>
  )
}

export function ThresholdSlider({
  value,
  onChange,
  helper,
}: {
  value: number
  onChange: (value: number) => void
  helper: (percent: number) => string
}) {
  const percent = Math.round(value * 100)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="threshold" className="text-[14px] font-medium">
          Confidence threshold
        </label>
        <span className="font-mono text-[14px]">{percent}%</span>
      </div>
      <input
        id="threshold"
        type="range"
        min={50}
        max={95}
        step={5}
        value={percent}
        onChange={(event) => {
          onChange(Number(event.target.value) / 100)
        }}
        className="w-full"
        style={{ accentColor: 'var(--brand)' }}
      />
      <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        {helper(percent)}
      </p>
    </div>
  )
}

export function GuardrailWarning({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
      style={{ background: 'var(--note)', border: '1px solid var(--warning)' }}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

/** Sticky save bar, disabled until something actually changed. */
export function StickySaveBar({
  dirty,
  onSave,
  onDiscard,
  note,
}: {
  dirty: boolean
  onSave: () => void
  onDiscard: () => void
  note: string
}) {
  return (
    <div
      className="sticky bottom-0 flex items-center gap-2 border-t px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        {note}
      </span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={!dirty}
        className="ml-auto h-8 rounded-md border px-3 text-[13px] disabled:opacity-45"
        style={{ borderColor: 'var(--border)' }}
      >
        Discard
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty}
        className="h-8 rounded-md px-3 text-[13px] font-medium disabled:opacity-45"
        style={{
          background: dirty ? 'var(--primary)' : 'var(--muted)',
          color: dirty ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
        }}
      >
        Save changes
      </button>
    </div>
  )
}

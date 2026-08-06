import { PageHeader } from '@/components/PageHeader'

/** What a risk settings page renders before its settings arrive. */
export function RiskSettingsShell({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
      <PageHeader title={title} />
    </div>
  )
}

/**
 * A bounded integer input with its own label and explanation.
 *
 * The risk pages are mostly thresholds, and a bare number box with a placeholder is how somebody
 * ends up setting a window of two and wondering why every account looks volatile. Clamping on
 * change rather than on blur means the field cannot hold a value the detector would reject.
 */
export function NumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}
      </label>
      <p className="mt-0.5 mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        {hint}
      </p>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            if (!Number.isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
          }}
          className="h-9 w-[96px] rounded-md border px-2.5 text-[14px] outline-none"
          style={{ borderColor: 'var(--input)', background: 'var(--background)' }}
        />
        {suffix === undefined ? null : (
          <span className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

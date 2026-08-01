import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  'aria-label': string
  className?: string
  disabled?: boolean
}

/**
 * A native select, deliberately.
 *
 * A rule builder puts three of these on every row. Native ones open instantly, type ahead
 * without any code, work on a phone, and cost nothing in the bundle, which matters more here
 * than matching the popover styling of the rest of the chrome.
 */
export function Select({ value, options, onChange, className, disabled, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        disabled={disabled}
        aria-label={rest['aria-label']}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="h-9 w-full appearance-none rounded-md border pr-7 pl-2.5 text-[13px] disabled:opacity-45"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--card)',
          color: 'var(--foreground)',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
        style={{ color: 'var(--muted-foreground)' }}
        aria-hidden="true"
      />
    </div>
  )
}

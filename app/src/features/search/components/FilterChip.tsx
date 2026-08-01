import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ChipOption {
  value: string
  label: string
}

interface FilterChipProps {
  label: string
  value: string
  options: ChipOption[]
  onChange: (value: string) => void
}

/**
 * One narrowing control.
 *
 * A chip shows its current value when set, so the applied filters are readable from the row
 * itself rather than only from the results shrinking.
 */
export function FilterChip({ label, value, options, onChange }: FilterChipProps) {
  const selected = options.find((option) => option.value === value)
  const isSet = value !== 'any'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[26px] items-center gap-1 rounded-[13px] border px-2.5 text-[12px] font-medium"
        style={{
          borderColor: isSet ? 'var(--brand)' : 'var(--border)',
          background: isSet ? 'var(--brand-soft)' : 'transparent',
          color: isSet ? 'var(--brand)' : 'var(--muted-foreground)',
        }}
      >
        {label}
        {isSet ? `: ${selected?.label ?? value}` : ''}
        <ChevronDown className="size-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => {
              onChange(option.value)
            }}
          >
            <Check
              className="size-3.5"
              style={{ opacity: option.value === value ? 1 : 0 }}
              aria-hidden="true"
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

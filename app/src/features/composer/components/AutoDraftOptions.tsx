import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AiLength, AiTone } from '@/types'
import type { DraftOptions } from '../hooks/use-auto-draft'

interface AutoDraftOptionsProps {
  options: DraftOptions
  onChange: (options: DraftOptions) => void
  onGenerate: () => void
  children: React.ReactNode
}

const TONES: AiTone[] = ['friendly', 'neutral', 'formal', 'apologetic']
const LENGTHS: AiLength[] = ['short', 'standard', 'detailed']

function Pills<T extends string>({
  label,
  values,
  active,
  onSelect,
}: {
  label: string
  values: readonly T[]
  active: T
  onSelect: (value: T) => void
}) {
  return (
    <div className="mb-3">
      <p className="eyebrow mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              onSelect(value)
            }}
            aria-pressed={active === value}
            className="h-7 rounded-md px-2.5 text-[13px] capitalize"
            style={{
              background: active === value ? 'var(--primary)' : 'var(--muted)',
              color: active === value ? 'var(--primary-foreground)' : 'var(--foreground)',
            }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Options chosen before generating, not after (FR-4.12).
 *
 * Asking first means the agent gets a draft in the register they wanted rather than rewriting
 * one they did not. "Use knowledge base" is the consequential switch: with it off there are no
 * citations to check the draft against, and the result comes back low confidence.
 */
export function AutoDraftOptions({
  options,
  onChange,
  onGenerate,
  children,
}: AutoDraftOptionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-[286px] p-3">
        <Pills
          label="Tone"
          values={TONES}
          active={options.tone}
          onSelect={(tone) => {
            onChange({ ...options, tone })
          }}
        />
        <Pills
          label="Length"
          values={LENGTHS}
          active={options.length}
          onSelect={(length) => {
            onChange({ ...options, length })
          }}
        />

        <div className="mb-3 flex items-center justify-between text-[13px]">
          <span>Language</span>
          <span style={{ color: 'var(--muted-foreground)' }}>{options.language}, detected</span>
        </div>

        {(
          [
            ['useKnowledgeBase', 'Use knowledge base'],
            ['includeNextSteps', 'Include next steps'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="mb-2 flex items-center justify-between text-[13px]">
            {label}
            <button
              type="button"
              role="switch"
              aria-checked={options[key]}
              aria-label={label}
              onClick={() => {
                onChange({ ...options, [key]: !options[key] })
              }}
              className="relative h-[18px] w-[30px] rounded-full"
              style={{ background: options[key] ? 'var(--brand)' : 'var(--muted)' }}
            >
              <span
                className="absolute top-[3px] size-3 rounded-full transition-[left] duration-150"
                style={{ left: options[key] ? 15 : 3, background: 'hsl(0 0% 100%)' }}
              />
            </button>
          </label>
        ))}

        <button
          type="button"
          onClick={onGenerate}
          className="mt-2 h-8 w-full rounded-md text-[13px] font-medium"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Generate draft
        </button>
      </PopoverContent>
    </Popover>
  )
}

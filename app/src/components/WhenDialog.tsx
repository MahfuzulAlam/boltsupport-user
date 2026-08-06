import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { parseWhen, type WhenPreset } from '@/lib/when'

/**
 * Whether the schedule should still fire once the customer has spoken.
 *
 * The two readings are genuinely different jobs. A snooze that wakes on a reply is a reminder to
 * chase; one that holds regardless is a deferral. A follow up that cancels itself when the
 * customer answers is the difference between attentive and annoying.
 */
export type WhenCondition = 'if-no-reply' | 'regardless'

export interface WhenChoice {
  at: Date
  condition: WhenCondition
}

interface WhenDialogProps {
  title: string
  /** Shown under the title, so the two dialogs are never confused for one another. */
  description: string
  presets: WhenPreset[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (choice: WhenChoice) => void
  /** Injected so the presets and the parser agree, and so tests are not racing the clock. */
  now: Date
}

const CONDITION_LABEL: Record<WhenCondition, string> = {
  'if-no-reply': 'If no reply',
  regardless: 'Regardless',
}

/**
 * The shared shell behind Snooze and Send later.
 *
 * Both ask for a moment and a condition, so they are one component with different words rather
 * than two that will drift apart. Typing beats picking here: the field reads "8 am", "3 days" or
 * "Aug 7", and the presets underneath cover the three answers that come up most.
 */
export function WhenDialog({
  title,
  description,
  presets,
  open,
  onOpenChange,
  onChoose,
  now,
}: WhenDialogProps) {
  const [typed, setTyped] = useState('')
  const [condition, setCondition] = useState<WhenCondition>('if-no-reply')

  const parsed = parseWhen(typed, now)
  const typing = typed.trim() !== ''

  const choose = (at: Date) => {
    onChoose({ at, condition })
    setTyped('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <DialogTitle className="text-[18px]">{title}</DialogTitle>
          <span className="sr-only">{description}</span>
        </DialogHeader>

        <div className="px-5 py-4">
          <div
            className="flex items-stretch overflow-hidden rounded-lg border"
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && parsed !== null) choose(parsed)
              }}
              // "When" rather than the title: the dialog already carries that name, and a field
              // whose label repeats its dialog tells a screen reader user nothing new.
              aria-label="When"
              placeholder="Try: 8 am, 3 days, Aug 7"
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[15px] outline-none"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Condition: ${CONDITION_LABEL[condition]}`}
                  className="flex shrink-0 items-center gap-2 border-l px-3.5 text-[15px]"
                  style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
                >
                  {CONDITION_LABEL[condition]}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                {(['if-no-reply', 'regardless'] as const).map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => {
                      setCondition(value)
                    }}
                  >
                    {CONDITION_LABEL[value]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* What the typed text resolved to, before anything is committed. Reading it back is
              what makes a language field safe to trust. */}
          {typing ? (
            <p className="mt-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {parsed === null ? (
                <span style={{ color: 'var(--danger-strong)' }}>
                  We could not read that. Try a time, a number of days, or a date.
                </span>
              ) : (
                <>
                  That is <span className="font-mono">{format(parsed, 'EEE d MMM, h:mm a')}</span>
                </>
              )}
            </p>
          ) : null}

          <ul className="mt-3 flex flex-col">
            {presets.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => {
                    choose(preset.at)
                  }}
                  /* Spelled out rather than left to the name computation, which runs the label
                     straight into the time with nothing between them. */
                  aria-label={`${preset.label}, ${format(preset.at, 'EEEE d MMMM, h:mm a')}`}
                  className="flex w-full items-center justify-between rounded-lg px-3.5 py-3 text-left text-[15px] hover:bg-[color:var(--hover)]"
                >
                  {preset.label}
                  <span
                    className="font-mono text-[13px]"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-hidden="true"
                  >
                    {format(preset.at, 'EEE, h:mm a')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

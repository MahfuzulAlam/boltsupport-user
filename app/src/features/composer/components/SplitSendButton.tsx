import { ChevronUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { shortcutDisplay } from '@/lib/shortcuts'

export type SendVariant = 'send' | 'send-close' | 'send-snooze' | 'send-later'

interface SplitSendButtonProps {
  label: string
  /**
   * What the button does, spelled out.
   *
   * The face of the button is one word so the row stays quiet, but "Send" alone is ambiguous
   * read aloud in a product where the same control can add an internal note or forward a thread
   * to somebody else. The visible word is contained in this, so the accessible name still
   * matches what a voice user would say (WCAG 2.5.3).
   */
  action: string
  disabled: boolean
  onSend: (variant: SendVariant) => void
}

const OPTIONS: { variant: SendVariant; label: string }[] = [
  { variant: 'send', label: 'Send' },
  { variant: 'send-close', label: 'Send and close' },
  { variant: 'send-snooze', label: 'Send and snooze' },
  { variant: 'send-later', label: 'Send later' },
]

/** Send is always a deliberate act, so the primary action is separate from its variants. */
export function SplitSendButton({ label, action, disabled, onSend }: SplitSendButtonProps) {
  return (
    <div className="flex">
      <button
        type="button"
        disabled={disabled}
        aria-label={action}
        onClick={() => {
          onSend('send')
        }}
        className="flex h-[34px] items-center gap-2 rounded-l-full px-4 text-[14px] font-medium disabled:opacity-45"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        {label}
        <kbd className="kbd" style={{ background: 'hsl(0 0% 100% / 0.18)', color: 'inherit' }}>
          {shortcutDisplay('send')}
        </kbd>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Send options"
            className="-ml-px flex h-[34px] w-[32px] items-center justify-center rounded-r-full disabled:opacity-45"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderLeft: '1px solid hsl(0 0% 100% / 0.2)',
            }}
          >
            <ChevronUp className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-[216px]">
          {OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.variant}
              onSelect={() => {
                onSend(option.variant)
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

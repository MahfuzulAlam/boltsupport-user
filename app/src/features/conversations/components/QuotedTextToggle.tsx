import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

interface QuotedTextToggleProps {
  children: React.ReactNode
}

/**
 * Collapses the quoted chain that email clients staple to every reply.
 *
 * Collapsed by default because after two or three exchanges the quote is longer than the
 * message, and an agent scanning a thread is looking for what is new.
 */
export function QuotedTextToggle({ children }: QuotedTextToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        aria-label={open ? 'Hide quoted text' : 'Show quoted text'}
        className="flex h-5 w-7 items-center justify-center rounded"
        style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {open ? (
        <div
          className="mt-2 pl-3 text-[14px]"
          style={{ borderLeft: '2px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

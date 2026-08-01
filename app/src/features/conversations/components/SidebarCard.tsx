import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarCardProps {
  title: string
  children: React.ReactNode
  /** A count or status shown next to the title, for panels that carry one. */
  meta?: React.ReactNode
  defaultOpen?: boolean
  /** Panels with nothing to fold, like the customer identity block. */
  collapsible?: boolean
}

/**
 * One panel in the right rail, as a bordered card.
 *
 * Dividers alone stop working once the rail holds six unrelated things: an agent scanning for the
 * licence state should be able to find where that panel starts without reading the one above it.
 * Giving each panel its own edge and its own surface makes the boundaries pre-attentive, which is
 * what a rail glanced at hundreds of times a day needs.
 *
 * The AI panels keep their own violet treatment and do not use this, because AI content is
 * deliberately not styled like product chrome.
 */
export function SidebarCard({
  title,
  children,
  meta,
  defaultOpen = true,
  collapsible = true,
}: SidebarCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  const heading = (
    <>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{title}</span>
      {meta !== undefined ? (
        <span className="shrink-0 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {meta}
        </span>
      ) : null}
    </>
  )

  return (
    <section
      className="mb-3 overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      aria-label={title}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value)
          }}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3.5 pt-3 pb-2 text-left"
        >
          {heading}
          <ChevronDown
            className={cn('size-4 shrink-0 transition-transform', !open && '-rotate-90')}
            style={{ color: 'var(--muted-foreground)' }}
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">{heading}</div>
      )}

      {open ? <div className="px-3.5 pb-3.5">{children}</div> : null}
    </section>
  )
}

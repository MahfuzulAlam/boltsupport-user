import { StickyNote, Reply } from 'lucide-react'
import { shortcutDisplay } from '@/lib/shortcuts'
import type { ComposerMode } from '@/features/composer'

interface ReplyBarProps {
  onOpen: (mode: ComposerMode) => void
  /** Set once a draft exists, so a half-written reply is never invisible behind a closed bar. */
  hasDraft: boolean
}

/**
 * The two ways to answer, at the end of the thread.
 *
 * Sticky rather than docked: the buttons sit at the natural end of the conversation, and they
 * stay reachable while scrolling back through it, so an agent checking an earlier message never
 * has to scroll down again to start replying. The composer only takes the space once it is
 * actually wanted, which is most of the screen back on a long thread.
 */
export function ReplyBar({ onOpen, hasDraft }: ReplyBarProps) {
  return (
    <div className="sticky bottom-0 z-10 flex justify-center pt-4 pb-1">
      <div
        className="flex items-center gap-2.5 rounded-xl border p-2 shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <button
          type="button"
          onClick={() => {
            onOpen('reply')
          }}
          className="flex h-10 items-center gap-2 rounded-lg px-4 text-[14px] font-medium"
          style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
        >
          <Reply className="size-4" aria-hidden="true" />
          Reply
          <kbd className="kbd" style={{ background: 'hsl(0 0% 100% / 0.18)', color: 'inherit' }}>
            {shortcutDisplay('reply')}
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpen('note')
          }}
          className="flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium"
          style={{ borderColor: 'var(--warning)', color: 'var(--warning-strong)' }}
        >
          <StickyNote className="size-4" aria-hidden="true" />
          Note
          <kbd className="kbd">{shortcutDisplay('note')}</kbd>
        </button>

        {hasDraft ? (
          <span className="pr-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
            Draft saved
          </span>
        ) : null}
      </div>
    </div>
  )
}

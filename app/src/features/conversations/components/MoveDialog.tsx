import { Check, Inbox as InboxIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Inbox } from '@/types'

interface MoveDialogProps {
  inboxes: Inbox[]
  currentInboxId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (inbox: Inbox) => void
}

/**
 * Where a conversation goes.
 *
 * A dialog rather than a submenu: moving a thread changes who is responsible for it, so it is
 * worth a deliberate step and enough room to show each inbox's address. The current inbox stays
 * in the list, marked, so it is obvious the move is a change of place rather than a copy.
 */
export function MoveDialog({
  inboxes,
  currentInboxId,
  open,
  onOpenChange,
  onMove,
}: MoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Move conversation</DialogTitle>
          <DialogDescription>
            The thread keeps its history. Its folder counts move with it.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-0.5">
          {inboxes.map((inbox) => {
            const current = inbox.id === currentInboxId
            return (
              <li key={inbox.id}>
                <button
                  type="button"
                  disabled={current}
                  onClick={() => {
                    onMove(inbox)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-[color:var(--hover)] disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <InboxIcon
                    className="size-4 shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{inbox.name}</span>
                    <span
                      className="block truncate text-[13px]"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {inbox.email}
                    </span>
                  </span>
                  {current ? (
                    <span
                      className="flex shrink-0 items-center gap-1 text-[13px]"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                      Here now
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

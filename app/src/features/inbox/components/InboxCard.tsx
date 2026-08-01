import { Link } from 'react-router-dom'
import { MoreHorizontal, Settings, Sparkles, SquarePen } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Inbox, Folder } from '@/types'
import type { AiInboxStats } from '@/features/ai'
import { ChannelIconRow } from './ChannelIconRow'

interface InboxCardProps {
  inbox: Inbox
  /** Only rendered when AI is enabled for the workspace. */
  aiStats?: AiInboxStats[string]
  /** Staggered entrance, in milliseconds. */
  delayMs: number
}

/** Folder rows in the order an agent triages them, not alphabetically. */
const FOLDER_ROWS: { folder: Folder; label: string }[] = [
  { folder: 'chats', label: 'Chats' },
  { folder: 'unassigned', label: 'Unassigned' },
  { folder: 'mine', label: 'Mine' },
  { folder: 'assigned', label: 'Assigned' },
  { folder: 'drafts', label: 'Drafts' },
  { folder: 'needs-attention', label: 'Needs attention' },
]

export function InboxCard({ inbox, aiStats, delayMs }: InboxCardProps) {
  const countFor = (folder: Folder): number => {
    switch (folder) {
      case 'chats':
        return inbox.counts.chat
      case 'unassigned':
        return inbox.counts.unassigned
      case 'mine':
        return inbox.counts.mine
      case 'assigned':
        return inbox.counts.assigned
      case 'drafts':
        return inbox.counts.drafts
      case 'needs-attention':
        return inbox.counts.needsAttention
      case 'closed':
        return inbox.counts.closed
      case 'spam':
        return inbox.counts.spam
    }
  }

  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border motion-safe:animate-[fadeup_160ms_ease-out_both]"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card)',
        animationDelay: `${String(delayMs)}ms`,
      }}
      aria-labelledby={`inbox-${inbox.id}-name`}
    >
      <header className="flex items-start gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2
            id={`inbox-${inbox.id}-name`}
            className="text-[16px] font-semibold tracking-[-0.01em]"
          >
            {inbox.name}
          </h2>
          <p className="truncate text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {inbox.email}
          </p>
        </div>
        <ChannelIconRow channels={inbox.channels} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${inbox.name}`}
              className="-mt-0.5 -mr-1 flex size-7 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
            >
              <MoreHorizontal className="size-4" style={{ color: 'var(--muted-foreground)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem asChild>
              <Link to={`/inbox/${inbox.id}/settings/general`}>Edit inbox</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/inbox/${inbox.id}/settings/channels`}>Connect channels</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/inbox/${inbox.id}/settings/permissions`}>Permissions</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 px-4 pb-3">
        {FOLDER_ROWS.map(({ folder, label }) => {
          const count = countFor(folder)
          const urgent = folder === 'needs-attention' && count > 0
          return (
            <Link
              key={folder}
              to={`/inbox/${inbox.id}/${folder}`}
              className="flex items-center justify-between rounded px-1 py-0.5 text-[13px] hover:bg-[color:var(--hover)]"
              style={urgent ? { color: 'var(--danger-strong)', fontWeight: 600 } : undefined}
            >
              <span>{label}</span>
              <span className="font-mono">{count}</span>
            </Link>
          )
        })}
      </div>

      {aiStats !== undefined ? (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px]"
          style={{ background: 'var(--ai-soft)', color: 'var(--ai)' }}
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
          <Link to="/reports/ai" className="hover:underline">
            AI resolved <span className="font-mono font-medium">{aiStats.resolved}</span> this week
          </Link>
          <Link to="/ai/auto-draft" className="hover:underline">
            <span className="font-mono font-medium">{aiStats.draftsSuggested}</span> drafts
            suggested
          </Link>
        </div>
      ) : null}

      <footer
        className="mt-auto flex items-center gap-2 border-t px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          to={`/inbox/${inbox.id}/new`}
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium hover:bg-[color:var(--hover)]"
          style={{ color: 'var(--brand)' }}
        >
          <SquarePen className="size-4" />
          New conversation
        </Link>
        <Link
          to={`/inbox/${inbox.id}/settings/general`}
          aria-label={`${inbox.name} settings`}
          className="ml-auto flex size-8 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
        >
          <Settings className="size-4" style={{ color: 'var(--muted-foreground)' }} />
        </Link>
      </footer>
    </section>
  )
}

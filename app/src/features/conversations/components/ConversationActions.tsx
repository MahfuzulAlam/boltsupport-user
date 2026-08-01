import {
  ArrowDown,
  ArrowUp,
  Ban,
  Bell,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerUpRight,
  EyeOff,
  FolderInput,
  LayoutPanelLeft,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { shortcutDisplay } from '@/lib/shortcuts'

export interface ConversationActionHandlers {
  onFollow: () => void
  onForward: () => void
  onMove: () => void
  onSpam: () => void
  onDelete: () => void
  onToggleDetails: () => void
  onToggleLayout: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onPrevious: (() => void) | null
  onNext: (() => void) | null
}

interface ConversationActionsProps extends ConversationActionHandlers {
  following: boolean
  followerCount: number
  detailsHidden: boolean
  wideLayout: boolean
}

/**
 * Everything an agent can do to the conversation as a whole.
 *
 * Three groups, and the order is the point. What changes the record comes first, what changes
 * how it reads sits in the middle, and moving on comes last, because that is the sequence of a
 * triage pass. Every item carries its key, so the menu teaches the map instead of competing
 * with it.
 */
export function ConversationActions({
  following,
  followerCount,
  detailsHidden,
  wideLayout,
  onFollow,
  onForward,
  onMove,
  onSpam,
  onDelete,
  onToggleDetails,
  onToggleLayout,
  onCollapseAll,
  onExpandAll,
  onPrevious,
  onNext,
}: ConversationActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Conversation actions"
          title="Conversation actions"
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
        >
          <MoreVertical className="size-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[236px]">
        <DropdownMenuItem onSelect={onFollow}>
          <Bell className="size-3.5" />
          {following ? 'Unfollow' : 'Follow'}
          <span
            className="ml-auto font-mono text-[12px]"
            style={{ color: 'var(--muted-foreground)' }}
            title={`${String(followerCount)} following`}
          >
            {followerCount}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onForward}>
          <CornerUpRight className="size-3.5" />
          Forward
          <kbd className="kbd ml-auto">{shortcutDisplay('forward')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onMove}>
          <FolderInput className="size-3.5" />
          Move
          <kbd className="kbd ml-auto">{shortcutDisplay('move')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onSpam}>
          <Ban className="size-3.5" />
          Spam
          <kbd className="kbd ml-auto">{shortcutDisplay('statusSpam')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="size-3.5" />
          Delete
          <kbd className="kbd ml-auto">{shortcutDisplay('remove')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onToggleDetails}>
          <EyeOff className="size-3.5" />
          {detailsHidden ? 'Show details' : 'Hide details'}
          <kbd className="kbd ml-auto">{shortcutDisplay('hideDetails')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onToggleLayout}>
          <LayoutPanelLeft className="size-3.5" />
          {wideLayout ? 'Regular layout' : 'Wide layout'}
          <kbd className="kbd ml-auto">{shortcutDisplay('layout')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onCollapseAll}>
          <ChevronsDownUp className="size-3.5" />
          Collapse all
          <kbd className="kbd ml-auto">{shortcutDisplay('collapseAll')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onExpandAll}>
          <ChevronsUpDown className="size-3.5" />
          Expand all
          <kbd className="kbd ml-auto">{shortcutDisplay('expandAll')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Disabled at the ends of the folder rather than hidden: an item that vanishes at the
            last conversation makes the menu a different shape every time it opens. */}
        <DropdownMenuItem
          disabled={onPrevious === null}
          onSelect={() => {
            onPrevious?.()
          }}
        >
          <ArrowUp className="size-3.5" />
          Previous conversation
          <kbd className="kbd ml-auto">{shortcutDisplay('listUp')}</kbd>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={onNext === null}
          onSelect={() => {
            onNext?.()
          }}
        >
          <ArrowDown className="size-3.5" />
          Next conversation
          <kbd className="kbd ml-auto">{shortcutDisplay('listDown')}</kbd>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

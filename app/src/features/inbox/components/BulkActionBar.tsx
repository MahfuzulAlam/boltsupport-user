import { Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ConvStatus, User } from '@/types'

interface BulkActionBarProps {
  count: number
  users: User[]
  onAssign: (userId: string | null) => void
  onStatus: (status: ConvStatus) => void
  onClear: () => void
}

const STATUS_OPTIONS: { value: ConvStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
]

/**
 * Replaces the column strip while anything is selected.
 *
 * The two AI actions never apply anything directly: they open a review step, because a bulk
 * change applied sight unseen across a selection is exactly the interaction that makes agents
 * turn AI features off.
 */
export function BulkActionBar({ count, users, onAssign, onStatus, onClear }: BulkActionBarProps) {
  return (
    <div
      className="flex h-11 flex-none items-center gap-2 border-b px-[18px] text-[13px]"
      style={{ background: 'var(--brand-soft)', borderColor: 'var(--border)' }}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="font-medium">
        <span className="font-mono">{count}</span> selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="h-7 rounded-md px-2 hover:bg-[color:var(--hover)]">
            Assign
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {users.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onSelect={() => {
                onAssign(user.id)
              }}
            >
              {user.name}
              <span className="ml-auto font-mono text-[12px] opacity-70">
                {user.openCount} open
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={() => {
              onAssign(null)
            }}
          >
            Unassign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="h-7 rounded-md px-2 hover:bg-[color:var(--hover)]">
            Status
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => {
                onStatus(option.value)
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="h-4 w-px" style={{ background: 'var(--border)' }} aria-hidden="true" />

      <button
        type="button"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 hover:bg-[color:var(--ai-soft)]"
        style={{ color: 'var(--ai)' }}
        onClick={() => {
          toast(`Review ${String(count)} tag changes before they apply`, {
            description: 'Nothing is tagged until you confirm. Arrives with Auto Tag in step 8.',
          })
        }}
      >
        <Sparkles className="size-3.5" />
        Apply AI tags
      </button>
      <button
        type="button"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 hover:bg-[color:var(--ai-soft)]"
        style={{ color: 'var(--ai)' }}
        onClick={() => {
          toast(`Review ${String(count)} assignments before they apply`, {
            description:
              'Nothing is assigned until you confirm. Arrives with Auto Assign in step 8.',
          })
        }}
      >
        <Sparkles className="size-3.5" />
        Auto assign
      </button>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto flex h-7 items-center gap-1 rounded-md px-2 hover:bg-[color:var(--hover)]"
      >
        <X className="size-3.5" />
        Clear
      </button>
    </div>
  )
}

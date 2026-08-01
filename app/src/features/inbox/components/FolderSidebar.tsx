import { NavLink, useNavigate } from 'react-router-dom'
import {
  Ban,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  Inbox as InboxIcon,
  MessageCircle,
  PenSquare,
  Plus,
  Settings,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { shortcutDisplay } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import type { Folder, Inbox, View } from '@/types'
import { useSidebar } from '../hooks/use-sidebar'

interface FolderSidebarProps {
  inbox: Inbox
  views: View[]
}

const FOLDERS: { folder: Folder; label: string; icon: LucideIcon }[] = [
  { folder: 'chats', label: 'Chats', icon: MessageCircle },
  { folder: 'unassigned', label: 'Unassigned', icon: InboxIcon },
  { folder: 'mine', label: 'Mine', icon: UserRound },
  { folder: 'drafts', label: 'Drafts', icon: PenSquare },
  { folder: 'needs-attention', label: 'Needs attention', icon: CircleAlert },
  { folder: 'assigned', label: 'Assigned', icon: Users },
  { folder: 'closed', label: 'Closed', icon: CheckCircle2 },
  { folder: 'spam', label: 'Spam', icon: Ban },
]

function countFor(inbox: Inbox, folder: Folder): number {
  const c = inbox.counts
  switch (folder) {
    case 'chats':
      return c.chat
    case 'unassigned':
      return c.unassigned
    case 'mine':
      return c.mine
    case 'drafts':
      return c.drafts
    case 'needs-attention':
      return c.needsAttention
    case 'assigned':
      return c.assigned
    case 'closed':
      return c.closed
    case 'spam':
      return c.spam
  }
}

/**
 * The folder rail, on the queue and on a single conversation alike.
 *
 * Collapsing keeps the folders reachable rather than hiding them: an agent triaging by keyboard
 * still needs to see that Needs attention has climbed while they were reading, so the collapsed
 * form keeps every icon and turns the counts into dots on the ones that carry weight.
 */
export function FolderSidebar({ inbox, views }: FolderSidebarProps) {
  const navigate = useNavigate()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      aria-label="Folders"
      className={cn(
        'flex flex-none flex-col border-r transition-[width] duration-150',
        collapsed ? 'w-[56px]' : 'w-[244px]',
      )}
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      <div className={cn('flex-1 overflow-y-auto pt-3.5', collapsed ? 'px-2' : 'px-2.5')}>
        <div className="mb-2 flex items-center gap-1">
          {collapsed ? null : (
            <h2 className="min-w-0 flex-1 truncate px-2 text-[18px] font-semibold tracking-[-0.01em]">
              {inbox.name}
            </h2>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand the folder list' : 'Collapse the folder list'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={cn(
              'flex size-8 items-center justify-center rounded-md hover:bg-[color:var(--hover)]',
              collapsed && 'mx-auto',
            )}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" style={{ color: 'var(--muted-foreground)' }} />
            ) : (
              <ChevronsLeft className="size-4" style={{ color: 'var(--muted-foreground)' }} />
            )}
          </button>
        </div>

        <nav aria-label="Folders">
          {FOLDERS.map(({ folder, label, icon: Icon }) => {
            const count = countFor(inbox, folder)
            const urgent = folder === 'needs-attention' && count > 0
            return (
              <NavLink
                key={folder}
                to={`/inbox/${inbox.id}/${folder}`}
                title={collapsed ? `${label}${count > 0 ? ` (${String(count)})` : ''}` : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-2.5 rounded-md text-[14px]',
                  collapsed ? 'justify-center px-0' : 'px-2.5',
                )}
                style={({ isActive }) => ({
                  background: isActive ? 'var(--brand-soft)' : undefined,
                  color: isActive ? 'var(--brand)' : urgent ? 'var(--danger-strong)' : undefined,
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                <Icon className="size-[17px] shrink-0" aria-hidden="true" />

                {collapsed ? (
                  /* A count has nowhere to go at this width, so only the one that means
                     "something is wrong" survives, as a dot. */
                  urgent ? (
                    <span
                      className="absolute top-1.5 right-1.5 size-2 rounded-full"
                      style={{ background: 'var(--danger)' }}
                      aria-hidden="true"
                    />
                  ) : null
                ) : (
                  <>
                    <span className="truncate">{label}</span>
                    {count > 0 ? (
                      urgent ? (
                        <span
                          className="ml-auto flex h-5 min-w-[22px] items-center justify-center rounded-[10px] px-1.5 font-mono text-[12px] font-medium"
                          style={{ background: 'var(--danger)', color: 'hsl(0 0% 100%)' }}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="ml-auto font-mono text-[13px] opacity-70">{count}</span>
                      )
                    ) : null}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {collapsed ? (
          <div className="my-2 h-px" style={{ background: 'var(--border)' }} aria-hidden="true" />
        ) : (
          <div className="mt-4 flex items-center justify-between px-2.5">
            <span className="eyebrow">Views</span>
            <button
              type="button"
              aria-label="Create a view"
              className="flex size-6 items-center justify-center rounded hover:bg-[color:var(--hover)]"
            >
              <Plus className="size-3.5" style={{ color: 'var(--muted-foreground)' }} />
            </button>
          </div>
        )}

        <nav aria-label="Saved views">
          {views.map((view) => {
            const isAi = view.system !== undefined
            return (
              <NavLink
                key={view.id}
                to={`/inbox/${inbox.id}/view/${view.id}`}
                title={collapsed ? `${view.name} (${String(view.count)})` : undefined}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-md text-[14px]',
                  collapsed ? 'justify-center px-0' : 'px-2.5',
                )}
                style={({ isActive }) => ({
                  background: isActive ? 'var(--brand-soft)' : undefined,
                  color: isActive ? 'var(--brand)' : isAi ? 'var(--ai)' : undefined,
                })}
              >
                {isAi ? <Sparkles className="size-3.5 shrink-0" aria-hidden="true" /> : null}

                {collapsed ? (
                  isAi ? null : (
                    /* Without an icon of its own, a saved view collapses to its initial. */
                    <span className="font-medium">{view.name.charAt(0)}</span>
                  )
                ) : (
                  <>
                    <span className="truncate">{view.name}</span>
                    <span
                      className="ml-auto font-mono text-[13px] opacity-70"
                      style={
                        view.system === 'at_risk' ? { color: 'var(--danger-strong)' } : undefined
                      }
                    >
                      {view.count}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div
        className={cn('flex flex-none items-center gap-2 border-t p-2.5', collapsed && 'flex-col')}
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          aria-label="Inbox settings"
          title="Inbox settings"
          onClick={() => void navigate(`/inbox/${inbox.id}/settings/general`)}
          className={cn(
            'flex h-9 items-center justify-center rounded-md border',
            collapsed ? 'w-9' : 'flex-1',
          )}
          style={{ borderColor: 'var(--border)' }}
        >
          <Settings className="size-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
        <button
          type="button"
          onClick={() => void navigate(`/inbox/${inbox.id}/new`)}
          aria-label="New conversation"
          title={`New conversation (${shortcutDisplay('compose')})`}
          className={cn(
            'flex h-9 items-center justify-center gap-2 rounded-md text-[14px] font-medium',
            collapsed ? 'w-9' : 'flex-[2]',
          )}
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {collapsed ? (
            <PenSquare className="size-4" />
          ) : (
            <>
              New
              <kbd
                className="kbd"
                style={{ background: 'hsl(0 0% 100% / 0.18)', color: 'inherit' }}
              >
                {shortcutDisplay('compose')}
              </kbd>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

import { NavLink, Outlet, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useInboxes } from '@/features/inbox'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

/**
 * The inbox settings rail.
 *
 * AI configuration is workspace level and lives under /ai, so it is a single link at the bottom
 * rather than a duplicated section per inbox: two copies of one setting is how a workspace ends
 * up with two different confidence thresholds and no idea which one is running.
 */
function groups(inboxId: string): NavGroup[] {
  const base = `/inbox/${inboxId}/settings`
  return [
    {
      title: 'General',
      items: [
        { to: `${base}/general`, label: 'Edit inbox' },
        { to: `${base}/channels`, label: 'Channels' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { to: `${base}/saved-replies`, label: 'Saved replies' },
        { to: `${base}/custom-fields`, label: 'Custom fields' },
      ],
    },
    {
      title: 'Automations',
      items: [
        { to: `${base}/workflows`, label: 'Workflows' },
        { to: `${base}/slas`, label: 'SLAs' },
        { to: `${base}/routing`, label: 'Routing' },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { to: `${base}/inbox-hours`, label: 'Inbox hours' },
        { to: `${base}/permissions`, label: 'Permissions' },
        { to: `${base}/outgoing-email`, label: 'Outgoing email' },
        { to: `${base}/auto-reply`, label: 'Auto reply' },
        { to: `${base}/satisfaction-ratings`, label: 'Satisfaction ratings' },
      ],
    },
  ]
}

export function SettingsLayout() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const inboxes = useInboxes()
  const inbox = (inboxes.data ?? []).find((item) => item.id === inboxId)

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] gap-6 px-6">
      <nav
        className="hidden w-[200px] shrink-0 overflow-y-auto py-6 md:block"
        aria-label="Inbox settings"
      >
        <p className="mb-3 truncate text-[15px] font-semibold">{inbox?.name ?? 'Inbox'}</p>

        {groups(inboxId).map((group) => (
          <div key={group.title} className="mb-4">
            <p className="eyebrow mb-1">{group.title}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex h-8 items-center rounded-md px-2.5 text-[13px]',
                    isActive ? 'font-medium' : 'hover:bg-[color:var(--hover)]',
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-soft)', color: 'var(--brand)' }
                    : { color: 'var(--foreground)' }
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <NavLink
          to="/ai"
          className="mt-2 flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px]"
          style={{ color: 'var(--ai)' }}
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI settings
        </NavLink>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}

import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Inbox as InboxIcon,
  Lock,
  Mail,
  MessageSquareReply,
  Reply,
  Route,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
  Workflow,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useInboxes } from '@/features/inbox'
import { SettingsNav, type SettingsNavGroup } from './SettingsNav'

/**
 * The inbox settings rail.
 *
 * AI configuration is workspace level and lives under /ai, so it is a single link at the bottom
 * rather than a duplicated section per inbox: two copies of one setting is how a workspace ends
 * up with two different confidence thresholds and no idea which one is running.
 */
function groups(inboxId: string): SettingsNavGroup[] {
  const base = `/inbox/${inboxId}/settings`
  return [
    {
      title: 'General',
      items: [
        { to: `${base}/general`, label: 'Edit inbox', icon: InboxIcon },
        { to: `${base}/channels`, label: 'Channels', icon: Send },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { to: `${base}/saved-replies`, label: 'Saved replies', icon: MessageSquareReply },
        { to: `${base}/custom-fields`, label: 'Custom fields', icon: SlidersHorizontal },
      ],
    },
    {
      title: 'Automations',
      items: [
        { to: `${base}/workflows`, label: 'Workflows', icon: Workflow },
        { to: `${base}/slas`, label: 'SLAs', icon: Timer },
        { to: `${base}/routing`, label: 'Routing', icon: Route },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { to: `${base}/inbox-hours`, label: 'Inbox hours', icon: Clock },
        { to: `${base}/permissions`, label: 'Permissions', icon: Lock },
        { to: `${base}/outgoing-email`, label: 'Outgoing email', icon: Mail },
        { to: `${base}/auto-reply`, label: 'Auto reply', icon: Reply },
        { to: `${base}/satisfaction-ratings`, label: 'Satisfaction ratings', icon: Star },
      ],
    },
  ]
}

export function SettingsLayout() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const navigate = useNavigate()
  const inboxes = useInboxes()
  const all = inboxes.data ?? []
  const inbox = all.find((item) => item.id === inboxId)

  return (
    <div className="flex h-full w-full">
      <SettingsNav
        label="Inbox settings"
        groups={groups(inboxId)}
        header={
          <>
            <Link
              to="/"
              className="mb-4 flex items-center gap-1 text-[14px]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back to inboxes
            </Link>

            {/* The inbox name is a switcher, not a heading. Settings are per inbox, and the thing
                an admin does after changing one is change the same one on the next. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Inbox: ${inbox?.name ?? 'Loading'}. Switch inbox`}
                  className="flex w-full items-center gap-1.5 rounded-md text-left text-[19px] font-semibold tracking-[-0.01em]"
                >
                  <span className="min-w-0 truncate">{inbox?.name ?? 'Inbox'}</span>
                  <ChevronDown
                    className="size-4 shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {all.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => {
                      void navigate(`/inbox/${item.id}/settings/general`)
                    }}
                  >
                    <InboxIcon className="size-3.5" />
                    {item.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        footer={
          <Link
            to="/ai"
            className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px]"
            style={{ color: 'var(--ai)' }}
          >
            <Sparkles className="size-[17px] shrink-0" aria-hidden="true" />
            AI settings
          </Link>
        }
      />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[820px] px-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

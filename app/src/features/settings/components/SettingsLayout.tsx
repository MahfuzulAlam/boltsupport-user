import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, Inbox as InboxIcon, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useInboxes } from '@/features/inbox'
import { inboxSettingsNav } from '../nav'
import { SettingsNav } from './SettingsNav'

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
        groups={inboxSettingsNav(inboxId)}
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

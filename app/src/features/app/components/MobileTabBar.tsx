import { Link, useLocation } from 'react-router-dom'
import { Inbox, PenSquare, Search, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MobileTabBarProps {
  defaultInboxId: string
  onOpenPalette: () => void
}

interface Tab {
  id: string
  label: string
  icon: LucideIcon
  to?: string
  action?: 'palette'
  match?: string
}

/** 58px, four targets, each at least 44px tall so they are comfortably tappable. */
export function MobileTabBar({ defaultInboxId, onOpenPalette }: MobileTabBarProps) {
  const { pathname } = useLocation()

  const tabs: Tab[] = [
    {
      id: 'inboxes',
      label: 'Inboxes',
      icon: Inbox,
      to: `/inbox/${defaultInboxId}/unassigned`,
      match: '/inbox',
    },
    { id: 'search', label: 'Search', icon: Search, action: 'palette' },
    {
      id: 'compose',
      label: 'Compose',
      icon: PenSquare,
      to: `/inbox/${defaultInboxId}/new`,
      match: '/new',
    },
    { id: 'profile', label: 'Profile', icon: UserRound, to: '/manage/users', match: '/manage' },
  ]

  return (
    <nav
      aria-label="Main"
      className="flex h-[58px] flex-none items-stretch border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      {tabs.map((tab) => {
        const active = tab.match !== undefined && pathname.startsWith(tab.match)
        const color = active ? 'var(--brand)' : 'var(--muted-foreground)'
        const content = (
          <>
            <tab.icon className="size-[19px]" />
            <span className="text-[12px]">{tab.label}</span>
          </>
        )

        return tab.action === 'palette' ? (
          <button
            key={tab.id}
            type="button"
            onClick={onOpenPalette}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5"
            style={{ color }}
          >
            {content}
          </button>
        ) : (
          <Link
            key={tab.id}
            to={tab.to ?? '/'}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5"
            style={{ color }}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

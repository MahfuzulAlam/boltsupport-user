import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, Search, Zap } from 'lucide-react'
import { useHasRoomForNav, useIsMobile } from '@/hooks/use-media-query'
import { shortcutDisplay } from '@/lib/shortcuts'
import type { NavGroup } from '../nav-config'
import { PrimaryNav } from './PrimaryNav'
import { NavSheet } from './NavSheet'
import { NotificationsPopover } from './NotificationsPopover'
import { UserMenu } from './UserMenu'

interface TopBarProps {
  nav: NavGroup[]
  searchRef: React.RefObject<HTMLInputElement | null>
  onOpenPalette: () => void
  onShowShortcuts: () => void
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
}

/**
 * The dark chrome bar, 56px, full width, no bottom border.
 *
 * It is the one surface that does not use the app's normal foreground colors: `--chrome` and its
 * companions exist so the bar reads as chrome rather than as content.
 */
export function TopBar({
  nav,
  searchRef,
  onOpenPalette,
  onShowShortcuts,
  sheetOpen,
  onSheetOpenChange,
}: TopBarProps) {
  const hasRoomForNav = useHasRoomForNav()
  const isMobile = useIsMobile()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <header
      className="relative z-40 flex h-[56px] flex-none items-center gap-0.5 px-3.5"
      style={{ background: 'var(--chrome)' }}
    >
      {!hasRoomForNav ? (
        <NavSheet nav={nav} open={sheetOpen} onOpenChange={onSheetOpenChange} />
      ) : null}

      <Link
        to="/"
        title="Workspace (G then H)"
        className="flex items-center gap-2 pr-3.5 text-white"
      >
        <Zap className="size-5" style={{ fill: 'var(--brand)', stroke: 'var(--brand)' }} />
        <span className="text-[16px] font-semibold tracking-[-0.015em]">BoltSupport</span>
      </Link>

      {hasRoomForNav ? <PrimaryNav nav={nav} /> : null}

      <div className="ml-auto flex items-center gap-1">
        {isMobile ? (
          <button
            type="button"
            aria-label="Search"
            onClick={onOpenPalette}
            className="flex size-11 items-center justify-center rounded-md"
            style={{ color: 'var(--chrome-foreground)' }}
          >
            <Search className="size-[18px]" />
          </button>
        ) : (
          <form
            ref={formRef}
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              onOpenPalette()
            }}
            className="flex h-[34px] w-[200px] items-center gap-2 rounded-md px-2.5 lg:w-[248px]"
            style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-hover)' }}
          >
            <Search className="size-4 shrink-0" style={{ color: 'var(--chrome-foreground)' }} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search"
              aria-label="Search"
              onFocus={onOpenPalette}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[color:var(--chrome-foreground)]"
            />
            <kbd
              className="kbd shrink-0"
              style={{ background: 'transparent', color: 'var(--chrome-foreground)' }}
            >
              {shortcutDisplay('search')}
            </kbd>
          </form>
        )}

        <NotificationsPopover />

        <button
          type="button"
          aria-label="Keyboard shortcuts"
          title={`Keyboard shortcuts (${shortcutDisplay('help')})`}
          onClick={onShowShortcuts}
          className="flex size-9 items-center justify-center rounded-md"
          style={{ color: 'var(--chrome-foreground)' }}
        >
          <CircleHelp className="size-[18px]" />
        </button>

        <UserMenu onShowShortcuts={onShowShortcuts} />
      </div>
    </header>
  )
}

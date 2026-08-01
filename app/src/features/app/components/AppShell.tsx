import { Suspense, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchInboxes } from '@/features/inbox'
import { useIsMobile } from '@/hooks/use-media-query'
import { buildPrimaryNav } from '../nav-config'
import { useShellShortcuts } from '../hooks/use-shell-shortcuts'
import { TopBar } from './TopBar'
import { MobileTabBar } from './MobileTabBar'
import { CommandPalette } from './CommandPalette'
import { ShortcutCheatSheet } from './ShortcutCheatSheet'

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6">
      <div className="h-7 w-48 animate-pulse rounded-md" style={{ background: 'var(--muted)' }} />
      <div
        className="mt-3 h-4 w-80 animate-pulse rounded-md"
        style={{ background: 'var(--muted)' }}
      />
    </div>
  )
}

/**
 * The persistent frame around every authenticated route: chrome bar, palette, cheat sheet, and
 * on narrow viewports a bottom tab bar.
 */
export function AppShell() {
  const isMobile = useIsMobile()
  const { data: inboxes } = useQuery({
    queryKey: ['inboxes'],
    queryFn: ({ signal }) => fetchInboxes(signal),
  })

  const defaultInboxId = inboxes?.[0]?.id ?? 'in1'
  const nav = useMemo(
    () => buildPrimaryNav(inboxes ?? [], defaultInboxId),
    [inboxes, defaultInboxId],
  )

  const shell = useShellShortcuts(defaultInboxId)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar
        nav={nav}
        searchRef={shell.searchRef}
        onOpenPalette={() => {
          shell.setPaletteOpen(true)
        }}
        onShowShortcuts={() => {
          shell.setCheatSheetOpen(true)
        }}
        sheetOpen={shell.sheetOpen}
        onSheetOpenChange={shell.setSheetOpen}
      />

      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {isMobile ? (
        <MobileTabBar
          defaultInboxId={defaultInboxId}
          onOpenPalette={() => {
            shell.setPaletteOpen(true)
          }}
        />
      ) : null}

      <CommandPalette open={shell.paletteOpen} onOpenChange={shell.setPaletteOpen} nav={nav} />
      <ShortcutCheatSheet open={shell.cheatSheetOpen} onOpenChange={shell.setCheatSheetOpen} />
    </div>
  )
}

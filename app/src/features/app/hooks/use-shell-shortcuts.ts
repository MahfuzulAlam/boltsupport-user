import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from '@/hooks/use-hotkeys'

interface ShellShortcuts {
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  cheatSheetOpen: boolean
  setCheatSheetOpen: (open: boolean) => void
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
  searchRef: React.RefObject<HTMLInputElement | null>
}

/**
 * Owns the shell's overlay state and binds the global half of the keyboard map.
 *
 * The list, conversation, and composer bindings are declared in `src/lib/shortcuts.ts` but bound
 * by the screens that own them, so a key never fires an action for a screen the agent is not
 * looking at.
 */
export function useShellShortcuts(defaultInboxId: string): ShellShortcuts {
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const go = useCallback(
    (to: string) => () => {
      void navigate(to)
    },
    [navigate],
  )

  useHotkeys({
    palette: () => {
      setPaletteOpen((open) => !open)
    },
    search: () => {
      // Focusing the field opens the palette, so / and Cmd+K reach the same place.
      searchRef.current?.focus()
      setPaletteOpen(true)
    },
    help: () => {
      setCheatSheetOpen((open) => !open)
    },
    compose: go(`/inbox/${defaultInboxId}/new`),
    goHome: go('/'),
    goInboxes: go(`/inbox/${defaultInboxId}/unassigned`),
    goDocs: go('/docs'),
    goReports: go('/reports/all-channels'),
    goCustomers: go('/customers'),
    goAi: go('/ai'),
    discard: () => {
      // Escape closes the topmost thing the shell owns. Radix handles its own dismissal, so
      // this only needs to cover the sheet.
      setSheetOpen(false)
    },
  })

  return {
    paletteOpen,
    setPaletteOpen,
    cheatSheetOpen,
    setCheatSheetOpen,
    sheetOpen,
    setSheetOpen,
    searchRef,
  }
}

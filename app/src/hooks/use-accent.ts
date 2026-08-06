import { create } from 'zustand'
import { applyAccent, currentMode, readStoredAccent, storeAccent, type Accent } from '@/lib/theme'

interface AccentState {
  accent: Accent
  setAccent: (accent: Accent) => void
}

/**
 * The accent an agent picks for themselves.
 *
 * Personal rather than workspace level: several people share an inbox and often several tabs of
 * it, and a distinct theme is the cheapest way to know at a glance whose window you are looking
 * at.
 *
 * The store holds the choice; `@/lib/theme` owns what a choice means. Initial state is read
 * straight from storage rather than through persistence middleware, because the variables are
 * already on the page by the time React mounts and the store's job is only to keep the UI in
 * step with them.
 */
export const useAccent = create<AccentState>()((set) => ({
  accent: readStoredAccent(),
  setAccent: (accent) => {
    applyAccent(accent, currentMode())
    storeAccent(accent)
    set({ accent })
  },
}))

/** Called by the theme toggle: each accent has a light and a dark value. */
export function reapplyAccent(): void {
  applyAccent(useAccent.getState().accent, currentMode())
}

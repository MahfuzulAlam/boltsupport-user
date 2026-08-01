import { useSyncExternalStore } from 'react'

/**
 * Breakpoints. The prototypes measure the root element with a ResizeObserver rather than using
 * media queries, but the thresholds are the same and a media query is cheaper and needs no
 * layout read.
 */
export const BREAKPOINTS = {
  /** Below this the shell collapses to a hamburger and a bottom tab bar. */
  mobile: 768,
  /** Below this the primary nav collapses and the split preview closes. */
  nav: 1180,
  /** Below this the conversation right rail becomes a drawer. */
  rail: 1280,
} as const

function subscribe(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => {
      list.removeEventListener('change', onChange)
    }
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    // No SSR here, but jsdom in tests can render before matchMedia is stubbed.
    () => false,
  )
}

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${String(BREAKPOINTS.mobile - 1)}px)`)
}

/** True when the full primary nav fits. Below this it moves into the sheet. */
export function useHasRoomForNav(): boolean {
  return useMediaQuery(`(min-width: ${String(BREAKPOINTS.nav)}px)`)
}

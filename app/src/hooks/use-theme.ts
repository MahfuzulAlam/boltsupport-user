import { create } from 'zustand'
import { reapplyAccent } from './use-accent'

export type Theme = 'light' | 'dark'

/** Theme is a display preference, not a credential, so localStorage is appropriate here.
 *  Auth tokens never go near it (NFR-2.5). */
const STORAGE_KEY = 'boltsupport.theme'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    // Private browsing and blocked storage should degrade to the system preference,
    // never throw during boot.
    return null
  }
}

function readSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Stored choice wins, then the system preference. NFR-4.3. */
export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? readSystemTheme()
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset['theme'] = theme
}

/** Call before the first render so the page never flashes the wrong theme. */
export function initTheme(): Theme {
  const theme = resolveInitialTheme()
  applyTheme(theme)
  return theme
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useTheme = create<ThemeState>()((set, get) => ({
  theme: resolveInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme)
    // Each accent has a light and a dark value, so flipping the mode has to recompute it.
    reapplyAccent()
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // A blocked write just means the choice does not survive a reload.
    }
    set({ theme })
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))

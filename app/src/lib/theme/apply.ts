import { accentTokens, isAccent, DEFAULT_ACCENT, type Accent, type Mode } from './accents'

const STORAGE_KEY = 'boltsupport.accent'

/**
 * Reads the stored accent.
 *
 * Plain localStorage rather than a persisted store, because this has to run before React does.
 * A store rehydrates on first access, which means an accent set on a previous visit would not
 * land until something happened to read it: the app would boot cobalt and repaint a moment
 * later, or never repaint at all if the preferences screen was never opened.
 */
export function readStoredAccent(): Accent {
  try {
    const stored: unknown = localStorage.getItem(STORAGE_KEY)
    return isAccent(stored) ? stored : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

export function storeAccent(accent: Accent): void {
  try {
    localStorage.setItem(STORAGE_KEY, accent)
  } catch {
    // A blocked write only costs persistence, not the theme in front of them.
  }
}

/** Whichever mode the document is currently in. The theme has to follow it, not guess. */
export function currentMode(): Mode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Writes an accent onto the root element.
 *
 * Inline on the element rather than into a stylesheet, so it beats both the `:root` block and
 * the `.dark` block without either of them having to know this feature exists. That keeps
 * `index.css` readable as the definition of the default theme.
 */
export function applyAccent(accent: Accent, mode: Mode = currentMode()): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(accentTokens(accent, mode))) {
    root.style.setProperty(name, value)
  }
  root.dataset['accent'] = accent
}

/**
 * Called once before the first render, next to `initTheme`.
 *
 * Doing it here rather than from a component is what stops the flash: by the time anything
 * paints, the variables are already the ones this person chose.
 */
export function initAccent(): Accent {
  const accent = readStoredAccent()
  applyAccent(accent)
  return accent
}

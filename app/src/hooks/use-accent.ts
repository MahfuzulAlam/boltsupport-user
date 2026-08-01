import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The accent an agent picks for themselves.
 *
 * Personal rather than workspace level: several people share an inbox and often several tabs of
 * it, and a distinct accent is the cheapest way to know at a glance whose window you are looking
 * at. It moves `--brand` and nothing else, so the meaning of the colour is untouched: it is still
 * links, active nav and the focus ring, just in a different hue.
 *
 * Violet and amber are deliberately absent. Those two are spoken for, AI and internal notes, and
 * letting someone paint the whole app in either would break the one visual rule the product
 * relies on to keep an AI draft distinguishable from human text.
 */
export type Accent = 'cobalt' | 'teal' | 'emerald' | 'rose' | 'slate'

interface AccentDefinition {
  label: string
  /** The swatch, and what --brand becomes in light mode. */
  light: string
  /** Lifted for dark mode, the same way the default tokens are. */
  dark: string
}

export const ACCENTS: Record<Accent, AccentDefinition> = {
  cobalt: { label: 'Cobalt', light: '222 89% 52%', dark: '218 92% 68%' },
  teal: { label: 'Teal', light: '190 90% 34%', dark: '187 80% 56%' },
  emerald: { label: 'Emerald', light: '158 74% 32%', dark: '156 62% 55%' },
  rose: { label: 'Rose', light: '340 76% 48%', dark: '340 82% 68%' },
  slate: { label: 'Slate', light: '222 30% 38%', dark: '218 24% 70%' },
}

export const ACCENT_LIST = Object.keys(ACCENTS) as Accent[]

/**
 * Writes the choice onto the root as overrides.
 *
 * Set on the element rather than in the sheet so it wins over both the light and the dark block
 * without either of them needing to know this feature exists.
 */
function applyAccent(accent: Accent): void {
  const root = document.documentElement
  const definition = ACCENTS[accent]
  const isDark = root.classList.contains('dark')
  const hsl = isDark ? definition.dark : definition.light

  root.style.setProperty('--brand', `hsl(${hsl})`)
  root.style.setProperty('--brand-soft', `hsl(${hsl} / ${isDark ? '0.16' : '0.1'})`)
  root.style.setProperty('--ring', `hsl(${hsl})`)
  root.dataset['accent'] = accent
}

interface AccentState {
  accent: Accent
  setAccent: (accent: Accent) => void
}

export const useAccent = create<AccentState>()(
  persist(
    (set) => ({
      accent: 'cobalt',
      setAccent: (accent) => {
        applyAccent(accent)
        set({ accent })
      },
    }),
    {
      name: 'boltsupport.accent',
      onRehydrateStorage: () => (state) => {
        // Re-apply after a reload, and again on a theme flip, so the hue follows the mode.
        if (state !== undefined) applyAccent(state.accent)
      },
    },
  ),
)

/** Called by the theme toggle, since each accent has a light and a dark value. */
export function reapplyAccent(): void {
  applyAccent(useAccent.getState().accent)
}

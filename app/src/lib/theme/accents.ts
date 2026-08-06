/**
 * The accent palette, and the rule that turns one of them into a whole theme.
 *
 * An accent is not a single colour. Picking "Teal" has to move the links, the active nav, the
 * focus ring, the top bar and the recessed panel behind the app together, or the result is a
 * blue product with a teal button in it. So each accent declares a hue and a saturation, and
 * every token is derived from that pair by one recipe shared across all of them.
 *
 * The one thing not derived is the brand lightness. Hues do not carry equal weight at the same
 * lightness: 52% cobalt clears AA on its own soft tint, 52% teal does not. Each accent therefore
 * pins the lightness its hue actually needs, and `accents.test.ts` holds every one of them to
 * the contrast floor rather than trusting that a formula got it right.
 */

export type Mode = 'light' | 'dark'

export interface AccentDefinition {
  label: string
  hue: number
  /** Saturation for the brand colour itself. Chrome and surfaces use their own, lower values. */
  saturation: number
  /** Contrast tuned per hue, not derived. See the note above. */
  lightness: { light: number; dark: number }
  /** Dark mode lifts the hue and drops the saturation so it does not glow. */
  darkSaturation: number
}

export const ACCENTS = {
  cobalt: {
    label: 'Cobalt',
    hue: 222,
    saturation: 89,
    lightness: { light: 52, dark: 68 },
    darkSaturation: 92,
  },
  teal: {
    label: 'Teal',
    hue: 190,
    saturation: 90,
    lightness: { light: 28, dark: 56 },
    darkSaturation: 80,
  },
  emerald: {
    label: 'Emerald',
    hue: 158,
    saturation: 74,
    lightness: { light: 27, dark: 55 },
    darkSaturation: 62,
  },
  rose: {
    label: 'Rose',
    hue: 340,
    saturation: 76,
    lightness: { light: 45, dark: 68 },
    darkSaturation: 82,
  },
  plum: {
    label: 'Plum',
    hue: 286,
    saturation: 52,
    lightness: { light: 44, dark: 66 },
    darkSaturation: 46,
  },
} as const satisfies Record<string, AccentDefinition>

export type Accent = keyof typeof ACCENTS

export const ACCENT_LIST = Object.keys(ACCENTS) as Accent[]

export const DEFAULT_ACCENT: Accent = 'cobalt'

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && value in ACCENTS
}

/**
 * Every variable an accent owns, as `name -> value`.
 *
 * Returned rather than written, so the same function serves the DOM, a test, and anything that
 * later wants to render a preview without touching the page.
 *
 * The surfaces carry only a trace of the hue. `--app` at 20% saturation reads as "a warm grey
 * that belongs to this theme" rather than as a colour, which is the point: the recessed panel
 * is background, and background that competes with content is a bug wearing a design.
 */
export function accentTokens(accent: Accent, mode: Mode): Record<string, string> {
  const { hue, saturation, darkSaturation, lightness } = ACCENTS[accent]
  const dark = mode === 'dark'

  const sat = dark ? darkSaturation : saturation
  const light = dark ? lightness.dark : lightness.light
  const brand = `hsl(${String(hue)} ${String(sat)}% ${String(light)}%)`

  /*
   * The two recessed neutrals, named once each.
   *
   * The token sheet gives `--muted`, `--hover`, `--secondary` and `--accent` one value, and
   * `--border` and `--input` another. Deriving them here from a single expression keeps that true:
   * the first version of this module tinted only muted and hover, so picking rose left every
   * dropdown highlight and ghost hover — which resolve through `--accent` — on the old cobalt grey,
   * a hand's width from rails that had moved. Two greys that disagree read as a rendering fault.
   */
  const recessed = dark ? `hsl(${String(hue)} 16% 17%)` : `hsl(${String(hue)} 14% 96%)`
  const line = dark ? `hsl(${String(hue)} 16% 19%)` : `hsl(${String(hue)} 13% 91%)`

  return {
    '--brand': brand,
    '--brand-soft': `hsl(${String(hue)} ${String(sat)}% ${String(light)}% / ${dark ? '0.16' : '0.1'})`,
    '--ring': brand,

    // The top bar. Deep enough that white text sits comfortably on it in either mode.
    '--chrome': dark ? `hsl(${String(hue)} 24% 12%)` : `hsl(${String(hue)} 46% 20%)`,

    // The recessed panel behind cards and rails.
    '--app': dark ? `hsl(${String(hue)} 20% 9%)` : `hsl(${String(hue)} 20% 98%)`,

    /*
     * The raised surfaces.
     *
     * White in light mode, so the hue is a no-op there and the card stays paper. In dark mode both
     * are tinted greys that sit directly on `--app`, and a card holding the old hue while the panel
     * behind it holds the new one is exactly the kind of mismatch the eye catches without being
     * able to name.
     */
    '--background': dark ? `hsl(${String(hue)} 26% 8%)` : 'hsl(0 0% 100%)',
    '--card': dark ? `hsl(${String(hue)} 22% 11%)` : 'hsl(0 0% 100%)',
    '--popover': dark ? `hsl(${String(hue)} 22% 11%)` : 'hsl(0 0% 100%)',

    // Neutrals that sit directly on the panel, tinted just enough to belong to it.
    '--muted': recessed,
    '--hover': recessed,

    // The same grey again, under the names shadcn's variants reach for.
    '--secondary': recessed,
    '--accent': recessed,

    '--border': line,
    '--input': line,
  }
}

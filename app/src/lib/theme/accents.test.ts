import { describe, expect, it } from 'vitest'
import { ratio } from '@/test/contrast'
import { ACCENTS, ACCENT_LIST, accentTokens, isAccent, type Mode } from './index'

/**
 * Every accent is held to the same floor as the default theme.
 *
 * The token sheet test reads `index.css`, so it cannot see these: an accent replaces those
 * variables at runtime. Without this, picking Teal would quietly ship text nobody with low
 * vision can read, and the suite would stay green.
 */

/** AA body text. Every accent clears the same floor the default theme does. */
const AA_TEXT = 4.5

const SURFACE: Record<Mode, string> = {
  light: 'hsl(0 0% 100%)',
  dark: 'hsl(224 24% 8%)',
}

const MODES: Mode[] = ['light', 'dark']

describe.each(ACCENT_LIST)('the %s accent', (accent) => {
  it.each(MODES)('reads as text on its own soft tint in %s mode', (mode) => {
    const tokens = accentTokens(accent, mode)
    const brand = tokens['--brand'] ?? ''
    const soft = tokens['--brand-soft'] ?? ''

    // A brand-coloured label on a brand-tinted chip is the commonest pairing in the product:
    // active nav rows, the Insert pill, the status pill, every AI affordance.
    expect(ratio(brand, soft, SURFACE[mode])).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(MODES)('reads as text on the plain surface in %s mode', (mode) => {
    const brand = accentTokens(accent, mode)['--brand'] ?? ''
    expect(ratio(brand, SURFACE[mode])).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(MODES)('carries white chrome text in %s mode', (mode) => {
    const chrome = accentTokens(accent, mode)['--chrome'] ?? ''
    // The top bar is white text on this, on every screen.
    expect(ratio('hsl(0 0% 100%)', chrome)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(MODES)('keeps its border visible against the panel in %s mode', (mode) => {
    const tokens = accentTokens(accent, mode)
    const border = tokens['--border'] ?? ''
    const app = tokens['--app'] ?? ''

    // A hairline that disappears into the panel is a card with no edge. This is the one ratio
    // that is deliberately below the text floor: a 3:1 border would be a frame.
    expect(ratio(border, app)).toBeGreaterThan(1.05)
  })
})

describe('the accent set', () => {
  it('leaves violet and amber alone', () => {
    /*
     * AI is violet and internal notes are amber, and those two meanings are the reason an agent
     * can tell a machine draft from a human one at a glance. An accent that repainted the whole
     * app in either would take the distinction away, so no accent may sit near those hues.
     */
    for (const accent of ACCENT_LIST) {
      const { hue } = ACCENTS[accent]
      expect(hue < 250 || hue > 275, `${accent} is too close to the AI violet`).toBe(true)
      expect(hue < 25 || hue > 55, `${accent} is too close to the note amber`).toBe(true)
    }
  })

  it('offers five to choose from, each with a name', () => {
    expect(ACCENT_LIST).toHaveLength(5)
    for (const accent of ACCENT_LIST) {
      expect(ACCENTS[accent].label).not.toBe('')
    }
  })

  it('rejects anything that is not one of them', () => {
    // Guards the stored value: a hand edited localStorage entry falls back rather than writing
    // `hsl(undefined ...)` into every variable on the page.
    expect(isAccent('cobalt')).toBe(true)
    expect(isAccent('chartreuse')).toBe(false)
    expect(isAccent(null)).toBe(false)
  })

  it('moves the surfaces, not only the brand', () => {
    const cobalt = accentTokens('cobalt', 'light')
    const rose = accentTokens('rose', 'light')

    // The whole point: picking an accent themes the app rather than recolouring one button.
    for (const token of ['--brand', '--chrome', '--app', '--muted', '--border']) {
      expect(cobalt[token], token).not.toBe(rose[token])
    }
  })
})

/**
 * Tokens the sheet writes with the brand hue that an accent deliberately leaves alone.
 *
 * Everything here is ink or a scrim: near black at 8-44% lightness, where the hue is a cast
 * nobody can name rather than a colour, and where rewriting it would move text contrast for no
 * visible gain. Anything not on this list has to be themed, which is what the test below checks.
 */
const INTENTIONALLY_FIXED = new Set([
  '--foreground',
  '--card-foreground',
  '--popover-foreground',
  '--muted-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary-foreground',
  '--accent-foreground',
  '--chrome-foreground',
  '--scrim',
])

describe('accent coverage', () => {
  /*
   * The sheet is the list of things that can go stale.
   *
   * `--secondary` and `--accent` were missed on the first pass, and since they hold the same grey
   * as `--muted`, nothing looked wrong until you opened a dropdown on a themed rail and found the
   * highlight still cobalt. Reading the sheet rather than restating it means a token added later
   * fails here instead of shipping half themed.
   */
  it('themes every hue carrying token in the sheet', () => {
    const sheets: Record<string, string> = import.meta.glob('/src/index.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    const sheet = sheets['/src/index.css'] ?? ''

    // The default theme is cobalt, so every variable built on it names a hue in the low 220s.
    const brandHued = [...sheet.matchAll(/(--[a-z-]+):\s*hsl\((2[12][0-9])\s/g)]
      .map((match) => match[1] ?? '')
      .filter((name) => !INTENTIONALLY_FIXED.has(name))

    expect(brandHued.length, 'the sheet stopped using cobalt; this test is now blind').toBeGreaterThan(5)

    const themed = new Set(Object.keys(accentTokens('rose', 'light')))
    const themedDark = new Set(Object.keys(accentTokens('rose', 'dark')))
    const missed = [...new Set(brandHued)].filter(
      (name) => !themed.has(name) && !themedDark.has(name),
    )

    expect(missed, 'these keep the cobalt hue after picking another accent').toEqual([])
  })
})

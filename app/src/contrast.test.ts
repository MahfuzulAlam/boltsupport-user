import { describe, expect, it } from 'vitest'
import { ratio } from './test/contrast'

/**
 * NFR-3.1: WCAG 2.1 AA contrast on all text and meaningful UI.
 *
 * axe cannot judge this under jsdom, which has no layout engine and reports every computed
 * colour as transparent. So the token sheet is checked directly: every pairing the product
 * actually renders, in both themes, against the ratio its size demands.
 *
 * This catches the class of mistake that produced `--warning-strong`: amber that looks fine in a
 * design tool and fails against white the moment it is used as body text.
 */

// Read through Vite rather than node:fs: under the test runner the module URL is an http one,
// and the lint rules ban node built-ins in tests for the same reason.
const SHEETS: Record<string, string> = import.meta.glob('/src/index.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const CSS = SHEETS['/src/index.css'] ?? ''

/** Pulls a token's value out of a `:root`-style block. */
function tokens(blockStart: string): Record<string, string> {
  const from = CSS.indexOf(blockStart)
  if (from === -1) throw new Error(`No block ${blockStart} in index.css`)
  const to = CSS.indexOf('\n}', from)
  const block = CSS.slice(from, to)

  const found: Record<string, string> = {}
  for (const match of block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    found[match[1] ?? ''] = (match[2] ?? '').trim()
  }
  return found
}

const LIGHT = tokens(':root {')
// The dark block overrides only what changes; everything else cascades from :root, so the dark
// sheet is the light one with those overrides laid on top.
const DARK = { ...LIGHT, ...tokens(".dark,\n[data-theme='dark'] {") }

/** AA: 4.5 for body text, 3.0 for large text and meaningful non-text UI. */
const PAIRINGS: { fg: string; bg: string; base?: string; min: number; where: string }[] = [
  { fg: '--foreground', bg: '--background', min: 4.5, where: 'body text' },
  { fg: '--foreground', bg: '--card', min: 4.5, where: 'text on a card' },
  { fg: '--foreground', bg: '--app', min: 4.5, where: 'text on the app ground' },
  { fg: '--foreground', bg: '--muted', min: 4.5, where: 'text on a muted fill' },
  { fg: '--muted-foreground', bg: '--background', min: 4.5, where: 'secondary text' },
  { fg: '--muted-foreground', bg: '--card', min: 4.5, where: 'secondary text on a card' },
  { fg: '--muted-foreground', bg: '--muted', min: 4.5, where: 'secondary text on a muted fill' },
  { fg: '--brand', bg: '--background', min: 4.5, where: 'links' },
  { fg: '--brand', bg: '--card', min: 4.5, where: 'links on a card' },
  { fg: '--brand', bg: '--brand-soft', base: '--card', min: 4.5, where: 'active nav item' },
  { fg: '--ai', bg: '--card', min: 4.5, where: 'AI headings' },
  { fg: '--ai', bg: '--ai-soft', base: '--card', min: 4.5, where: 'AI text on its own tint' },
  { fg: '--success-strong', bg: '--card', min: 4.5, where: 'success text' },
  { fg: '--success-strong', bg: '--success-soft', base: '--card', min: 4.5, where: 'success chip' },
  { fg: '--danger-strong', bg: '--card', min: 4.5, where: 'danger text' },
  {
    fg: '--danger-strong',
    bg: '--danger-soft',
    base: '--card',
    min: 4.5,
    where: 'breached SLA chip',
  },
  // The fills themselves only have to be distinguishable as non-text UI.
  { fg: '--success', bg: '--card', min: 3, where: 'success dot' },
  { fg: '--danger', bg: '--card', min: 3, where: 'danger dot' },
  { fg: '--warning', bg: '--card', min: 1.4, where: 'warning rail' },
  { fg: '--warning-strong', bg: '--card', min: 4.5, where: 'at risk SLA text' },
  { fg: '--warning-strong', bg: '--note', min: 4.5, where: 'note text on the amber fill' },
  { fg: '--chrome-foreground', bg: '--chrome', min: 4.5, where: 'top bar nav' },
  { fg: '--primary-foreground', bg: '--primary', min: 4.5, where: 'primary button label' },
  { fg: '--destructive-foreground', bg: '--destructive', min: 4.5, where: 'destructive button' },
  // Meaningful non-text UI: a focus ring nobody can see is a focus ring that does not exist.
  { fg: '--ring', bg: '--background', min: 3, where: 'focus ring' },
  { fg: '--ring', bg: '--card', min: 3, where: 'focus ring on a card' },
  { fg: '--border', bg: '--background', min: 1.2, where: 'separators' },
]

describe.each([
  { theme: 'light', sheet: LIGHT },
  { theme: 'dark', sheet: DARK },
])('$theme theme contrast', ({ sheet }) => {
  it.each(PAIRINGS)('$where meets $min:1', ({ fg, bg, base, min }) => {
    const foreground = sheet[fg]
    const background = sheet[bg]
    expect(foreground, `${fg} is missing`).toBeDefined()
    expect(background, `${bg} is missing`).toBeDefined()

    const measured = ratio(
      foreground as string,
      background as string,
      base === undefined ? undefined : sheet[base],
    )
    expect(
      Number(measured.toFixed(2)),
      `${fg} on ${bg} measured ${measured.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(min)
  })
})

describe('the type scale', () => {
  it('never goes below 11px', () => {
    // NFR-3.7. 11px is reserved for keyboard chips and micro labels; anything smaller is not
    // readable at arm's length on a laptop.
    const sizes = [...CSS.matchAll(/font-size:\s*(\d+)px/g)].map((match) => Number(match[1]))
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(11)
    }
  })
})

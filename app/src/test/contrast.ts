/**
 * WCAG contrast maths, shared by the token sheet test and the accent test.
 *
 * jsdom has no layout engine and no computed colour, so contrast cannot be measured from a
 * rendered page. It is computed from the values instead, which is stricter anyway: it checks the
 * definition rather than one instance of it.
 */

interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

/** Parses `hsl(H S% L%)` and `hsl(H S% L% / A)`, the only colour form the sheet uses. */
export function parseHsl(value: string): Rgb {
  const match = /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+))?\s*\)/.exec(value)
  if (match === null) throw new Error(`Not an hsl() value: ${value}`)

  const h = Number(match[1]) / 360
  const s = Number(match[2]) / 100
  const l = Number(match[3]) / 100
  const a = match[4] === undefined ? 1 : Number(match[4])

  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let value = t
    if (value < 0) value += 1
    if (value > 1) value -= 1
    if (value < 1 / 6) return p + (q - p) * 6 * value
    if (value < 1 / 2) return q
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
    return p
  }

  return {
    r: channel(h + 1 / 3) * 255,
    g: channel(h) * 255,
    b: channel(h - 1 / 3) * 255,
    a,
  }
}

/** Flattens a translucent colour onto its background, which is what the eye actually sees. */
function over(foreground: Rgb, background: Rgb): Rgb {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  }
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.039_28 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Contrast of text over a background, which may itself be a tint over a surface.
 *
 * The three-layer case is the one that matters: `--success-soft` is a 16% wash, so a chip is
 * really text over (tint over card). Treating the tint as opaque measures a colour nobody sees
 * and reports a ratio that is wrong in both directions.
 */
export function ratio(foreground: string, background: string, base?: string): number {
  const surface =
    base === undefined ? parseHsl(background) : over(parseHsl(background), parseHsl(base))
  const fg = over(parseHsl(foreground), surface)
  const light = Math.max(relativeLuminance(fg), relativeLuminance(surface))
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(surface))
  return (light + 0.05) / (dark + 0.05)
}

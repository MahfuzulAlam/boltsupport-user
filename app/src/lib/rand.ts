/**
 * Deterministic pseudo randomness for seed data.
 *
 * Seeds must be reproducible: a reload that reshuffles the inbox makes visual review and
 * tests both unreliable, and a snapshot test against random data is worthless. Every
 * generator here takes an explicit Rng so the whole dataset is a pure function of one number.
 */

export type Rng = () => number

/** mulberry32. Small, fast, and good enough for fixture data. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Inclusive of min, exclusive of max. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min))
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability
}

/**
 * Pick one item. Throws on an empty array rather than returning undefined, because with
 * noUncheckedIndexedAccess every caller would otherwise need a guard for a case that only
 * happens if the pool itself is a bug.
 */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) {
    throw new Error('pick() requires a non empty array')
  }
  return item
}

/** Pick up to `count` distinct items, preserving pool order. */
export function pickSome<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return shuffle(rng, items).slice(0, Math.min(count, items.length))
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = copy[i]
    const b = copy[j]
    if (a !== undefined && b !== undefined) {
      copy[i] = b
      copy[j] = a
    }
  }
  return copy
}

/** An ISO timestamp `minutesAgo` before the fixed clock. */
export function minutesBefore(clock: Date, minutesAgo: number): string {
  return new Date(clock.getTime() - minutesAgo * 60_000).toISOString()
}

/** An ISO timestamp `minutesAhead` after the fixed clock. */
export function minutesAfter(clock: Date, minutesAhead: number): string {
  return new Date(clock.getTime() + minutesAhead * 60_000).toISOString()
}

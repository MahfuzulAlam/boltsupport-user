import { describe, expect, it } from 'vitest'
import { format } from 'date-fns'
import { parseWhen, sendLaterPresets, snoozePresets } from './when'

/** A Wednesday at 15:20, so "next Monday" and "tomorrow" have unambiguous answers. */
const NOW = new Date('2026-08-05T15:20:00')

function readable(date: Date | null | undefined): string {
  return date === null || date === undefined ? 'null' : format(date, 'EEE d MMM yyyy HH:mm')
}

describe('parsing a typed moment', () => {
  it('reads a clock time as the next time it comes round', () => {
    // Already gone today, so it means tomorrow. Nobody types 8 am meaning seven hours ago.
    expect(readable(parseWhen('8 am', NOW))).toBe('Thu 6 Aug 2026 08:00')
    expect(readable(parseWhen('8am', NOW))).toBe('Thu 6 Aug 2026 08:00')
    expect(readable(parseWhen('5:30 pm', NOW))).toBe('Wed 5 Aug 2026 17:30')
    expect(readable(parseWhen('23:00', NOW))).toBe('Wed 5 Aug 2026 23:00')
  })

  it('reads a duration from now', () => {
    expect(readable(parseWhen('3 days', NOW))).toBe('Sat 8 Aug 2026 15:20')
    expect(readable(parseWhen('2 weeks', NOW))).toBe('Wed 19 Aug 2026 15:20')
    expect(readable(parseWhen('90 minutes', NOW))).toBe('Wed 5 Aug 2026 16:50')
    expect(readable(parseWhen('1 month', NOW))).toBe('Sat 5 Sep 2026 15:20')
  })

  it('reads a date either way round, and rolls a past one to next year', () => {
    expect(readable(parseWhen('Aug 7', NOW))).toBe('Fri 7 Aug 2026 08:00')
    expect(readable(parseWhen('7 Aug', NOW))).toBe('Fri 7 Aug 2026 08:00')
    // Already gone this year, so it means the one coming.
    expect(readable(parseWhen('Jan 4', NOW))).toBe('Mon 4 Jan 2027 08:00')
    expect(readable(parseWhen('Aug 7 2028', NOW))).toBe('Mon 7 Aug 2028 08:00')
  })

  it('reads the words an agent would actually say', () => {
    expect(readable(parseWhen('tomorrow', NOW))).toBe('Thu 6 Aug 2026 08:00')
    // The start of next week, not this same day seven days on.
    expect(readable(parseWhen('next week', NOW))).toBe('Mon 10 Aug 2026 08:00')
    // Never today: Monday said on a Monday means the Monday coming.
    expect(readable(parseWhen('monday', NOW))).toBe('Mon 10 Aug 2026 08:00')
  })

  it('returns null rather than guessing', () => {
    // Scheduling a reply for a date the agent did not mean is worse than saying we cannot read it.
    for (const input of ['', 'soon', 'when they reply', '25 pm', 'Aug 40', 'Smarch 3', '0 days']) {
      expect(parseWhen(input, NOW), input).toBeNull()
    }
  })
})

describe('the presets', () => {
  it('offers snooze options that all sit in the future', () => {
    for (const preset of snoozePresets(NOW)) {
      expect(preset.at.getTime(), preset.label).toBeGreaterThan(NOW.getTime())
    }
  })

  it('keeps every send later option inside working hours', () => {
    // A reply landing at three in the morning helps nobody, so the presets never produce one.
    for (const preset of sendLaterPresets(NOW)) {
      expect(preset.at.getHours(), preset.label).toBeGreaterThanOrEqual(8)
      expect(preset.at.getHours(), preset.label).toBeLessThanOrEqual(18)
    }
  })
})

describe('presets on a Saturday', () => {
  /** The day the two week-shaped options are most likely to land on the same date. */
  const SATURDAY = new Date('2026-08-01T22:00:00')

  it('keeps next week and next weekend apart', () => {
    const presets = snoozePresets(SATURDAY)
    const nextWeek = presets.find((p) => p.id === 'next-week')?.at
    const nextWeekend = presets.find((p) => p.id === 'next-weekend')?.at

    // Two rows offering the same moment make the menu look broken, and one of them is wrong.
    expect(readable(nextWeek)).toBe('Mon 3 Aug 2026 08:00')
    expect(readable(nextWeekend)).toBe('Sat 8 Aug 2026 08:00')
  })
})

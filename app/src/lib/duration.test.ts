import { describe, expect, it } from 'vitest'
import { formatAge, formatDuration, slaUrgency } from './duration'

describe('formatDuration', () => {
  it('shows seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('45s')
  })

  it('shows seconds alongside minutes under ten minutes, when they matter', () => {
    // This is the window where an agent decides whether to drop what they are doing.
    expect(formatDuration(9 * 60_000 + 30_000)).toBe('9m 30s')
  })

  it('drops seconds once past ten minutes', () => {
    expect(formatDuration(42 * 60_000)).toBe('42m')
  })

  it('shows hours and minutes', () => {
    expect(formatDuration(72 * 60_000)).toBe('1h 12m')
  })

  it('omits a zero remainder', () => {
    expect(formatDuration(2 * 60 * 60_000)).toBe('2h')
  })

  it('shows days and hours', () => {
    expect(formatDuration(2 * 24 * 60 * 60_000 + 16 * 60 * 60_000)).toBe('2d 16h')
  })

  it('formats an overdue duration the same way, sign carried by the caller', () => {
    expect(formatDuration(-80 * 60_000)).toBe('1h 20m')
  })
})

describe('formatAge', () => {
  const now = Date.parse('2026-07-31T10:00:00.000Z')

  it('reads naturally at each scale', () => {
    expect(formatAge('2026-07-31T09:59:30.000Z', now)).toBe('just now')
    expect(formatAge('2026-07-31T09:30:00.000Z', now)).toBe('30m')
    expect(formatAge('2026-07-31T05:00:00.000Z', now)).toBe('5h')
    expect(formatAge('2026-07-28T10:00:00.000Z', now)).toBe('3d')
  })

  it('never shows a negative age for a clock skewed future timestamp', () => {
    expect(formatAge('2026-07-31T11:00:00.000Z', now)).toBe('just now')
  })
})

describe('slaUrgency', () => {
  it('escalates as the deadline approaches', () => {
    expect(slaUrgency(4 * 60 * 60_000, false)).toBe('comfortable')
    expect(slaUrgency(42 * 60_000, false)).toBe('warning')
    expect(slaUrgency(12 * 60_000, false)).toBe('critical')
    expect(slaUrgency(-80 * 60_000, false)).toBe('breached')
  })

  it('reports paused regardless of the remaining time', () => {
    // A paused clock is not late, even when the original deadline has passed (FR-5.4).
    expect(slaUrgency(-80 * 60_000, true)).toBe('paused')
    expect(slaUrgency(4 * 60 * 60_000, true)).toBe('paused')
  })

  it('treats the thresholds as inclusive boundaries', () => {
    expect(slaUrgency(15 * 60_000, false)).toBe('critical')
    expect(slaUrgency(60 * 60_000, false)).toBe('warning')
    expect(slaUrgency(60 * 60_000 + 1, false)).toBe('comfortable')
  })
})

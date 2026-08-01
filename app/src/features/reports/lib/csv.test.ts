import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('CSV export', () => {
  it('survives a comment containing a comma', () => {
    const csv = toCsv([
      ['Customer', 'Comment'],
      ['Maya Chen', 'Fast, clear, and friendly'],
    ])
    expect(csv).toContain('"Fast, clear, and friendly"')
    // Two rows, not three: the comma must not have split the line.
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('doubles an embedded quote rather than breaking the field', () => {
    expect(toCsv([['He said "no"']])).toBe('"He said ""no"""')
  })

  it('keeps a newline inside one cell', () => {
    const csv = toCsv([['line one\nline two']])
    expect(csv).toBe('"line one\nline two"')
  })

  it('writes an empty cell for a missing value rather than the word undefined', () => {
    // The Company report exports a blank happiness score for anyone with no ratings, and
    // "undefined" in that column would read as a real value.
    expect(toCsv([['Ari Levin', 12, null, undefined]])).toBe('Ari Levin,12,,')
  })
})

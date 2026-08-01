/**
 * Compact duration formatting for SLA countdowns and waiting ages.
 *
 * Deliberately not date-fns: `formatDistanceToNowStrict` rounds to a single unit ("about 1 hour"),
 * which is useless on a countdown an agent is watching tick. These render two units at most, so
 * "1h 12m" stays readable in a 82px column while still being precise enough to act on.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms)

  if (abs < MINUTE) {
    return `${String(Math.floor(abs / 1000))}s`
  }
  if (abs < HOUR) {
    const minutes = Math.floor(abs / MINUTE)
    const seconds = Math.floor((abs % MINUTE) / 1000)
    // Under ten minutes the seconds matter, because that is when someone is deciding whether
    // to drop what they are doing.
    return minutes < 10 ? `${String(minutes)}m ${String(seconds)}s` : `${String(minutes)}m`
  }
  if (abs < DAY) {
    const hours = Math.floor(abs / HOUR)
    const minutes = Math.floor((abs % HOUR) / MINUTE)
    return minutes === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(minutes)}m`
  }
  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / HOUR)
  return hours === 0 ? `${String(days)}d` : `${String(days)}d ${String(hours)}h`
}

/** How long something has been waiting. Coarser than a countdown: no seconds. */
export function formatAge(from: string, now: number): string {
  const ms = Math.max(0, now - Date.parse(from))
  if (ms < MINUTE) return 'just now'
  if (ms < HOUR) return `${String(Math.floor(ms / MINUTE))}m`
  if (ms < DAY) return `${String(Math.floor(ms / HOUR))}h`
  return `${String(Math.floor(ms / DAY))}d`
}

export type SlaUrgency = 'paused' | 'breached' | 'critical' | 'warning' | 'comfortable'

/** Fixed thresholds rather than proportional ones, so the same colour always means the same
 *  amount of time left no matter which policy produced the deadline. */
export const SLA_CRITICAL_MS = 15 * MINUTE
export const SLA_WARNING_MS = 60 * MINUTE

export function slaUrgency(remainingMs: number, paused: boolean): SlaUrgency {
  if (paused) return 'paused'
  if (remainingMs < 0) return 'breached'
  if (remainingMs <= SLA_CRITICAL_MS) return 'critical'
  if (remainingMs <= SLA_WARNING_MS) return 'warning'
  return 'comfortable'
}

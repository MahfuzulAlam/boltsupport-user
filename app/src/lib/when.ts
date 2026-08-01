import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  nextSaturday,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns'

/**
 * Turning what an agent types into a moment.
 *
 * Snooze and Send later both ask the same question, and the answer is almost never a calendar
 * click: it is "8 am", "3 days", "Aug 7". A picker would make the common case slower than the
 * rare one, so the field takes language and the presets cover the rest.
 *
 * Everything here is pure and takes `now` explicitly, so the parsing is testable without
 * freezing the clock.
 */

/** The hour the working day starts. Every "morning" preset lands here. */
const MORNING = 8
const AFTERNOON = 14

function at(date: Date, hour: number): Date {
  return setSeconds(setMinutes(setHours(startOfDay(date), hour), 0), 0)
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * "Next week" means the start of it, not this same day seven days on.
 *
 * Seven days from now is what a calendar would say and not what anybody means. It also collides
 * with "next weekend" whenever today is a Saturday, which is precisely when an agent is most
 * likely to be pushing something into next week.
 */
function nextMonday(now: Date): Date {
  return addDays(startOfDay(now), (1 - now.getDay() + 7) % 7 || 7)
}

/** `8am`, `8 am`, `8:30 pm`, `14:00`. Returns the next time that clock reading comes round. */
function parseTime(input: string, now: Date): Date | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(input)
  if (match === null) return null

  const rawHour = Number(match[1])
  const minutes = match[2] === undefined ? 0 : Number(match[2])
  const meridiem = match[3]?.toLowerCase()

  if (minutes > 59) return null
  if (meridiem === undefined && rawHour > 23) return null
  if (meridiem !== undefined && (rawHour < 1 || rawHour > 12)) return null

  let hour = rawHour
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0

  const candidate = setSeconds(setMinutes(setHours(startOfDay(now), hour), minutes), 0)
  // A time that has already passed means tomorrow. Nobody types "8 am" meaning eight hours ago.
  return candidate.getTime() > now.getTime() ? candidate : addDays(candidate, 1)
}

/** `3 days`, `2 weeks`, `30 minutes`, `1 month`. */
function parseDuration(input: string, now: Date): Date | null {
  const match = /^(\d{1,3})\s*(minute|min|hour|hr|day|week|month)s?$/i.exec(input)
  if (match === null) return null

  const amount = Number(match[1])
  if (amount === 0) return null

  switch (match[2]?.toLowerCase()) {
    case 'minute':
    case 'min':
      return addMinutes(now, amount)
    case 'hour':
    case 'hr':
      return addHours(now, amount)
    case 'day':
      return addDays(now, amount)
    case 'week':
      return addWeeks(now, amount)
    case 'month':
      return addMonths(now, amount)
    default:
      return null
  }
}

/** `Aug 7`, `7 Aug`, `Aug 7 2027`. Without a year it means the next time that date comes round. */
function parseDate(input: string, now: Date): Date | null {
  const named = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i.exec(input)
  const reversed = /^(\d{1,2})\s+([a-z]{3,9})\.?(?:,?\s+(\d{4}))?$/i.exec(input)
  const match = named ?? reversed
  if (match === null) return null

  const monthText = (named === null ? match[2] : match[1])?.slice(0, 3).toLowerCase() ?? ''
  const day = Number(named === null ? match[1] : match[2])
  const month = MONTHS.indexOf(monthText)
  if (month === -1 || day < 1 || day > 31) return null

  const year = match[3] === undefined ? now.getFullYear() : Number(match[3])
  const candidate = at(new Date(year, month, day), MORNING)
  if (candidate.getMonth() !== month) return null

  return match[3] === undefined && candidate.getTime() <= now.getTime()
    ? at(new Date(year + 1, month, day), MORNING)
    : candidate
}

function parseKeyword(input: string, now: Date): Date | null {
  if (input === 'tomorrow') return at(addDays(now, 1), MORNING)
  if (input === 'today' || input === 'later today') return addHours(now, 3)
  if (input === 'next week') return at(nextMonday(now), MORNING)
  if (input === 'next weekend') return at(nextSaturday(now), MORNING)

  const weekday = WEEKDAYS.indexOf(input)
  if (weekday === -1) return null

  // The next one, never today: "Monday" said on a Monday means the Monday coming.
  const ahead = (weekday - now.getDay() + 7) % 7 || 7
  return at(addDays(now, ahead), MORNING)
}

/**
 * Parses a typed moment, or returns null when it cannot be read.
 *
 * Null is a real answer rather than a guess. Scheduling a reply for a date the agent did not mean
 * is worse than telling them the field did not understand.
 */
export function parseWhen(raw: string, now: Date): Date | null {
  const input = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (input === '') return null

  return (
    parseKeyword(input, now) ??
    parseTime(input, now) ??
    parseDuration(input, now) ??
    parseDate(input, now)
  )
}

export interface WhenPreset {
  id: string
  label: string
  at: Date
}

/** Snooze presets. The wording is what an agent would say out loud. */
export function snoozePresets(now: Date): WhenPreset[] {
  return [
    { id: 'later-today', label: 'Later today', at: addHours(now, 3) },
    { id: 'tomorrow', label: 'Tomorrow', at: at(addDays(now, 1), MORNING) },
    { id: 'next-week', label: 'Next week', at: at(nextMonday(now), MORNING) },
    { id: 'next-weekend', label: 'Next weekend', at: at(nextSaturday(now), MORNING) },
  ]
}

/** Send later presets, all inside working hours: a reply landing at 3am helps nobody. */
export function sendLaterPresets(now: Date): WhenPreset[] {
  return [
    { id: 'tomorrow-morning', label: 'Tomorrow morning', at: at(addDays(now, 1), MORNING) },
    { id: 'tomorrow-afternoon', label: 'Tomorrow afternoon', at: at(addDays(now, 1), AFTERNOON) },
    { id: 'monday-morning', label: 'Monday morning', at: at(nextMonday(now), MORNING) },
  ]
}

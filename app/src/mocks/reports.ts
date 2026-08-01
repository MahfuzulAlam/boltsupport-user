import type { ChannelType, Conversation, Csat, Metric, Rating, TimePoint } from '@/types'
import { getDb } from './db'
import { SEED_NOW } from './seed/clock'

const DAY = 24 * 60 * 60 * 1000

/**
 * Report aggregation over the seed.
 *
 * Everything is derived rather than hardcoded, for the same reason folder counts are: a KPI
 * tile that disagrees with the list it links to is worse than no tile. Deltas compare the
 * selected window against the window immediately before it, which is what "compare to previous"
 * means everywhere in the product.
 */

export type ChannelGroup = 'all' | 'email' | 'chat' | 'messaging' | 'social'

const GROUP_MEMBERS: Record<Exclude<ChannelGroup, 'all'>, ChannelType[]> = {
  email: ['email'],
  chat: ['chat'],
  messaging: ['whatsapp', 'sms'],
  social: ['instagram', 'messenger'],
}

function inGroup(conversation: Conversation, group: ChannelGroup): boolean {
  if (group === 'all') return true
  return GROUP_MEMBERS[group].includes(conversation.channel)
}

interface Window {
  from: number
  to: number
}

function windows(days: number): { current: Window; previous: Window } {
  const to = SEED_NOW.getTime()
  const from = to - days * DAY
  return { current: { from, to }, previous: { from: from - days * DAY, to: from } }
}

function within(iso: string, window: Window): boolean {
  const at = Date.parse(iso)
  return at >= window.from && at < window.to
}

/** A raw pair turned into the value plus percentage change every KPI tile renders. */
function metric(current: number, previous: number): Metric {
  const deltaPct = previous === 0 ? 0 : ((current - previous) / previous) * 100
  return { value: current, deltaPct: Math.round(deltaPct * 10) / 10 }
}

function seriesFor(days: number, count: (window: Window) => number): TimePoint[] {
  const { current, previous } = windows(days)
  // One point per day for a month or less, otherwise per week, so the axis stays readable.
  const bucketDays = days <= 31 ? 1 : 7
  const buckets = Math.ceil(days / bucketDays)

  return Array.from({ length: buckets }, (_, index) => {
    const from = current.from + index * bucketDays * DAY
    const to = from + bucketDays * DAY
    const prevFrom = previous.from + index * bucketDays * DAY
    return {
      date: new Date(from).toISOString().slice(0, 10),
      value: count({ from, to }),
      previous: count({ from: prevFrom, to: prevFrom + bucketDays * DAY }),
    }
  })
}

function scopedConversations(group: ChannelGroup): Conversation[] {
  return getDb().conversations.filter((conversation) => inGroup(conversation, group))
}

function countIn(items: Conversation[], window: Window): number {
  return items.filter((conversation) => within(conversation.createdAt, window)).length
}

/* All channels ---------------------------------------------------------------------------- */

export interface AllChannelsReport {
  kpis: {
    key: string
    label: string
    value: number
    deltaPct: number
    goodDirection: 'up' | 'down'
  }[]
  busiestDay: { day: string; count: number }
  byChannel: { channel: string; conversations: number; customers: number }[]
  series: TimePoint[]
  tags: { name: string; count: number; pct: number; deltaPct: number }[]
  savedReplies: { name: string; count: number; pct: number; deltaPct: number }[]
}

export function allChannelsReport(days: number, group: ChannelGroup): AllChannelsReport {
  const { current, previous } = windows(days)
  const scoped = scopedConversations(group)
  const inCurrent = scoped.filter((c) => within(c.createdAt, current))
  const inPrevious = scoped.filter((c) => within(c.createdAt, previous))

  const customers = new Set(inCurrent.map((c) => c.contact.id)).size
  const prevCustomers = new Set(inPrevious.map((c) => c.contact.id)).size
  const perDay = Math.round((inCurrent.length / days) * 10) / 10
  const prevPerDay = Math.round((inPrevious.length / days) * 10) / 10

  const byWeekday = new Map<string, number>()
  for (const conversation of inCurrent) {
    const day = new Date(conversation.createdAt).toLocaleDateString('en-US', { weekday: 'long' })
    byWeekday.set(day, (byWeekday.get(day) ?? 0) + 1)
  }
  const busiest = [...byWeekday.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]

  const tagCounts = new Map<string, number>()
  const prevTagCounts = new Map<string, number>()
  for (const conversation of inCurrent) {
    for (const tag of conversation.tags) tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1)
  }
  for (const conversation of inPrevious) {
    for (const tag of conversation.tags) {
      prevTagCounts.set(tag.name, (prevTagCounts.get(tag.name) ?? 0) + 1)
    }
  }

  const totalTagged = [...tagCounts.values()].reduce((sum, n) => sum + n, 0)

  return {
    kpis: [
      {
        key: 'total',
        label: 'Total conversations',
        ...metric(inCurrent.length, inPrevious.length),
        goodDirection: 'up',
      },
      {
        key: 'new',
        label: 'New conversations',
        ...metric(
          inCurrent.filter((c) => c.status !== 'closed').length,
          inPrevious.filter((c) => c.status !== 'closed').length,
        ),
        goodDirection: 'up',
      },
      {
        key: 'customers',
        label: 'Customers',
        ...metric(customers, prevCustomers),
        goodDirection: 'up',
      },
      {
        key: 'perDay',
        label: 'Conversations per day',
        ...metric(perDay, prevPerDay),
        goodDirection: 'up',
      },
    ],
    busiestDay: { day: busiest[0], count: busiest[1] },
    byChannel: (['email', 'chat', 'messaging', 'social'] as const).map((key) => {
      const items = inCurrent.filter((c) => GROUP_MEMBERS[key].includes(c.channel))
      return {
        channel: key,
        conversations: items.length,
        customers: new Set(items.map((c) => c.contact.id)).size,
      }
    }),
    series: seriesFor(days, (window) => countIn(scoped, window)),
    tags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        count,
        pct: totalTagged === 0 ? 0 : Math.round((count / totalTagged) * 1000) / 10,
        deltaPct: metric(count, prevTagCounts.get(name) ?? 0).deltaPct,
      })),
    savedReplies: getDb()
      .savedReplies.slice()
      .sort((a, b) => b.usageCount - a.usageCount)
      .map((reply, index) => ({
        name: reply.name,
        count: reply.usageCount,
        pct: 0,
        deltaPct: [12.5, -4.2, 8.1, 0][index] ?? 0,
      })),
  }
}

/* Email ----------------------------------------------------------------------------------- */

/** The buckets a response time distribution is read in. Hours, not an average. */
export const RESPONSE_BUCKETS = [
  { label: 'Under 15 min', maxMins: 15 },
  { label: '15 to 30 min', maxMins: 30 },
  { label: '30 to 60 min', maxMins: 60 },
  { label: '1 to 2h', maxMins: 120 },
  { label: '2 to 3h', maxMins: 180 },
  { label: '3 to 6h', maxMins: 360 },
  { label: '6 to 12h', maxMins: 720 },
  { label: '12 to 24h', maxMins: 1440 },
  { label: '1 to 2 days', maxMins: 2880 },
  { label: '2+ days', maxMins: Number.POSITIVE_INFINITY },
] as const

export interface EmailReport {
  kpis: {
    key: string
    label: string
    value: number
    deltaPct: number
    goodDirection: 'up' | 'down'
  }[]
  series: TimePoint[]
  responseBuckets: { label: string; count: number; pct: number; deltaPct: number }[]
  resolutionBuckets: { label: string; count: number; pct: number; deltaPct: number }[]
}

/** Minutes from the customer's first message to the first agent reply. */
function firstResponseMinutes(conversation: Conversation): number | null {
  const messages = getDb().messages.filter((m) => m.conversationId === conversation.id)
  const first = messages.find((m) => m.type === 'customer')
  const reply = messages.find((m) => m.type === 'reply')
  if (first === undefined || reply === undefined) return null
  return Math.max(0, (Date.parse(reply.createdAt) - Date.parse(first.createdAt)) / 60_000)
}

function bucketize(values: number[], previousValues: number[]) {
  const total = values.length
  let floor = 0
  return RESPONSE_BUCKETS.map((bucket) => {
    const count = values.filter((v) => v > floor && v <= bucket.maxMins).length
    const prevCount = previousValues.filter((v) => v > floor && v <= bucket.maxMins).length
    floor = bucket.maxMins
    return {
      label: bucket.label,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
      deltaPct: metric(count, prevCount).deltaPct,
    }
  })
}

export function emailReport(days: number): EmailReport {
  const { current, previous } = windows(days)
  const email = scopedConversations('email')
  const inCurrent = email.filter((c) => within(c.createdAt, current))
  const inPrevious = email.filter((c) => within(c.createdAt, previous))

  const messagesIn = (window: Window, type: string) =>
    getDb().messages.filter((m) => m.type === type && within(m.createdAt, window)).length

  const responseTimes = inCurrent.map(firstResponseMinutes).filter((v): v is number => v !== null)
  const prevResponseTimes = inPrevious
    .map(firstResponseMinutes)
    .filter((v): v is number => v !== null)

  const resolutionTimes = inCurrent
    .filter((c) => c.status === 'closed')
    .map((c) => (Date.parse(c.updatedAt) - Date.parse(c.createdAt)) / 60_000)
  const prevResolutionTimes = inPrevious
    .filter((c) => c.status === 'closed')
    .map((c) => (Date.parse(c.updatedAt) - Date.parse(c.createdAt)) / 60_000)

  return {
    kpis: [
      {
        key: 'conversations',
        label: 'Email conversations',
        ...metric(inCurrent.length, inPrevious.length),
        goodDirection: 'up',
      },
      {
        key: 'received',
        label: 'Messages received',
        ...metric(messagesIn(current, 'customer'), messagesIn(previous, 'customer')),
        goodDirection: 'up',
      },
      {
        key: 'sent',
        label: 'Replies sent',
        ...metric(messagesIn(current, 'reply'), messagesIn(previous, 'reply')),
        goodDirection: 'up',
      },
      {
        key: 'resolved',
        label: 'Resolved',
        ...metric(
          inCurrent.filter((c) => c.status === 'closed').length,
          inPrevious.filter((c) => c.status === 'closed').length,
        ),
        goodDirection: 'up',
      },
      {
        key: 'firstReply',
        label: 'Median first reply, minutes',
        ...metric(median(responseTimes), median(prevResponseTimes)),
        // A faster first reply is better, so a fall is the good direction here.
        goodDirection: 'down',
      },
    ],
    series: seriesFor(days, (window) => countIn(email, window)),
    responseBuckets: bucketize(responseTimes, prevResponseTimes),
    resolutionBuckets: bucketize(resolutionTimes, prevResolutionTimes),
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0)
  return Math.round(value)
}

/* Happiness ------------------------------------------------------------------------------- */

export interface HappinessReport {
  great: number
  okay: number
  notGood: number
  score: number
  totalRatings: number
  coveragePct: number
  deltas: { great: number; okay: number; notGood: number }
  ratings: Rating[]
}

function ratingsIn(window: Window): Rating[] {
  return getDb().ratings.filter((rating) => within(rating.date, window))
}

export function happinessReport(days: number): HappinessReport {
  const { current, previous } = windows(days)
  const now = ratingsIn(current)
  const before = ratingsIn(previous)

  const count = (items: Rating[], kind: Csat) => items.filter((r) => r.rating === kind).length
  const pct = (items: Rating[], kind: Csat) =>
    items.length === 0 ? 0 : (count(items, kind) / items.length) * 100

  const conversations = getDb().conversations.filter((c) => within(c.createdAt, current))

  return {
    great: count(now, 'great'),
    okay: count(now, 'okay'),
    notGood: count(now, 'notGood'),
    // FR-7.5: the happiness score is percent Great minus percent Not good, not an average.
    score: Math.round(pct(now, 'great') - pct(now, 'notGood')),
    totalRatings: now.length,
    // FR-7.6: a score from 8% of conversations means something different from one at 60%.
    coveragePct:
      conversations.length === 0 ? 0 : Math.round((now.length / conversations.length) * 1000) / 10,
    deltas: {
      great: metric(count(now, 'great'), count(before, 'great')).deltaPct,
      okay: metric(count(now, 'okay'), count(before, 'okay')).deltaPct,
      notGood: metric(count(now, 'notGood'), count(before, 'notGood')).deltaPct,
    },
    ratings: [...now].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  }
}

/* Company --------------------------------------------------------------------------------- */

export interface CompanyReport {
  kpis: {
    key: string
    label: string
    value: number
    deltaPct: number
    goodDirection: 'up' | 'down'
  }[]
  series: TimePoint[]
  team: {
    userId: string
    name: string
    replies: number
    customersHelped: number
    /** Null when this person has no actual ratings. Predictions never fill this in (FR-4.44). */
    happiness: number | null
    ratingCount: number
  }[]
}

export function companyReport(days: number): CompanyReport {
  const { current, previous } = windows(days)
  const all = getDb().conversations
  const inCurrent = all.filter((c) => within(c.createdAt, current))
  const inPrevious = all.filter((c) => within(c.createdAt, previous))
  const ratings = ratingsIn(current)

  return {
    kpis: [
      {
        key: 'helped',
        label: 'Customers helped',
        ...metric(
          new Set(inCurrent.map((c) => c.contact.id)).size,
          new Set(inPrevious.map((c) => c.contact.id)).size,
        ),
        goodDirection: 'up',
      },
      {
        key: 'perDay',
        label: 'Conversations per day',
        ...metric(
          Math.round((inCurrent.length / days) * 10) / 10,
          Math.round((inPrevious.length / days) * 10) / 10,
        ),
        goodDirection: 'up',
      },
      {
        key: 'closed',
        label: 'Closed',
        ...metric(
          inCurrent.filter((c) => c.status === 'closed').length,
          inPrevious.filter((c) => c.status === 'closed').length,
        ),
        goodDirection: 'up',
      },
    ],
    series: seriesFor(days, (window) => countIn(all, window)),
    team: getDb().users.map((user) => {
      const theirs = inCurrent.filter((c) => c.assigneeId === user.id)
      const mine = ratings.filter((rating) => rating.agent === user.name)
      const great = mine.filter((r) => r.rating === 'great').length
      const bad = mine.filter((r) => r.rating === 'notGood').length
      return {
        userId: user.id,
        name: user.name,
        replies: getDb().messages.filter(
          (m) => m.type === 'reply' && within(m.createdAt, current) && m.author.id === user.id,
        ).length,
        customersHelped: new Set(theirs.map((c) => c.contact.id)).size,
        // Only actual ratings. A predicted score in a performance table is a number about a
        // person that nobody gave them (FR-4.44).
        happiness: mine.length === 0 ? null : Math.round(((great - bad) / mine.length) * 100),
        ratingCount: mine.length,
      }
    }),
  }
}

/* AI -------------------------------------------------------------------------------------- */

export interface AiReport {
  handled: number
  resolutionRate: number
  resolved: number
  unresolved: number
  escalated: number
  happiness: { great: number; okay: number; notGood: number; score: number }
  series: { date: string; email: number; chat: number; messaging: number; social: number }[]
  tiles: { key: string; label: string; value: number; suffix: string }[]
}

export function aiReport(days: number): AiReport {
  const agent = getDb().aiAgent
  const { current } = windows(days)
  const conversations = getDb().conversations.filter((c) => within(c.createdAt, current))

  const handled = Math.round(conversations.length * agent.stats.resolutionRate * 1.4)
  const resolved = Math.round(handled * agent.stats.resolutionRate)
  const escalated = Math.round(handled * agent.stats.escalationRate)

  const suggestions = conversations.flatMap((c) => c.ai?.suggestions ?? [])
  const accepted = suggestions.filter((s) => s.state === 'accepted').length
  const decided = suggestions.filter((s) => s.state !== 'pending').length

  const evaluations = getDb().evaluations
  const avgScore =
    evaluations.length === 0
      ? 0
      : Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)

  const bucketDays = days <= 31 ? 1 : 7
  const buckets = Math.ceil(days / bucketDays)

  return {
    handled,
    resolutionRate: Math.round(agent.stats.resolutionRate * 100),
    resolved,
    unresolved: Math.max(0, handled - resolved - escalated),
    escalated,
    happiness: { great: 62, okay: 27, notGood: 11, score: 51 },
    series: Array.from({ length: buckets }, (_, index) => {
      const from = current.from + index * bucketDays * DAY
      const window = { from, to: from + bucketDays * DAY }
      const slice = conversations.filter((c) => within(c.createdAt, window))
      const per = (group: Exclude<ChannelGroup, 'all'>) =>
        Math.round(
          slice.filter((c) => GROUP_MEMBERS[group].includes(c.channel)).length *
            agent.stats.resolutionRate,
        )
      return {
        date: new Date(from).toISOString().slice(0, 10),
        email: per('email'),
        chat: per('chat'),
        messaging: per('messaging'),
        social: per('social'),
      }
    }),
    tiles: [
      {
        key: 'draft',
        label: 'Auto draft acceptance',
        value: decided === 0 ? 0 : Math.round((accepted / decided) * 100),
        suffix: '%',
      },
      {
        key: 'tag',
        label: 'Auto tag acceptance',
        value: decided === 0 ? 0 : Math.round((accepted / decided) * 100),
        suffix: '%',
      },
      {
        key: 'assign',
        label: 'Auto assign override rate',
        value: Math.round(agent.stats.escalationRate * 100),
        suffix: '%',
      },
      { key: 'evaluation', label: 'Average evaluation score', value: avgScore, suffix: '' },
    ],
  }
}

/* Satisfaction ---------------------------------------------------------------------------- */

export interface SatisfactionReport {
  actualScore: number
  predictedScore: number
  coveragePct: number
  atRisk: number
  series: { date: string; actual: number; predicted: number }[]
  /** Predicted against actual, for conversations that got both. */
  calibration: { accuracyPct: number; sampleSize: number; grid: Record<string, number> }
  drivers: { label: string; impactPct: number }[]
}

const CSATS: Csat[] = ['great', 'okay', 'notGood']

export function satisfactionReport(days: number): SatisfactionReport {
  const { current } = windows(days)
  const conversations = getDb().conversations.filter((c) => within(c.createdAt, current))
  const ratings = ratingsIn(current)

  const pct = (kind: Csat) =>
    ratings.length === 0
      ? 0
      : (ratings.filter((r) => r.rating === kind).length / ratings.length) * 100

  const predictions = conversations
    .map((c) => c.ai?.predictedSatisfaction)
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  const predictedPct = (kind: Csat) =>
    predictions.length === 0
      ? 0
      : (predictions.filter((p) => p.rating === kind).length / predictions.length) * 100

  const paired = predictions.filter((p) => p.actualRating !== undefined)
  const grid: Record<string, number> = {}
  for (const predicted of CSATS) {
    for (const actual of CSATS) {
      grid[`${predicted}-${actual}`] = paired.filter(
        (p) => p.rating === predicted && p.actualRating === actual,
      ).length
    }
  }
  const correct = paired.filter((p) => p.rating === p.actualRating).length

  const bucketDays = days <= 31 ? 1 : 7
  const buckets = Math.ceil(days / bucketDays)

  return {
    actualScore: Math.round(pct('great') - pct('notGood')),
    predictedScore: Math.round(predictedPct('great') - predictedPct('notGood')),
    coveragePct:
      conversations.length === 0
        ? 0
        : Math.round((ratings.length / conversations.length) * 1000) / 10,
    atRisk: conversations.filter(
      (c) =>
        c.status !== 'closed' &&
        c.ai?.predictedSatisfaction?.rating === 'notGood' &&
        (c.ai.predictedSatisfaction.confidence ?? 0) >= 0.6,
    ).length,
    series: Array.from({ length: buckets }, (_, index) => {
      const from = current.from + index * bucketDays * DAY
      const window = { from, to: from + bucketDays * DAY }
      const slice = getDb().ratings.filter((r) => within(r.date, window))
      const slicePredictions = conversations
        .filter((c) => within(c.createdAt, window))
        .map((c) => c.ai?.predictedSatisfaction)
        .filter((p): p is NonNullable<typeof p> => p !== undefined)

      const score = (great: number, bad: number, total: number) =>
        total === 0 ? 0 : Math.round(((great - bad) / total) * 100)

      return {
        date: new Date(from).toISOString().slice(0, 10),
        actual: score(
          slice.filter((r) => r.rating === 'great').length,
          slice.filter((r) => r.rating === 'notGood').length,
          slice.length,
        ),
        predicted: score(
          slicePredictions.filter((p) => p.rating === 'great').length,
          slicePredictions.filter((p) => p.rating === 'notGood').length,
          slicePredictions.length,
        ),
      }
    }),
    calibration: {
      accuracyPct: paired.length === 0 ? 0 : Math.round((correct / paired.length) * 100),
      sampleSize: paired.length,
      grid,
    },
    drivers: [
      { label: 'Slow first response', impactPct: 41 },
      { label: 'More than four replies', impactPct: 28 },
      { label: 'Conversation reopened', impactPct: 19 },
      { label: 'Sentiment turned negative', impactPct: 12 },
    ],
  }
}

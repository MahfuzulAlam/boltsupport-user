import { describe, expect, it } from 'vitest'
import { conversationSchema, messageSchema, userSchema } from '@/types'
import {
  getDb,
  inboxesWithCounts,
  matchesFolder,
  queryConversations,
  resetDb,
  updateChannel,
} from '@/mocks/db'
import { slaUrgency } from '@/lib/duration'
import { createSeedData } from './index'
import { SEED_NOW } from './clock'
import { CONVERSATION_COUNT, HOSTILE_EMAIL_HTML } from './conversations'

const seed = createSeedData()

describe('seed integrity', () => {
  it('produces the expected volume', () => {
    expect(seed.conversations).toHaveLength(CONVERSATION_COUNT)
    expect(seed.contacts.length).toBeGreaterThanOrEqual(30)
    expect(seed.articles).toHaveLength(10)
    expect(seed.messages.length).toBeGreaterThan(200)
  })

  it('validates every record against its own schema', () => {
    // If the generator drifts from the schema, this is where it surfaces, rather than as a
    // runtime parse failure in a screen three steps from now.
    for (const conversation of seed.conversations) {
      const result = conversationSchema.safeParse(conversation)
      if (!result.success) {
        throw new Error(
          `Conversation ${conversation.id} failed: ${result.error.issues
            .map((i) => i.path.join('.'))
            .join(', ')}`,
        )
      }
    }
    for (const message of seed.messages) {
      expect(messageSchema.safeParse(message).success).toBe(true)
    }
    for (const user of seed.users) {
      expect(userSchema.safeParse(user).success).toBe(true)
    }
  })

  it('gives every conversation its own ticket number', () => {
    // A number an agent quotes on the phone has to identify one conversation. The generator
    // once applied its random gap to the index rather than accumulating it, which put two
    // different threads on the same number and was only visible on a contact profile.
    const numbers = seed.conversations.map((c) => c.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('gives each rebuild its own copy of a nested record', () => {
    // `createSeedData` shallow copies its lists, so anything writing into an object inside one
    // of them reaches the seed module itself and survives resetDb. Channels live inside their
    // inbox, which is where this first bit: one test disconnected email and the next test found
    // it still disconnected.
    const first = createSeedData()
    const channel = first.inboxes[0]?.channels[0]
    expect(channel).toBeDefined()

    updateChannel(first.inboxes[0]?.id ?? '', channel?.id ?? '', { status: 'disconnected' })
    resetDb()

    expect(createSeedData().inboxes[0]?.channels[0]?.status).toBe('connected')
    expect(getDb().inboxes[0]?.channels[0]?.status).toBe('connected')
  })

  it('keeps referential integrity across the graph', () => {
    const userIds = new Set(seed.users.map((u) => u.id))
    const inboxIds = new Set(seed.inboxes.map((i) => i.id))
    const tagIds = new Set(seed.tags.map((t) => t.id))
    const messageIds = new Set(seed.messages.map((m) => m.id))

    for (const conversation of seed.conversations) {
      expect(inboxIds.has(conversation.inboxId)).toBe(true)
      expect(messageIds.has(conversation.lastMessageId)).toBe(true)
      if (conversation.assigneeId !== null) {
        expect(userIds.has(conversation.assigneeId)).toBe(true)
      }
      for (const tag of conversation.tags) {
        expect(tagIds.has(tag.id)).toBe(true)
      }
    }
  })

  it('is deterministic, so a reload never reshuffles the queue', () => {
    const again = createSeedData()
    expect(again.conversations.map((c) => c.id)).toEqual(seed.conversations.map((c) => c.id))
    expect(again.conversations[0]?.number).toBe(seed.conversations[0]?.number)
  })

  it('ships the demo conversation with a stale summary, so staleness has something to show', () => {
    const summary = seed.summaries[0]
    const conversation = seed.conversations.find((c) => c.id === 'c1')

    expect(summary).toBeDefined()
    expect(conversation).toBeDefined()
    // FR-4.5: staleness is derived by comparing these two ids, never polled.
    expect(summary?.sourceLastMessageId).not.toBe(conversation?.lastMessageId)
  })

  it('carries a hostile email body for the sanitizer to defeat', () => {
    const hostile = seed.messages.find((m) => 'bodyHtml' in m && m.bodyHtml === HOSTILE_EMAIL_HTML)

    expect(hostile).toBeDefined()
    // These are the things step 6 has to render inert. Asserting they are present keeps the
    // fixture honest if someone later "cleans up" the seed.
    expect(HOSTILE_EMAIL_HTML).toContain('<script>')
    expect(HOSTILE_EMAIL_HTML).toContain('onerror=')
    expect(HOSTILE_EMAIL_HTML).toContain('javascript:')
    expect(HOSTILE_EMAIL_HTML).toContain('tracker.example/pixel.gif')
  })

  it('grounds the injection notice in a real injection attempt', () => {
    const summary = seed.summaries.find((s) => s.conversationId === 'c1')
    const thread = seed.messages.filter((m) => m.conversationId === 'c1')
    const injected = thread.some(
      (m) => 'bodyHtml' in m && m.bodyHtml.includes('Ignore all previous instructions'),
    )

    // AI-3 says the UI states that instructions were ignored. The flag must not be decorative.
    expect(summary?.injectionDetected).toBe(true)
    expect(injected).toBe(true)
  })
})

describe('computed folders', () => {
  it('never puts a closed conversation in an open folder', () => {
    const closed = seed.conversations.filter((c) => c.status === 'closed')
    expect(closed.length).toBeGreaterThan(0)
    for (const conversation of closed) {
      expect(matchesFolder(conversation, 'unassigned')).toBe(false)
      expect(matchesFolder(conversation, 'mine')).toBe(false)
      expect(matchesFolder(conversation, 'assigned')).toBe(false)
      expect(matchesFolder(conversation, 'closed')).toBe(true)
    }
  })

  it('treats unassigned and assigned as mutually exclusive', () => {
    for (const conversation of seed.conversations) {
      const unassigned = matchesFolder(conversation, 'unassigned')
      const assigned = matchesFolder(conversation, 'assigned')
      expect(unassigned && assigned).toBe(false)
    }
  })

  it('populates the folders the first screens depend on', () => {
    expect(queryConversations({ folder: 'unassigned' }).total).toBeGreaterThan(0)
    expect(queryConversations({ folder: 'mine' }).total).toBeGreaterThan(0)
    expect(queryConversations({ folder: 'closed' }).total).toBeGreaterThan(0)
  })
})

describe('SLA fixtures', () => {
  it('covers every badge state, including the sub ten minute one that shows seconds', () => {
    const now = SEED_NOW.getTime()
    const states = seed.conversations
      .filter((c) => c.sla?.firstResponseDueAt != null)
      .map((c) => {
        const due = Date.parse(c.sla?.firstResponseDueAt ?? '')
        return slaUrgency(due - now, c.sla?.paused ?? false)
      })

    // A state with no representative in the fixture is a state nobody ever looks at.
    for (const state of ['comfortable', 'warning', 'critical', 'breached', 'paused'] as const) {
      expect(states, `no fixture in the ${state} state`).toContain(state)
    }
  })
})

describe('inbox counts', () => {
  it('matches what each folder actually returns', () => {
    // The dashboard card links straight into the folder, so a card saying 12 and a folder
    // holding 46 is a visible contradiction. Counts are computed, never stored (FR-1.6).
    for (const inbox of inboxesWithCounts()) {
      const pairs = [
        ['chats', inbox.counts.chat],
        ['unassigned', inbox.counts.unassigned],
        ['mine', inbox.counts.mine],
        ['assigned', inbox.counts.assigned],
        ['drafts', inbox.counts.drafts],
        ['needs-attention', inbox.counts.needsAttention],
        ['closed', inbox.counts.closed],
        ['spam', inbox.counts.spam],
      ] as const

      for (const [folder, shown] of pairs) {
        const actual = queryConversations({ inboxId: inbox.id, folder, limit: 1 }).total
        expect(shown, `${inbox.name} / ${folder}`).toBe(actual)
      }
    }
  })

  it('accounts for every conversation across the open, closed, and spam folders', () => {
    let total = 0
    for (const inbox of inboxesWithCounts()) {
      total +=
        inbox.counts.unassigned + inbox.counts.assigned + inbox.counts.closed + inbox.counts.spam
    }
    expect(total).toBe(CONVERSATION_COUNT)
  })
})

describe('conversation queries', () => {
  it('pages with a cursor and stops at the end', () => {
    const first = queryConversations({ limit: 40 })
    expect(first.items).toHaveLength(40)
    expect(first.nextCursor).toBe('40')

    const last = queryConversations({ limit: 40, cursor: String(first.total - 5) })
    expect(last.items).toHaveLength(5)
    expect(last.nextCursor).toBeNull()
  })

  it('sorts waiting longest oldest first', () => {
    const { items } = queryConversations({ sort: 'waiting', limit: 20 })
    const times = items.map((c) => Date.parse(c.waitingSince))
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('puts conversations without an SLA last when sorting by due date', () => {
    const { items } = queryConversations({ sort: 'sla', limit: 240 })
    const firstWithout = items.findIndex((c) => c.sla === undefined)
    const lastWith = items.map((c) => c.sla !== undefined).lastIndexOf(true)
    if (firstWithout !== -1) {
      expect(firstWithout).toBeGreaterThan(lastWith - 1)
    }
  })

  it('searches subject, preview, contact, and ticket number', () => {
    expect(queryConversations({ search: 'annual upgrade' }).total).toBeGreaterThan(0)
    expect(queryConversations({ search: 'Maya' }).total).toBeGreaterThan(0)
    expect(queryConversations({ search: '48213' }).total).toBe(1)
  })
})

describe('rating fixtures', () => {
  it('never pairs a comment with a score it contradicts', () => {
    // A "Great" beside "Still not fixed" makes the whole Happiness report look invented.
    const negative = /not fixed|gave up|no real answer/i
    for (const rating of seed.ratings) {
      if (rating.comment === undefined) continue
      if (rating.rating === 'great') {
        expect(negative.test(rating.comment), `${rating.id}: ${rating.comment}`).toBe(false)
      }
    }
    expect(seed.ratings.filter((r) => r.comment !== undefined).length).toBeGreaterThan(0)
  })
})

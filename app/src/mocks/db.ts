import type { AiSuggestion, Channel, Conversation, Folder, Message } from '@/types'
import { createSeedData, type SeedData } from './seed'
import { CURRENT_USER_ID } from './seed/workspace'

/**
 * The mock server's in-memory store.
 *
 * Handlers mutate this so optimistic updates have something real to round-trip against: a
 * rollback is only meaningful if the server can actually disagree with the client.
 */
let db: SeedData = createSeedData()

export function getDb(): SeedData {
  return db
}

/** Rebuilds the fixtures. Tests call this in `beforeEach` so mutations never leak. */
export function resetDb(): void {
  db = createSeedData()
}

const OPEN_STATUSES = new Set(['active', 'pending'])

function isOpen(conversation: Conversation): boolean {
  return OPEN_STATUSES.has(conversation.status)
}

/** System folders are computed, never stored (FR-1.6). */
export function matchesFolder(conversation: Conversation, folder: Folder): boolean {
  switch (folder) {
    case 'chats':
      return conversation.channel === 'chat' && isOpen(conversation)
    case 'unassigned':
      return conversation.assigneeId === null && isOpen(conversation)
    case 'mine':
      return conversation.assigneeId === CURRENT_USER_ID && isOpen(conversation)
    case 'assigned':
      return conversation.assigneeId !== null && isOpen(conversation)
    case 'drafts':
      // Drafts are conversations the current user has an unsent reply on. Until the composer
      // persists drafts (step 7), approximate with their own assigned, unread threads.
      return (
        conversation.assigneeId === CURRENT_USER_ID && conversation.unread && isOpen(conversation)
      )
    case 'needs-attention':
      // A breached SLA, or a send that was blocked by a collision (FR-2.4).
      return isOpen(conversation) && conversation.sla?.breached === true
    case 'closed':
      return conversation.status === 'closed'
    case 'spam':
      return conversation.status === 'spam'
  }
}

export type SortKey = 'newest' | 'oldest' | 'waiting' | 'sla'

function compare(a: Conversation, b: Conversation, sort: SortKey): number {
  switch (sort) {
    case 'newest':
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    case 'oldest':
      return Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
    case 'waiting':
      return Date.parse(a.waitingSince) - Date.parse(b.waitingSince)
    case 'sla': {
      // Conversations without an SLA sort last rather than jumping to the top.
      const aDue = a.sla?.firstResponseDueAt
      const bDue = b.sla?.firstResponseDueAt
      if (aDue === undefined || aDue === null) return 1
      if (bDue === undefined || bDue === null) return -1
      return Date.parse(aDue) - Date.parse(bDue)
    }
  }
}

export interface ConversationQuery {
  inboxId?: string
  contactId?: string
  folder?: Folder
  sort?: SortKey
  search?: string
  cursor?: string
  limit?: number
}

export interface ConversationPage {
  items: Conversation[]
  total: number
  nextCursor: string | null
}

export function queryConversations(query: ConversationQuery): ConversationPage {
  const { inboxId, contactId, folder, sort = 'waiting', search, cursor, limit = 40 } = query

  let items = db.conversations
  if (inboxId !== undefined) {
    items = items.filter((c) => c.inboxId === inboxId)
  }
  if (contactId !== undefined) {
    items = items.filter((c) => c.contact.id === contactId)
  }
  if (folder !== undefined) {
    items = items.filter((c) => matchesFolder(c, folder))
  }
  if (search !== undefined && search.trim() !== '') {
    const needle = search.trim().toLowerCase()
    items = items.filter(
      (c) =>
        c.subject.toLowerCase().includes(needle) ||
        c.preview.toLowerCase().includes(needle) ||
        c.contact.name.toLowerCase().includes(needle) ||
        String(c.number).includes(needle),
    )
  }

  const sorted = [...items].sort((a, b) => compare(a, b, sort))
  const offset = cursor === undefined ? 0 : Number.parseInt(cursor, 10)
  const start = Number.isNaN(offset) ? 0 : offset
  const page = sorted.slice(start, start + limit)
  const nextOffset = start + limit

  return {
    items: page,
    total: sorted.length,
    nextCursor: nextOffset < sorted.length ? String(nextOffset) : null,
  }
}

export function findConversation(id: string): Conversation | undefined {
  return db.conversations.find((c) => c.id === id)
}

/**
 * Inboxes with their folder counts computed from the conversations that actually exist.
 *
 * FR-1.6 makes system folders computed rather than stored, and this is why: the seed ships
 * hand-authored counts taken from the design prototypes, but the generated conversations do not
 * add up to them. Serving the stored numbers would show one figure on the dashboard card and a
 * different one at the top of the folder it links to.
 */
export function inboxesWithCounts(): SeedData['inboxes'] {
  return db.inboxes.map((inbox) => {
    const mine = db.conversations.filter((c) => c.inboxId === inbox.id)
    const count = (folder: Folder) => mine.filter((c) => matchesFolder(c, folder)).length
    return {
      ...inbox,
      counts: {
        chat: count('chats'),
        unassigned: count('unassigned'),
        mine: count('mine'),
        assigned: count('assigned'),
        drafts: count('drafts'),
        needsAttention: count('needs-attention'),
        closed: count('closed'),
        spam: count('spam'),
      },
    }
  })
}

export function updateAiSettings(patch: Partial<SeedData['aiSettings']>): SeedData['aiSettings'] {
  db.aiSettings = { ...db.aiSettings, ...patch }
  return db.aiSettings
}

/** Accepting or rejecting a suggestion records the outcome, which is what calibration reads. */
export function setSuggestionState(
  suggestionId: string,
  state: 'accepted' | 'rejected' | 'auto_applied',
): AiSuggestion | undefined {
  for (const conversation of db.conversations) {
    const suggestions = conversation.ai?.suggestions
    if (suggestions === undefined) continue
    const index = suggestions.findIndex((s) => s.id === suggestionId)
    const existing = suggestions[index]
    if (existing === undefined) continue

    const updated = { ...existing, state }
    suggestions[index] = updated
    return updated
  }
  return undefined
}

export interface TagReviewRow {
  conversationId: string
  number: number
  subject: string
  contact: string
  suggestions: AiSuggestion[]
  createdAt: string
}

/** The review queue: pending tag suggestions across the workspace (FR-4.30). */
export function pendingTagSuggestions(): TagReviewRow[] {
  return db.conversations
    .map((conversation) => ({
      conversationId: conversation.id,
      number: conversation.number,
      subject: conversation.subject,
      contact: conversation.contact.name,
      suggestions: (conversation.ai?.suggestions ?? []).filter(
        (s) => s.kind === 'tag' && s.state === 'pending',
      ),
      createdAt: conversation.updatedAt,
    }))
    .filter((row) => row.suggestions.length > 0)
}

export function findArticle(id: string) {
  return db.articles.find((article) => article.id === id)
}

export function updateArticle(id: string, patch: Partial<SeedData['articles'][number]>) {
  const index = db.articles.findIndex((article) => article.id === id)
  const existing = db.articles[index]
  if (existing === undefined) return undefined
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  db.articles[index] = updated
  return updated
}

export function addArticle(article: SeedData['articles'][number]) {
  db.articles.push(article)
  return article
}

export interface SearchHit {
  kind: 'conversation' | 'contact' | 'article'
  id: string
  title: string
  subtitle: string
  href: string
  /**
   * Facets for the filter chips, present only on the kinds that have them. Sent with the hit so
   * narrowing a result set never costs another round trip.
   */
  inboxId?: string
  status?: string
  assigneeId?: string | null
  tagIds?: string[]
  updatedAt?: string
}

/** One query across the three things an agent looks for (design spec section 21). */
export function search(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []

  const conversations: SearchHit[] = db.conversations
    .filter(
      (c) =>
        c.subject.toLowerCase().includes(needle) ||
        c.preview.toLowerCase().includes(needle) ||
        String(c.number).includes(needle),
    )
    .slice(0, 20)
    .map((c) => ({
      kind: 'conversation' as const,
      id: c.id,
      title: c.subject,
      subtitle: `${c.contact.name} · #${String(c.number)}`,
      href: `/inbox/${c.inboxId}/${c.status === 'closed' ? 'closed' : 'assigned'}/${c.id}`,
      inboxId: c.inboxId,
      status: c.status,
      assigneeId: c.assigneeId,
      tagIds: c.tags.map((tag) => tag.id),
      updatedAt: c.updatedAt,
    }))

  const contacts: SearchHit[] = db.contacts
    .filter((c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))
    .slice(0, 20)
    .map((c) => ({
      kind: 'contact' as const,
      id: c.id,
      title: c.name,
      subtitle: c.email,
      href: `/customers/${c.id}`,
      updatedAt: c.lastSeen,
    }))

  const articles: SearchHit[] = db.articles
    .filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.bodyHtml.toLowerCase().includes(needle) ||
        a.keywords.some((k) => k.includes(needle)),
    )
    .slice(0, 20)
    .map((a) => ({
      kind: 'article' as const,
      id: a.id,
      title: a.title,
      subtitle: a.status === 'draft' ? 'Draft' : 'Published',
      href: `/docs/${a.collectionId}/article/${a.id}`,
      status: a.status,
      updatedAt: a.updatedAt,
    }))

  return [...conversations, ...contacts, ...articles]
}

/**
 * Article suggestions drawn from repeated questions in resolved conversations.
 * They always land as drafts, never published (design spec section 18).
 */
export function suggestArticles() {
  const counts = new Map<string, number>()
  for (const conversation of db.conversations) {
    if (conversation.status !== 'closed') continue
    counts.set(conversation.subject, (counts.get(conversation.subject) ?? 0) + 1)
  }

  const existing = new Set(db.articles.map((a) => a.title.toLowerCase()))
  return [...counts.entries()]
    .filter(([subject, count]) => count >= 2 && !existing.has(subject.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject, count]) => ({ subject, askedCount: count }))
}

export interface AiInboxStats {
  resolved: number
  draftsSuggested: number
}

/**
 * The two figures on each inbox card's AI strip, derived from the seed rather than hardcoded so
 * they stay consistent with what the folders actually contain.
 */
export function aiStatsByInbox(): Record<string, AiInboxStats> {
  const weekAgo = Date.parse(db.conversations[0]?.updatedAt ?? '') - 7 * 24 * 60 * 60 * 1000
  const stats: Record<string, AiInboxStats> = {}

  for (const inbox of db.inboxes) {
    const mine = db.conversations.filter((c) => c.inboxId === inbox.id)
    stats[inbox.id] = {
      resolved: mine.filter((c) => c.status === 'closed' && Date.parse(c.updatedAt) >= weekAgo)
        .length,
      draftsSuggested: mine.filter((c) => c.assigneeId === null && isOpen(c)).length,
    }
  }
  return stats
}

export function messagesFor(conversationId: string): Message[] {
  return db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

/** Appends a message and moves the conversation's pointers, the way a real API would. */
export function appendMessage(message: Message): Message {
  db.messages.push(message)
  const index = db.conversations.findIndex((c) => c.id === message.conversationId)
  const existing = db.conversations[index]
  if (existing !== undefined) {
    db.conversations[index] = {
      ...existing,
      lastMessageId: message.id,
      updatedAt: message.createdAt,
      // A reply the agent just sent is not unread to them.
      unread: false,
    }
  }
  return message
}

/**
 * Edits a message in place.
 *
 * Only the housekeeping fields are writable: an edit stamps `editedAt` so the change is on the
 * record rather than silently replacing history, which is the difference between redacting a
 * password and rewriting what someone said.
 */
export function updateMessage(
  id: string,
  patch: { bodyHtml?: string; hidden?: boolean },
): Message | undefined {
  const index = db.messages.findIndex((m) => m.id === id)
  const existing = db.messages[index]
  if (existing === undefined || !('bodyHtml' in existing)) return undefined

  const updated: Message = {
    ...existing,
    ...(patch.bodyHtml === undefined
      ? {}
      : { bodyHtml: patch.bodyHtml, editedAt: new Date().toISOString() }),
    ...(patch.hidden === undefined ? {} : { hidden: patch.hidden }),
  }
  db.messages[index] = updated
  return updated
}

/** Applies a partial update and bumps `updatedAt`, the way a real API would. */
export function updateConversation(
  id: string,
  patch: Partial<Conversation>,
): Conversation | undefined {
  const index = db.conversations.findIndex((c) => c.id === id)
  const existing = db.conversations[index]
  if (existing === undefined) return undefined

  const updated: Conversation = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  db.conversations[index] = updated
  return updated
}

/**
 * Deleting is a move to the bin, not an erase.
 *
 * The conversation leaves every folder and every count immediately, which is what the agent
 * asked for, but the record survives long enough for Undo to mean something. A real backend
 * would do the same with a `deletedAt` column and a retention job.
 */
const bin = new Map<string, { conversation: Conversation; index: number }>()

export function deleteConversation(id: string): Conversation | undefined {
  const index = db.conversations.findIndex((c) => c.id === id)
  const existing = db.conversations[index]
  if (existing === undefined) return undefined

  db.conversations.splice(index, 1)
  bin.set(id, { conversation: existing, index })
  return existing
}

export function restoreConversation(id: string): Conversation | undefined {
  const held = bin.get(id)
  if (held === undefined) return undefined

  // Back where it was, so undoing a delete does not also reorder the queue.
  db.conversations.splice(Math.min(held.index, db.conversations.length), 0, held.conversation)
  bin.delete(id)
  return held.conversation
}

/* Automation ---------------------------------------------------------------------------- */

export function addWorkflow(workflow: SeedData['workflows'][number]) {
  db.workflows.push(workflow)
  return workflow
}

export function updateWorkflow(id: string, patch: Partial<SeedData['workflows'][number]>) {
  const index = db.workflows.findIndex((workflow) => workflow.id === id)
  const existing = db.workflows[index]
  if (existing === undefined) return undefined
  const updated = { ...existing, ...patch }
  db.workflows[index] = updated
  return updated
}

export function addSlaPolicy(policy: SeedData['slaPolicies'][number]) {
  db.slaPolicies.push(policy)
  return policy
}

export function updateSlaPolicy(id: string, patch: Partial<SeedData['slaPolicies'][number]>) {
  const index = db.slaPolicies.findIndex((policy) => policy.id === id)
  const existing = db.slaPolicies[index]
  if (existing === undefined) return undefined
  const updated = { ...existing, ...patch }
  db.slaPolicies[index] = updated
  return updated
}

export function updateRouting(patch: Partial<SeedData['routing']>) {
  db.routing = { ...db.routing, ...patch }
  return db.routing
}

/* Channels ------------------------------------------------------------------------------ */

export function findChannel(inboxId: string, channelId: string) {
  return db.inboxes
    .find((inbox) => inbox.id === inboxId)
    ?.channels.find((channel) => channel.id === channelId)
}

/**
 * Applies a channel change.
 *
 * Copy on write, all the way up to `db.inboxes`. `createSeedData` shallow copies the inbox list,
 * so the inbox objects and their `channels` arrays are still the ones the seed module holds:
 * writing into them in place would survive `resetDb()` and leak between tests.
 */
export function updateChannel(
  inboxId: string,
  channelId: string,
  patch: Partial<Channel>,
): Channel | undefined {
  const inboxIndex = db.inboxes.findIndex((item) => item.id === inboxId)
  const inbox = db.inboxes[inboxIndex]
  if (inbox === undefined) return undefined

  const existing = inbox.channels.find((channel) => channel.id === channelId)
  if (existing === undefined) return undefined

  const updated: Channel = { ...existing, ...patch }
  db.inboxes[inboxIndex] = {
    ...inbox,
    channels: inbox.channels.map((channel) => (channel.id === channelId ? updated : channel)),
  }
  return updated
}

/* AI agent ------------------------------------------------------------------------------ */

type AgentPatch = Partial<Omit<SeedData['aiAgent'], 'guardrails'>> & {
  guardrails?: Partial<SeedData['aiAgent']['guardrails']>
}

/** Guardrails merge field by field, so toggling one switch cannot clear the others. */
export function updateAiAgent(patch: AgentPatch): SeedData['aiAgent'] {
  db.aiAgent = {
    ...db.aiAgent,
    ...patch,
    guardrails: { ...db.aiAgent.guardrails, ...patch.guardrails },
  }
  return db.aiAgent
}

export function addAgentSource(source: SeedData['aiAgent']['sources'][number]) {
  db.aiAgent = { ...db.aiAgent, sources: [...db.aiAgent.sources, source] }
  return source
}

export function removeAgentSource(id: string): SeedData['aiAgent'] {
  db.aiAgent = {
    ...db.aiAgent,
    sources: db.aiAgent.sources.filter((source) => source.id !== id),
  }
  return db.aiAgent
}

export function resyncAgentSource(id: string) {
  const existing = db.aiAgent.sources.find((source) => source.id === id)
  if (existing === undefined) return undefined

  // A resync clears a previous failure and starts the crawl again from queued.
  const updated = {
    ...existing,
    status: 'indexed' as const,
    pages: existing.pages === 0 ? 12 : existing.pages,
    lastSyncAt: new Date().toISOString(),
  }
  db.aiAgent = {
    ...db.aiAgent,
    sources: db.aiAgent.sources.map((source) => (source.id === id ? updated : source)),
  }
  return updated
}

/* Settings ------------------------------------------------------------------------------- */

interface InboxScoped {
  inboxId: string
}

/**
 * The per-inbox settings documents, each with a typed reader and writer.
 *
 * A pair of accessors rather than a string key into `db`, because indexing a union of array
 * fields needs a cast and a cast here would hide a real mismatch between the route param and the
 * shape it writes.
 */
const INBOX_DOCS = {
  general: {
    read: () => db.inboxSettings,
    write: (next: SeedData['inboxSettings']) => {
      db.inboxSettings = next
    },
  },
  permissions: {
    read: () => db.inboxPermissions,
    write: (next: SeedData['inboxPermissions']) => {
      db.inboxPermissions = next
    },
  },
  'outgoing-email': {
    read: () => db.outgoingEmail,
    write: (next: SeedData['outgoingEmail']) => {
      db.outgoingEmail = next
    },
  },
  'auto-reply': {
    read: () => db.autoReply,
    write: (next: SeedData['autoReply']) => {
      db.autoReply = next
    },
  },
  hours: {
    read: () => db.inboxHours,
    write: (next: SeedData['inboxHours']) => {
      db.inboxHours = next
    },
  },
  satisfaction: {
    read: () => db.satisfactionSettings,
    write: (next: SeedData['satisfactionSettings']) => {
      db.satisfactionSettings = next
    },
  },
} as const

export type InboxDocKey = keyof typeof INBOX_DOCS

export function findInboxSetting(inboxId: string, doc: InboxDocKey): InboxScoped | undefined {
  return INBOX_DOCS[doc].read().find((item) => item.inboxId === inboxId)
}

/**
 * Patches one per-inbox settings document.
 *
 * Copy on write for the same reason `updateChannel` is: the seed lists are shallow copied, so
 * writing into a record in place would outlive `resetDb`.
 */
export function updateInboxSetting(
  inboxId: string,
  doc: InboxDocKey,
  patch: Record<string, unknown>,
): InboxScoped | undefined {
  const entry = INBOX_DOCS[doc]
  const list = entry.read() as InboxScoped[]
  const existing = list.find((item) => item.inboxId === inboxId)
  if (existing === undefined) return undefined

  const updated = { ...existing, ...patch, inboxId }
  entry.write(list.map((item) => (item.inboxId === inboxId ? updated : item)) as never)
  return updated
}

export function updateNotificationPrefs(patch: Partial<SeedData['notificationPrefs']>) {
  db.notificationPrefs = { ...db.notificationPrefs, ...patch }
  return db.notificationPrefs
}

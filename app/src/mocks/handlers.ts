import { HttpResponse, delay, http } from 'msw'
import { z } from 'zod'
import {
  agentStatusSchema,
  aiSettingsSchema,
  articleSchema,
  convStatusSchema,
  folderSchema,
  prioritySchema,
  slaPolicySchema,
  workflowSchema,
} from '@/types'
import { buildSummaryChunks, summaryStream } from './ai-stream'
import { draftBody, draftMeta, draftStream, evaluateDraft } from './ai-draft'
import { answerAsAgent } from './ai-agent'
import { translateBody } from './ai-translate'
import { buildPromptData, detectInjection, wrapUntrusted } from './prompt'
import {
  aiReport,
  allChannelsReport,
  companyReport,
  emailReport,
  happinessReport,
  satisfactionReport,
  type ChannelGroup,
} from './reports'
import {
  addAgentSource,
  addArticle,
  addConnectedApp,
  addSlaPolicy,
  addWorkflow,
  aiStatsByInbox,
  appendMessage,
  deleteConversation,
  findArticle,
  findConversation,
  findInboxSetting,
  inboxesWithCounts,
  getDb,
  messagesFor,
  pendingTagSuggestions,
  queryConversations,
  removeAgentSource as removeAgentSourceFromDb,
  removeConnectedApp,
  restoreConversation,
  resyncAgentSource,
  search,
  setSuggestionState,
  suggestArticles,
  updateAiAgent,
  updateAiSettings,
  updateArticle,
  updateChannel,
  updateConnectedApp,
  updateConversation,
  updateInboxSetting,
  updateMessage,
  updateNotificationPrefs,
  updateRouting,
  updateSlaPolicy,
  updateWorkflow,
  type InboxDocKey,
  type SortKey,
} from './db'

/**
 * Mock API.
 *
 * A small latency is deliberate: loading skeletons and optimistic rollbacks that are never
 * exercised are the ones that break in production. Tests set it to zero via `setMockLatency`.
 */
let latencyMs = 140

export function setMockLatency(ms: number): void {
  latencyMs = ms
}

async function pause(): Promise<void> {
  if (latencyMs > 0) await delay(latencyMs)
}

const SORT_KEYS = new Set<SortKey>(['newest', 'oldest', 'waiting', 'sla'])

function parseSort(raw: string | null): SortKey {
  return raw !== null && SORT_KEYS.has(raw as SortKey) ? (raw as SortKey) : 'waiting'
}

/** Only reply and note can be created by an agent. System and AI events are server authored. */
const newMessageSchema = z.object({
  type: z.enum(['reply', 'note']),
  bodyHtml: z.string(),
  /** Present when the reply was a forward, so the thread records where it actually went. */
  forwardedTo: z.email().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number().int().nonnegative(),
        mime: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
})

/** An agent may redact a message body or hide it. Nothing else about a message is writable. */
const messagePatchSchema = z.object({
  bodyHtml: z.string().optional(),
  hidden: z.boolean().optional(),
})

const draftOptionsSchema = z.object({
  tone: z.string(),
  length: z.string(),
  useKnowledgeBase: z.boolean(),
  includeNextSteps: z.boolean(),
})

/**
 * What a client may change about the agent.
 *
 * `stats` and `sources` are deliberately absent: the first is server computed and the second has
 * its own endpoints, so neither can be rewritten by a patch.
 */
const agentPatchSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  identity: z.string().optional(),
  status: agentStatusSchema.optional(),
  guardrails: z
    .object({
      escalateOnLowConfidence: z.boolean().optional(),
      escalateOnRepeat: z.boolean().optional(),
      avoidTopics: z.array(z.string()).optional(),
      businessHoursOnly: z.boolean().optional(),
      confidenceThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
  deployment: z.object({ channelIds: z.array(z.string()) }).optional(),
})

const conversationPatchSchema = z.object({
  status: convStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  subject: z.string().min(1).optional(),
  unread: z.boolean().optional(),
  /** Moving between inboxes. The target is checked below, so a typo cannot orphan a thread. */
  inboxId: z.string().optional(),
  followerIds: z.array(z.string()).optional(),
  /** Tag ids. Resolved against the workspace set, so an unknown id is dropped rather than
      inventing a tag the tag manager has never heard of. */
  tagIds: z.array(z.string()).optional(),
})

export const handlers = [
  http.get('/api/session', async () => {
    await pause()
    return HttpResponse.json(getDb().session)
  }),

  http.get('/api/users', async () => {
    await pause()
    return HttpResponse.json(getDb().users)
  }),

  http.get('/api/inboxes', async () => {
    await pause()
    return HttpResponse.json(inboxesWithCounts())
  }),

  http.get('/api/inboxes/:inboxId', async ({ params }) => {
    await pause()
    const inbox = inboxesWithCounts().find((i) => i.id === params['inboxId'])
    return inbox === undefined ? new HttpResponse(null, { status: 404 }) : HttpResponse.json(inbox)
  }),

  http.get('/api/tags', async () => {
    await pause()
    return HttpResponse.json(getDb().tags)
  }),

  http.get('/api/views', async () => {
    await pause()
    return HttpResponse.json(getDb().views)
  }),

  http.get('/api/conversations', async ({ request }) => {
    await pause()
    const url = new URL(request.url)
    const folderParam = url.searchParams.get('folder')
    const folder = folderSchema.safeParse(folderParam)
    const limitParam = url.searchParams.get('limit')

    return HttpResponse.json(
      queryConversations({
        ...(url.searchParams.get('inboxId') !== null
          ? { inboxId: url.searchParams.get('inboxId') as string }
          : {}),
        ...(url.searchParams.get('contactId') !== null
          ? { contactId: url.searchParams.get('contactId') as string }
          : {}),
        ...(folder.success ? { folder: folder.data } : {}),
        sort: parseSort(url.searchParams.get('sort')),
        ...(url.searchParams.get('q') !== null
          ? { search: url.searchParams.get('q') as string }
          : {}),
        ...(url.searchParams.get('cursor') !== null
          ? { cursor: url.searchParams.get('cursor') as string }
          : {}),
        ...(limitParam !== null ? { limit: Number.parseInt(limitParam, 10) } : {}),
      }),
    )
  }),

  http.get('/api/conversations/:id', async ({ params }) => {
    await pause()
    const conversation = findConversation(String(params['id']))
    return conversation === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(conversation)
  }),

  http.patch('/api/conversations/:id', async ({ params, request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = conversationPatchSchema.safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid patch' }, { status: 400 })
    }
    const { tagIds, inboxId, ...rest } = parsed.data

    // A move to an inbox that does not exist would take the conversation out of every folder
    // without putting it in another, so it is refused rather than half applied.
    if (inboxId !== undefined && !getDb().inboxes.some((inbox) => inbox.id === inboxId)) {
      return HttpResponse.json({ message: 'No such inbox' }, { status: 400 })
    }

    const updated = updateConversation(String(params['id']), {
      ...rest,
      ...(inboxId === undefined ? {} : { inboxId }),
      ...(tagIds === undefined
        ? {}
        : { tags: getDb().tags.filter((tag) => tagIds.includes(tag.id)) }),
    })
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.delete('/api/conversations/:id', async ({ params }) => {
    await pause()
    const removed = deleteConversation(String(params['id']))
    return removed === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(removed)
  }),

  /** Undo for a delete. The record is held rather than erased, so this is a real restore. */
  http.post('/api/conversations/:id/restore', async ({ params }) => {
    await pause()
    const restored = restoreConversation(String(params['id']))
    return restored === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(restored)
  }),

  http.get('/api/conversations/:id/messages', async ({ params }) => {
    await pause()
    return HttpResponse.json(messagesFor(String(params['id'])))
  }),

  http.post('/api/conversations/:id/messages', async ({ params, request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = newMessageSchema.safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid message' }, { status: 400 })
    }

    const conversationId = String(params['id'])
    const author = getDb().session.user
    const created = appendMessage({
      id: `${conversationId}-m${String(Date.now())}`,
      conversationId,
      type: parsed.data.type,
      author: { id: author.id, name: author.name, email: author.email },
      bodyHtml: parsed.data.bodyHtml,
      createdAt: new Date().toISOString(),
      ...(parsed.data.attachments === undefined ? {} : { attachments: parsed.data.attachments }),
      ...(parsed.data.forwardedTo === undefined ? {} : { forwardedTo: parsed.data.forwardedTo }),
    })

    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('/api/conversations/:id/messages/:messageId', async ({ params, request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = messagePatchSchema.safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid message patch' }, { status: 400 })
    }
    const updated = updateMessage(String(params['messageId']), parsed.data)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.get('/api/account/apps', async () => {
    await pause()
    return HttpResponse.json(getDb().connectedApps)
  }),

  http.get('/api/account/apps/:id', async ({ params }) => {
    await pause()
    const app = getDb().connectedApps.find((item) => item.id === params['id'])
    return app === undefined ? new HttpResponse(null, { status: 404 }) : HttpResponse.json(app)
  }),

  /** Only the two fields a client owns. The id and the secret are the server's to issue. */
  http.patch('/api/account/apps/:id', async ({ params, request }) => {
    await pause()
    const parsed = z
      .object({ name: z.string().min(1).optional(), redirectUrl: z.string().optional() })
      .safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid app' }, { status: 400 })

    const updated = updateConnectedApp(String(params['id']), parsed.data)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.post('/api/account/apps', async ({ request }) => {
    await pause()
    const parsed = z.object({ name: z.string().min(1) }).safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Name the app' }, { status: 400 })
    return HttpResponse.json(addConnectedApp(parsed.data.name), { status: 201 })
  }),

  http.delete('/api/account/apps/:id', async ({ params }) => {
    await pause()
    return removeConnectedApp(String(params['id']))
      ? new HttpResponse(null, { status: 204 })
      : new HttpResponse(null, { status: 404 })
  }),

  http.get('/api/contacts', async ({ request }) => {
    await pause()
    const search = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const items = getDb().contacts.filter(
      (c) => search === '' || c.name.toLowerCase().includes(search) || c.email.includes(search),
    )
    return HttpResponse.json({ items, total: items.length, nextCursor: null })
  }),

  http.get('/api/contacts/:id', async ({ params }) => {
    await pause()
    const contact = getDb().contacts.find((c) => c.id === params['id'])
    return contact === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(contact)
  }),

  http.get('/api/collections', async () => {
    await pause()
    return HttpResponse.json(getDb().collections)
  }),

  http.get('/api/categories', async () => {
    await pause()
    return HttpResponse.json(getDb().categories)
  }),

  http.get('/api/articles', async () => {
    await pause()
    return HttpResponse.json(getDb().articles)
  }),

  http.get('/api/articles/:id', async ({ params }) => {
    await pause()
    const article = findArticle(String(params['id']))
    return article === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(article)
  }),

  http.patch('/api/articles/:id', async ({ params, request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = articleSchema.partial().safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid article' }, { status: 400 })
    }
    const updated = updateArticle(String(params['id']), parsed.data)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.post('/api/articles', async ({ request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = z.object({ title: z.string(), collectionId: z.string() }).safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid article' }, { status: 400 })
    }
    const created = addArticle({
      id: `a-${String(Date.now())}`,
      collectionId: parsed.data.collectionId,
      categoryId: null,
      title: parsed.data.title,
      slug: parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      bodyHtml: '',
      // Suggestions always arrive as drafts for a human to edit.
      status: 'draft',
      updatedAt: new Date().toISOString(),
      keywords: [],
      relatedIds: [],
      seo: { titleTag: '', metaDescription: '' },
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('/api/search', async ({ request }) => {
    await pause()
    const query = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json(search(query))
  }),

  http.get('/api/ai/article-suggestions', async () => {
    await pause()
    return HttpResponse.json(suggestArticles())
  }),

  http.get('/api/saved-replies', async () => {
    await pause()
    return HttpResponse.json(getDb().savedReplies)
  }),

  http.get('/api/ai/settings', async () => {
    await pause()
    return HttpResponse.json(getDb().aiSettings)
  }),

  http.get('/api/inboxes/:inboxId/settings/:doc', async ({ params }) => {
    await pause()
    const found = findInboxSetting(String(params['inboxId']), params['doc'] as InboxDocKey)
    return found === undefined ? new HttpResponse(null, { status: 404 }) : HttpResponse.json(found)
  }),

  http.patch('/api/inboxes/:inboxId/settings/:doc', async ({ params, request }) => {
    await pause()
    const body = (await request.json()) as Record<string, unknown>
    const updated = updateInboxSetting(
      String(params['inboxId']),
      params['doc'] as InboxDocKey,
      body,
    )
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.get('/api/custom-fields', async () => {
    await pause()
    return HttpResponse.json(getDb().customFields)
  }),

  http.get('/api/teams', async () => {
    await pause()
    return HttpResponse.json(getDb().teams)
  }),

  http.get('/api/integrations', async () => {
    await pause()
    return HttpResponse.json(getDb().integrations)
  }),

  http.get('/api/notification-prefs', async () => {
    await pause()
    return HttpResponse.json(getDb().notificationPrefs)
  }),

  http.patch('/api/notification-prefs', async ({ request }) => {
    await pause()
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(updateNotificationPrefs(body))
  }),

  http.get('/api/reports/:type', async ({ params, request }) => {
    await pause()
    const url = new URL(request.url)
    const days = Number.parseInt(url.searchParams.get('days') ?? '30', 10)
    const channel = (url.searchParams.get('channel') ?? 'all') as ChannelGroup
    const safeDays = Number.isNaN(days) || days < 1 ? 30 : days

    switch (String(params['type'])) {
      case 'all-channels':
        return HttpResponse.json(allChannelsReport(safeDays, channel))
      case 'email':
        return HttpResponse.json(emailReport(safeDays))
      case 'happiness':
        return HttpResponse.json(happinessReport(safeDays))
      case 'company':
        return HttpResponse.json(companyReport(safeDays))
      case 'ai':
        return HttpResponse.json(aiReport(safeDays))
      case 'satisfaction':
        return HttpResponse.json(satisfactionReport(safeDays))
      default:
        return new HttpResponse(null, { status: 404 })
    }
  }),

  http.get('/api/ai/agent', async () => {
    await pause()
    return HttpResponse.json(getDb().aiAgent)
  }),

  http.patch('/api/ai/agent', async ({ request }) => {
    await pause()
    const parsed = agentPatchSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid agent' }, { status: 400 })
    return HttpResponse.json(updateAiAgent(parsed.data))
  }),

  http.post('/api/ai/agent/sources', async ({ request }) => {
    await pause()
    const parsed = z
      .object({
        type: z.enum(['website', 'snippet', 'docs']),
        label: z.string().min(1),
        url: z.string().optional(),
      })
      .safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid source' }, { status: 400 })

    // A new crawl starts queued. Anything else would claim pages were indexed before they were.
    const created = addAgentSource({
      id: `ks-${String(getDb().aiAgent.sources.length + 1)}`,
      type: parsed.data.type,
      label: parsed.data.label,
      ...(parsed.data.url === undefined ? {} : { url: parsed.data.url }),
      status: parsed.data.type === 'snippet' ? 'indexed' : 'queued',
      pages: parsed.data.type === 'snippet' ? 1 : 0,
      lastSyncAt: new Date().toISOString(),
      injectionDetected: false,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.delete('/api/ai/agent/sources/:id', async ({ params }) => {
    await pause()
    return HttpResponse.json(removeAgentSourceFromDb(String(params['id'])))
  }),

  http.post('/api/ai/agent/sources/:id/resync', async ({ params }) => {
    await pause()
    const updated = resyncAgentSource(String(params['id']))
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.post('/api/ai/agent/ask', async ({ request }) => {
    await pause()
    const parsed = z.object({ question: z.string().min(1) }).safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Ask something' }, { status: 400 })
    return HttpResponse.json(answerAsAgent(parsed.data.question))
  }),

  http.get('/api/ai/inbox-stats', async () => {
    await pause()
    return HttpResponse.json(aiStatsByInbox())
  }),

  http.get('/api/ai/summaries/:conversationId', async ({ params }) => {
    await pause()
    const summary = getDb().summaries.find((s) => s.conversationId === params['conversationId'])
    return summary === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(summary)
  }),

  /** Streams the summary as NDJSON patches so the panel can render it as it arrives. */
  http.post('/api/ai/summaries/:conversationId', ({ params, request }) => {
    const conversationId = String(params['conversationId'])
    const chunks = buildSummaryChunks(messagesFor(conversationId))
    return new HttpResponse(summaryStream(chunks, request.signal), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  }),

  /**
   * Translates one message for the agent reading it.
   *
   * Internal only (AI-6): the answer is never written back onto the message and never reaches a
   * customer facing surface. The body is customer authored, so it goes to the model as a labelled
   * untrusted block (AI-2) and any injection attempt inside it is reported rather than hidden.
   */
  http.post('/api/ai/messages/:messageId/translate', async ({ params, request }) => {
    await pause()
    const parsed = z.object({ targetLanguage: z.string().min(2) }).safeParse(await request.json())
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Pick a language' }, { status: 400 })
    }

    const messageId = String(params['messageId'])
    const message = getDb().messages.find((m) => m.id === messageId)
    if (message === undefined || !('bodyHtml' in message)) {
      return new HttpResponse(null, { status: 404 })
    }

    const promptData = wrapUntrusted({ label: 'message to translate', text: message.bodyHtml })

    return HttpResponse.json(
      translateBody(
        messageId,
        message.bodyHtml,
        parsed.data.targetLanguage,
        detectInjection(promptData),
      ),
    )
  }),

  http.patch('/api/ai/settings', async ({ request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = aiSettingsSchema.partial().safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid settings' }, { status: 400 })
    }
    return HttpResponse.json(updateAiSettings(parsed.data))
  }),

  http.patch('/api/ai/suggestions/:id', async ({ params, request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = z
      .object({ state: z.enum(['accepted', 'rejected', 'auto_applied']) })
      .safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid state' }, { status: 400 })
    }
    const updated = setSuggestionState(String(params['id']), parsed.data.state)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  /** Streams an AI draft. It is delivered to the composer for review and never sent. */
  http.post('/api/ai/drafts/:conversationId', async ({ params, request }) => {
    const body: unknown = await request.json()
    const parsed = draftOptionsSchema.safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid draft options' }, { status: 400 })
    }

    const conversationId = String(params['conversationId'])
    const thread = messagesFor(conversationId)

    /*
     * AI-2. The thread is customer authored, so it goes to the model as labelled data rather
     * than as part of the instruction stream. The wrapped form is what a real server would send;
     * nothing here reads it back as an instruction, which is the point.
     */
    const promptData = buildPromptData(
      thread
        .filter((message) => 'bodyHtml' in message)
        .map((message) => ({
          label: message.type === 'customer' ? 'customer message' : 'agent reply',
          text: 'bodyHtml' in message ? message.bodyHtml : '',
        })),
    )

    // Any injection attempt in that data is reported, never hidden (AI-3).
    const injectionDetected = detectInjection(promptData)

    return new HttpResponse(
      draftStream(
        draftBody(parsed.data),
        draftMeta(parsed.data, injectionDetected),
        request.signal,
      ),
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    )
  }),

  http.post('/api/ai/evaluations/check', async ({ request }) => {
    await pause()
    const body: unknown = await request.json()
    const parsed = z.object({ text: z.string() }).safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid draft' }, { status: 400 })
    }
    return HttpResponse.json(evaluateDraft(parsed.data.text))
  }),

  http.get('/api/ai/tag-review', async () => {
    await pause()
    return HttpResponse.json(pendingTagSuggestions())
  }),

  http.get('/api/evaluations', async () => {
    await pause()
    return HttpResponse.json(getDb().evaluations)
  }),

  http.get('/api/ratings', async () => {
    await pause()
    return HttpResponse.json(getDb().ratings)
  }),

  http.get('/api/automation/sla-policies', async () => {
    await pause()
    return HttpResponse.json(getDb().slaPolicies)
  }),

  http.get('/api/automation/slas', async () => {
    await pause()
    return HttpResponse.json(getDb().slaPolicies)
  }),

  http.post('/api/automation/slas', async ({ request }) => {
    await pause()
    const parsed = slaPolicySchema.omit({ id: true }).safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid policy' }, { status: 400 })
    const created = addSlaPolicy({
      ...parsed.data,
      id: `s-${String(getDb().slaPolicies.length + 1)}`,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('/api/automation/slas/:id', async ({ params, request }) => {
    await pause()
    const parsed = slaPolicySchema.partial().safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid policy' }, { status: 400 })
    const updated = updateSlaPolicy(String(params['id']), parsed.data)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.get('/api/automation/workflows', async ({ request }) => {
    await pause()
    const inboxId = new URL(request.url).searchParams.get('inboxId')
    const workflows = getDb().workflows
    return HttpResponse.json(
      inboxId === null ? workflows : workflows.filter((w) => w.inboxId === inboxId),
    )
  }),

  http.post('/api/automation/workflows', async ({ request }) => {
    await pause()
    const parsed = workflowSchema.omit({ id: true }).safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid workflow' }, { status: 400 })
    const created = addWorkflow({ ...parsed.data, id: `w-${String(getDb().workflows.length + 1)}` })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('/api/automation/workflows/:id', async ({ params, request }) => {
    await pause()
    const parsed = workflowSchema.partial().safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid workflow' }, { status: 400 })
    const updated = updateWorkflow(String(params['id']), parsed.data)
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.get('/api/automation/routing', async () => {
    await pause()
    return HttpResponse.json(getDb().routing)
  }),

  http.patch('/api/automation/routing', async ({ request }) => {
    await pause()
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(updateRouting(body as Partial<ReturnType<typeof getDb>['routing']>))
  }),

  /**
   * The OAuth exchange, condensed.
   *
   * A real implementation validates the redirect origin and the state parameter server side.
   * The mock keeps the shape so the client never learns a habit it would have to unlearn: the
   * scopes it stores are the ones the modal disclosed, not whatever came back.
   */
  http.post('/api/inboxes/:inboxId/channels/:channelId/connect', async ({ params, request }) => {
    await pause()
    const parsed = z
      .object({ account: z.string().min(1), scopes: z.array(z.string()) })
      .safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: 'Invalid request' }, { status: 400 })

    const updated = updateChannel(String(params['inboxId']), String(params['channelId']), {
      status: 'connected',
      account: parsed.data.account,
      scopes: parsed.data.scopes,
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    })
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.post('/api/inboxes/:inboxId/channels/:channelId/disconnect', async ({ params }) => {
    await pause()
    const updated = updateChannel(String(params['inboxId']), String(params['channelId']), {
      status: 'disconnected',
      scopes: [],
    })
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  http.post('/api/inboxes/:inboxId/channels/:channelId/sync', async ({ params }) => {
    await pause()
    const updated = updateChannel(String(params['inboxId']), String(params['channelId']), {
      lastSyncAt: new Date().toISOString(),
    })
    return updated === undefined
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json(updated)
  }),

  /**
   * Deliberately wrong shape. Nothing in the app calls it; it exists so the zod boundary in
   * api-client can be proven to reject bad data rather than assumed to. See the test in
   * src/lib/api-client.test.ts.
   */
  http.get('/api/dev/malformed-conversations', async () => {
    await pause()
    return HttpResponse.json({ items: [{ id: 42, subject: null }], total: 'many' })
  }),
]

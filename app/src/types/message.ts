import { z } from 'zod'
import { confidenceSchema, idSchema, isoDateSchema } from './common'

/**
 * A message is a discriminated union on `type`, not one shape with optional flags.
 *
 * The design spec models it with optional `systemEvent` / `aiEvent` / `aiAssisted` fields, but
 * the engineering standard requires discriminated unions for variant state, and here it earns
 * its keep twice over: the five variants map exactly onto the five provenance rail treatments,
 * and the compiler refuses to let a renderer forget one. Confusing a note with a reply is the
 * product's worst failure mode, so exhaustiveness is a safety property, not a style preference.
 */

export const attachmentSchema = z.object({
  id: idSchema,
  name: z.string(),
  size: z.number().int().nonnegative(),
  mime: z.string(),
  url: z.string(),
})
export type Attachment = z.infer<typeof attachmentSchema>

export const messageAuthorSchema = z.object({
  id: idSchema,
  name: z.string(),
  avatarUrl: z.url().optional(),
  email: z.email().optional(),
})
export type MessageAuthor = z.infer<typeof messageAuthorSchema>

const baseFields = {
  id: idSchema,
  conversationId: idSchema,
  author: messageAuthorSchema,
  createdAt: isoDateSchema,
}

/**
 * What an authored message carries beyond its body, all of it optional and all of it about
 * housekeeping rather than content.
 *
 * `hidden` and `editedAt` exist for the same reason: a customer pastes a password or a card number
 * into a support thread often enough that redacting it has to be a first class action, and an edit
 * that leaves no trace is worse than no edit at all. `language` drives whether translating is worth
 * offering, and `rawSource` is the original transport form, kept so "Show original" has something
 * truthful to show.
 */
const authoredFields = {
  hidden: z.boolean().optional(),
  editedAt: isoDateSchema.optional(),
  language: z.string().optional(),
  rawSource: z.string().optional(),
}

/** Recorded on a sent reply so reporting can measure how much of a draft survived. */
export const aiAssistedSchema = z.object({
  model: z.string(),
  tone: z.string(),
  /** 0 means sent verbatim, 1 means fully rewritten. Drives the Auto Draft acceptance metric. */
  editedRatio: z.number().min(0).max(1),
  sourceIds: z.array(idSchema),
})
export type AiAssisted = z.infer<typeof aiAssistedSchema>

/** Inbound from the customer. Body is untrusted HTML and renders only in the sandboxed iframe. */
export const customerMessageSchema = z.object({
  ...baseFields,
  ...authoredFields,
  type: z.literal('customer'),
  bodyHtml: z.string(),
  visibility: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
})

/** Outbound to the customer. */
export const replyMessageSchema = z.object({
  ...baseFields,
  ...authoredFields,
  type: z.literal('reply'),
  bodyHtml: z.string(),
  visibility: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  aiAssisted: aiAssistedSchema.optional(),
  /**
   * Set when this reply was a forward.
   *
   * A forward leaves the thread for somebody who is not the customer, so the address it went to
   * has to be on the record. Without it the thread reads as though the customer was told
   * something they never saw.
   */
  forwardedTo: z.email().optional(),
})

/** Internal only. Amber rail and fill, never visible to the customer. */
export const noteMessageSchema = z.object({
  ...baseFields,
  ...authoredFields,
  type: z.literal('note'),
  bodyHtml: z.string(),
  attachments: z.array(attachmentSchema).optional(),
})

/** No rail. Renders as a compact centered line. */
export const systemMessageSchema = z.object({
  ...baseFields,
  type: z.literal('system'),
  systemEvent: z.object({
    kind: z.enum(['assigned', 'status', 'workflow', 'snoozed', 'tag', 'priority', 'merged']),
    detail: z.string(),
  }),
})

/** No rail, but violet text with a sparkle. Carries the undo window for an applied AI action. */
export const aiEventMessageSchema = z.object({
  ...baseFields,
  type: z.literal('ai_event'),
  aiEvent: z.object({
    kind: z.enum(['auto_assign', 'auto_tag', 'summary', 'agent_reply', 'escalation']),
    detail: z.string(),
    confidence: confidenceSchema,
    undoableUntil: isoDateSchema.optional(),
  }),
})

export const messageSchema = z.discriminatedUnion('type', [
  customerMessageSchema,
  replyMessageSchema,
  noteMessageSchema,
  systemMessageSchema,
  aiEventMessageSchema,
])
export type Message = z.infer<typeof messageSchema>

export type CustomerMessage = z.infer<typeof customerMessageSchema>
export type ReplyMessage = z.infer<typeof replyMessageSchema>
export type NoteMessage = z.infer<typeof noteMessageSchema>
export type SystemMessage = z.infer<typeof systemMessageSchema>
export type AiEventMessage = z.infer<typeof aiEventMessageSchema>

/** Messages that carry an author written body, as opposed to an event line. */
export type AuthoredMessage = CustomerMessage | ReplyMessage | NoteMessage

export function isAuthoredMessage(message: Message): message is AuthoredMessage {
  return message.type === 'customer' || message.type === 'reply' || message.type === 'note'
}

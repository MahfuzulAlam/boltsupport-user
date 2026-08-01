import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'
import { channelTypeSchema, convStatusSchema, prioritySchema } from './enums'
import { contactRefSchema } from './contact'
import { tagSchema } from './tag'
import { aiSuggestionSchema, predictedSatisfactionSchema } from './ai'

/** Live SLA state on a conversation. The countdown ticks client side off these deadlines. */
export const slaStateSchema = z.object({
  policyId: idSchema,
  firstResponseDueAt: isoDateSchema.nullable(),
  resolutionDueAt: isoDateSchema.nullable(),
  /** Paused while awaiting the customer, if the policy allows it (FR-5.4). */
  paused: z.boolean(),
  breached: z.boolean(),
})
export type SlaState = z.infer<typeof slaStateSchema>

/** Collision detection. Viewing shows a yellow ring, replying escalates to red (FR-2.1, FR-2.2). */
export const presenceSchema = z.object({
  userId: idSchema,
  state: z.enum(['viewing', 'replying']),
})
export type Presence = z.infer<typeof presenceSchema>

export const conversationSchema = z.object({
  id: idSchema,
  /** The human facing ticket number, always rendered in mono. */
  number: z.number().int().positive(),
  inboxId: idSchema,
  subject: z.string(),
  preview: z.string(),
  contact: contactRefSchema,
  status: convStatusSchema,
  assigneeId: idSchema.nullable(),
  tags: z.array(tagSchema),
  /** SLA targets and AI priority suggestions both key off this. Defaults to normal (FR-1.3). */
  priority: prioritySchema,
  channel: channelTypeSchema,
  unread: z.boolean(),
  waitingSince: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  /** Compared against AiSummary.sourceLastMessageId to derive staleness without polling. */
  lastMessageId: idSchema,
  /**
   * Who gets told when this moves, whether or not it is assigned to them.
   *
   * Separate from `assigneeId` on purpose: the person who owns a conversation and the people
   * who need to watch it are rarely the same set, and a lead who follows a thread should not
   * have to take it away from the agent handling it to keep an eye on it.
   */
  followerIds: z.array(idSchema).optional(),
  sla: slaStateSchema.optional(),
  presence: z.array(presenceSchema).optional(),
  ai: z
    .object({
      summaryId: idSchema.optional(),
      predictedSatisfaction: predictedSatisfactionSchema.optional(),
      suggestions: z.array(aiSuggestionSchema),
    })
    .optional(),
})
export type Conversation = z.infer<typeof conversationSchema>

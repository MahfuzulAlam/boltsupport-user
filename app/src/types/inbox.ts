import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'
import { channelStatusSchema, channelTypeSchema } from './enums'

export const channelSchema = z.object({
  id: idSchema,
  inboxId: idSchema,
  type: channelTypeSchema,
  status: channelStatusSchema,
  /** The connected account identifier, for example an address or a phone number. */
  account: z.string().optional(),
  connectedAt: isoDateSchema.optional(),
  /** Disclosed to the operator before the OAuth redirect, never after (FR-6.2). */
  scopes: z.array(z.string()),
  lastSyncAt: isoDateSchema.optional(),
})
export type Channel = z.infer<typeof channelSchema>

/** Folder counts are computed server side; the client only displays them. */
export const inboxCountsSchema = z.object({
  chat: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  mine: z.number().int().nonnegative(),
  assigned: z.number().int().nonnegative(),
  drafts: z.number().int().nonnegative(),
  needsAttention: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
  spam: z.number().int().nonnegative(),
})
export type InboxCounts = z.infer<typeof inboxCountsSchema>

export const inboxSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  email: z.email(),
  channels: z.array(channelSchema),
  counts: inboxCountsSchema,
})
export type Inbox = z.infer<typeof inboxSchema>

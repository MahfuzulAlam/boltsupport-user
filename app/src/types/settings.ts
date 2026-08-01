import { z } from 'zod'
import { idSchema } from './common'

/**
 * Per-inbox configuration.
 *
 * Split from `Inbox` because it is read on exactly one screen each and would otherwise ride
 * along on every conversation list request.
 */

export const inboxSettingsSchema = z.object({
  inboxId: idSchema,
  name: z.string().min(1),
  fromName: z.string().min(1),
  defaultStatus: z.enum(['active', 'pending']),
  defaultAssigneeId: idSchema.nullable(),
})
export type InboxSettings = z.infer<typeof inboxSettingsSchema>

/** Which teammates can open this inbox. Everyone else does not see it at all. */
export const inboxPermissionsSchema = z.object({
  inboxId: idSchema,
  userIds: z.array(idSchema),
})
export type InboxPermissions = z.infer<typeof inboxPermissionsSchema>

export const dnsRecordSchema = z.object({
  host: z.string(),
  type: z.enum(['TXT', 'CNAME', 'MX']),
  value: z.string(),
})
export type DnsRecord = z.infer<typeof dnsRecordSchema>

export const outgoingEmailSchema = z.object({
  inboxId: idSchema,
  mode: z.enum(['boltsupport', 'smtp']),
  smtpHost: z.string(),
  smtpPort: z.number().int().positive(),
  smtpUser: z.string(),
  /** DKIM signs what you send; DMARC tells receivers what to do when a signature fails. */
  dkim: z.object({ active: z.boolean(), current: z.string(), recommended: dnsRecordSchema }),
  dmarc: z.object({ active: z.boolean(), current: z.string(), recommended: dnsRecordSchema }),
})
export type OutgoingEmail = z.infer<typeof outgoingEmailSchema>

export const autoReplySchema = z.object({
  inboxId: idSchema,
  enabled: z.boolean(),
  /** The common case: an out of hours acknowledgement, not a reply to everything. */
  outsideHoursOnly: z.boolean(),
  subject: z.string(),
  bodyHtml: z.string(),
})
export type AutoReply = z.infer<typeof autoReplySchema>

export const officeDaySchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  open: z.boolean(),
  /** Minutes from midnight, so a range is two numbers rather than two parsed strings. */
  from: z.number().int().min(0).max(1439),
  to: z.number().int().min(0).max(1439),
})
export type OfficeDay = z.infer<typeof officeDaySchema>

export const inboxHoursSchema = z.object({
  inboxId: idSchema,
  timezone: z.string(),
  days: z.array(officeDaySchema),
})
export type InboxHours = z.infer<typeof inboxHoursSchema>

export const customFieldSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'dropdown', 'date', 'checkbox']),
  appliesTo: z.enum(['conversation', 'contact']),
  options: z.array(z.string()),
  required: z.boolean(),
})
export type CustomField = z.infer<typeof customFieldSchema>

export const satisfactionSettingsSchema = z.object({
  inboxId: idSchema,
  enabled: z.boolean(),
  /** Asking on every closed conversation is how a survey trains people to ignore it. */
  askAfter: z.enum(['every', 'first-close', 'weekly']),
  question: z.string(),
  followUpQuestion: z.string(),
})
export type SatisfactionSettings = z.infer<typeof satisfactionSettingsSchema>

export const teamSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  memberIds: z.array(idSchema),
})
export type Team = z.infer<typeof teamSchema>

export const integrationSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string(),
  connected: z.boolean(),
  category: z.enum(['crm', 'engineering', 'billing', 'chat']),
})
export type Integration = z.infer<typeof integrationSchema>

export const notificationPrefsSchema = z.object({
  /** Per event: browser, email, or neither. */
  events: z.record(z.string(), z.object({ browser: z.boolean(), email: z.boolean() })),
  digest: z.enum(['off', 'daily', 'weekly']),
})
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

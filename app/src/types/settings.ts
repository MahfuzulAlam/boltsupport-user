import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

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

/**
 * Where a notification can land.
 *
 * Three independent channels rather than one preference, because they answer different
 * questions: email is for when you are not here, browser for when you are, and mobile for the
 * things worth interrupting a walk for.
 */
export const notificationChannelsSchema = z.object({
  email: z.boolean(),
  mobile: z.boolean(),
  browser: z.boolean(),
})
export type NotificationChannels = z.infer<typeof notificationChannelsSchema>

export const notificationPrefsSchema = z.object({
  /**
   * Default applies one set of choices to every inbox. Custom is per inbox, which only earns its
   * complexity for someone who genuinely works two very different queues.
   */
  method: z.enum(['default', 'custom']).default('default'),
  /** Keyed by event id, so a renamed label never orphans somebody's saved choice. */
  events: z.record(z.string(), notificationChannelsSchema),
  digest: z.enum(['off', 'daily', 'weekly']),
})
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

/**
 * An OAuth app somebody on the team registered against the API.
 *
 * The secret lives on the record because the person who created the app is the only one who can
 * see it, and they need it once to configure their integration. It is never rendered by default,
 * only on request: a credential sitting in plain sight on a settings page is one screen share
 * away from being everybody's.
 */
export const connectedAppSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** The public identifier, safe to show and copy. */
  appId: z.string(),
  secret: z.string(),
  redirectUrl: z.string(),
  createdAt: isoDateSchema,
})
export type ConnectedApp = z.infer<typeof connectedAppSchema>

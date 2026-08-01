import { z } from 'zod'
import {
  autoReplySchema,
  customFieldSchema,
  inboxHoursSchema,
  inboxPermissionsSchema,
  inboxSettingsSchema,
  integrationSchema,
  notificationPrefsSchema,
  outgoingEmailSchema,
  satisfactionSettingsSchema,
  savedReplySchema,
  tagSchema,
  teamSchema,
  userSchema,
} from '@/types'
import { apiRequest } from '@/lib/api-client'

/**
 * The per-inbox settings documents.
 *
 * One shape for all of them: GET by inbox, PATCH a partial. Each screen then only decides what
 * it renders, not how it loads or saves.
 */
const INBOX_DOCS = {
  general: inboxSettingsSchema,
  permissions: inboxPermissionsSchema,
  'outgoing-email': outgoingEmailSchema,
  'auto-reply': autoReplySchema,
  hours: inboxHoursSchema,
  satisfaction: satisfactionSettingsSchema,
} as const

export type InboxDoc = keyof typeof INBOX_DOCS

export function fetchInboxSetting<T extends InboxDoc>(
  inboxId: string,
  doc: T,
  signal?: AbortSignal,
): Promise<z.infer<(typeof INBOX_DOCS)[T]>> {
  return apiRequest(`/inboxes/${inboxId}/settings/${doc}`, INBOX_DOCS[doc], {
    ...(signal ? { signal } : {}),
  }) as Promise<z.infer<(typeof INBOX_DOCS)[T]>>
}

export function patchInboxSetting<T extends InboxDoc>(
  inboxId: string,
  doc: T,
  patch: Partial<z.infer<(typeof INBOX_DOCS)[T]>>,
): Promise<z.infer<(typeof INBOX_DOCS)[T]>> {
  return apiRequest(`/inboxes/${inboxId}/settings/${doc}`, INBOX_DOCS[doc], {
    method: 'PATCH',
    body: patch,
  }) as Promise<z.infer<(typeof INBOX_DOCS)[T]>>
}

/* Workspace level ------------------------------------------------------------------------- */

export function fetchCustomFields(signal?: AbortSignal) {
  return apiRequest('/custom-fields', z.array(customFieldSchema), { ...(signal ? { signal } : {}) })
}

export function fetchTeams(signal?: AbortSignal) {
  return apiRequest('/teams', z.array(teamSchema), { ...(signal ? { signal } : {}) })
}

export function fetchIntegrations(signal?: AbortSignal) {
  return apiRequest('/integrations', z.array(integrationSchema), { ...(signal ? { signal } : {}) })
}

export function fetchNotificationPrefs(signal?: AbortSignal) {
  return apiRequest('/notification-prefs', notificationPrefsSchema, {
    ...(signal ? { signal } : {}),
  })
}

export function patchNotificationPrefs(patch: Partial<z.infer<typeof notificationPrefsSchema>>) {
  return apiRequest('/notification-prefs', notificationPrefsSchema, {
    method: 'PATCH',
    body: patch,
  })
}

export function fetchUsers(signal?: AbortSignal) {
  return apiRequest('/users', z.array(userSchema), { ...(signal ? { signal } : {}) })
}

export function fetchTags(signal?: AbortSignal) {
  return apiRequest('/tags', z.array(tagSchema), { ...(signal ? { signal } : {}) })
}

export function fetchSavedReplies(signal?: AbortSignal) {
  return apiRequest('/saved-replies', z.array(savedReplySchema), { ...(signal ? { signal } : {}) })
}
